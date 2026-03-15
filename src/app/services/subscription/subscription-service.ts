import {
  HttpClient,
  HttpErrorResponse,
  HttpEvent,
  HttpEventType,
  HttpRequest,
} from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, filter, lastValueFrom, map, Observable, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { STORAGE_KEYS } from '../../constants/storage-keys';
import { FormStorageService } from '../form-storage/form-storage-service';

// ── Response shapes ───────────────────────────────────────────────────────────

export interface SubscriptionResponse {
  message: string;
  data: {
    id: number;
    type: FormType;
    status: SubscriptionStatus;
    created_at: string;
  };
}

export interface ValidationErrorResponse {
  message: string;
  errors: Record<string, string[]>;
}

/** Emitted continuously by submitWithProgress(). */
export interface UploadProgress {
  /** 0–100. null while the response is being parsed after upload completes. */
  percent: number | null;
  done: boolean;
  response?: SubscriptionResponse;
}

// ── Domain types ──────────────────────────────────────────────────────────────

export type FormType = 'participant' | 'speaker' | 'collaborator';
export type SubscriptionStatus = 'pending' | 'approved' | 'rejected';

// ── Endpoint map ──────────────────────────────────────────────────────────────

/**
 * Maps each form type to the corresponding backend endpoint.
 * This allows the same service to submit multiple subscription types.
 */
const ENDPOINTS: Record<FormType, string> = {
  participant: '/subscriptions/participants',
  speaker: '/subscriptions/speakers',
  collaborator: '/subscriptions/collaborators',
};

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable({
  providedIn: 'root',
})
export class SubscriptionService {
  /** Angular HTTP client used to communicate with the backend API. */
  private readonly http = inject(HttpClient);

  /** Service responsible for persisting and clearing form draft data. */
  private readonly formStorage = inject(FormStorageService);

  /** Base API URL defined in the Angular environment configuration. */
  private readonly baseUrl = environment.apiUrl;

  // ── 1. submit() ─────────────────────────────────────────────────────────────
  /**
   * Fire-and-forget POST.
   *
   * Sends a subscription payload to the backend API and resolves with the
   * server response.
   *
   * Behaviour
   * ─────────
   * • Normalises frontend field names to backend field names.
   * • Automatically injects `edition_id` from localStorage.
   * • Detects whether the payload contains File objects.
   * • Uses JSON when no files exist.
   * • Uses multipart/form-data when files are present.
   * • Clears persisted form data after a successful submission.
   *
   * This method returns a Promise because most callers simply need the
   * final response and do not require streaming progress updates.
   */
  async submit(type: FormType, payload: Record<string, unknown>): Promise<SubscriptionResponse> {
    const url = this.url(type);

    // First convert the frontend payload to the backend contract
    const normalizedPayload = this.normalizePayloadByType(type, payload);

    // Then inject edition_id from localStorage
    const finalPayload = this.withEdition(normalizedPayload);

    // Decide which encoding to use depending on whether the payload contains files
    const request$ = this.hasFiles(finalPayload)
      ? this.postMultipart(url, finalPayload)
      : this.postJson(url, finalPayload);

    const response = await lastValueFrom(request$.pipe(catchError(this.handleError)));
    await this.formStorage.clearAll();

    return response;
  }

  // ── 2. submitWithProgress() ─────────────────────────────────────────────────
  /**
   * Upload-aware POST.
   *
   * Returns an Observable stream emitting UploadProgress objects so
   * callers can drive a progress bar during file uploads.
   *
   * Important notes
   * ───────────────
   * Browsers only emit upload progress events for FormData requests.
   * Therefore this method always uses multipart/form-data even if the
   * payload does not contain files.
   *
   * The current edition_id is automatically injected from localStorage
   * after the payload is normalized to the backend contract.
   *
   * Persisted form data is cleared when the final response event is received.
   */
  submitWithProgress(type: FormType, payload: Record<string, unknown>): Observable<UploadProgress> {
    const url = this.url(type);

    // First convert the frontend payload to the backend contract
    const normalizedPayload = this.normalizePayloadByType(type, payload);

    // Then inject edition_id from localStorage
    const finalPayload = this.withEdition(normalizedPayload);

    // Create a low-level HttpRequest so Angular exposes upload progress events
    const req = new HttpRequest<FormData>('POST', url, this.toFormData(finalPayload), {
      reportProgress: true,
    });

    return this.http.request<SubscriptionResponse>(req).pipe(
      catchError(this.handleError),
      filter((event): event is HttpEvent<SubscriptionResponse> => true),
      map((event): UploadProgress => {
        switch (event.type) {
          case HttpEventType.UploadProgress: {
            const percent = event.total ? Math.round((100 * event.loaded) / event.total) : null;
            return { percent, done: false };
          }
          case HttpEventType.Response:
            void this.formStorage.clearAll();
            return { percent: 100, done: true, response: event.body ?? undefined };
          default:
            return { percent: null, done: false };
        }
      }),
    );
  }

  // ── 3. submitDry() ──────────────────────────────────────────────────────────
  /**
   * Development / debug helper — NO network request is made.
   *
   * This method simulates the submission process without contacting the API.
   * It serialises the payload exactly like the real submission methods,
   * logs detailed request information to the console, and returns a
   * mock response after a configurable delay.
   *
   * Useful when:
   * • debugging payload structures
   * • testing UI behaviour
   * • verifying file uploads before backend integration
   *
   * ⚠ Remove or disable calls to this method in production builds.
   */
  async submitDry(
    type: FormType,
    payload: Record<string, unknown>,
    delayMs = 1200,
  ): Promise<SubscriptionResponse> {
    const url = this.url(type);

    // Ensure the debug payload matches real behaviour
    const normalizedPayload = this.normalizePayloadByType(type, payload);
    const finalPayload = this.withEdition(normalizedPayload);

    const usesMultipart = this.hasFiles(finalPayload);
    const body = usesMultipart ? this.toFormData(finalPayload) : finalPayload;

    console.groupCollapsed(`[SubscriptionService.submitDry] ${type.toUpperCase()} → ${url}`);
    console.log('Content-Type:', usesMultipart ? 'multipart/form-data' : 'application/json');
    console.log('Raw payload:', payload);
    console.log('Normalized payload:', normalizedPayload);
    console.log('Final payload:', finalPayload);

    if (usesMultipart && body instanceof FormData) {
      const entries: Record<string, unknown> = {};
      body.forEach((v, k) => {
        entries[k] = v instanceof File ? `File(${v.name}, ${v.size}B, ${v.type})` : v;
      });
      console.log('FormData entries:', entries);
    } else {
      console.log('JSON body:', JSON.stringify(body, null, 2));
    }

    console.groupEnd();

    await new Promise((r) => setTimeout(r, delayMs));
    await this.formStorage.clearAll();

    return {
      message: '[DRY RUN] Submission simulated successfully.',
      data: {
        id: 0,
        type,
        status: 'pending',
        created_at: new Date().toISOString(),
      },
    };
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  /**
   * Builds the full backend URL for the given subscription type.
   */
  private url(type: FormType): string {
    return `${this.baseUrl}${ENDPOINTS[type]}`;
  }

  /**
   * Routes the payload through the correct mapper according to the
   * subscription type.
   *
   * This keeps the external API of the service simple: the component can
   * pass its frontend form model, and the service adapts it to Laravel.
   */
  private normalizePayloadByType(
    type: FormType,
    payload: Record<string, unknown>,
  ): Record<string, unknown> {
    switch (type) {
      case 'participant':
        return this.mapParticipantPayload(payload);

      case 'collaborator':
        return this.mapCollaboratorPayload(payload);

      case 'speaker':
        return this.mapSpeakerPayload(payload);

      default:
        return payload;
    }
  }

  /**
   * Maps the shared frontend people fields to the backend field names
   * expected by PeopleRequest.
   *
   * Backend fields covered here:
   * - name
   * - email
   * - federal_code
   * - phone
   * - photo
   * - bio
   * - site
   * - use_free
   * - distro_id
   * - student_info_id
   * - student_place
   * - student_course
   * - address_state
   *
   * This base mapper is reused by participant, collaborator and speaker.
   */
  private mapPeoplePayload(payload: Record<string, unknown>): Record<string, unknown> {
    return {
      name: payload['name'] ?? null,
      email: payload['email'] ?? null,
      federal_code: payload['federalCode'] ?? payload['federal_code'] ?? null,
      phone: payload['phone'] ?? null,

      // Optional profile fields
      photo: payload['photo'] ?? null,
      bio: payload['bio'] ?? null,
      site: payload['site'] ?? null,
      use_free: this.toNullableBoolean(payload['usesFreeSoftware'] ?? payload['use_free'] ?? null),

      // Optional academic / location fields
      distro_id: this.toNullableNumber(payload['distro'] ?? payload['distro_id'] ?? null),
      student_info_id: this.toNullableNumber(
        payload['isStudent'] ?? payload['student_info_id'] ?? null,
      ),
      student_place: payload['institution'] ?? payload['student_place'] ?? null,
      student_course: payload['course'] ?? payload['student_course'] ?? null,
      address_state: payload['state'] ?? payload['address_state'] ?? null,
    };
  }

  /**
   * Maps the participant form payload to the backend contract.
   *
   * Participant currently only adds edition_id on top of the shared
   * PeopleRequest fields, so this mapper simply reuses the people mapper.
   */
  private mapParticipantPayload(payload: Record<string, unknown>): Record<string, unknown> {
    return {
      ...this.mapPeoplePayload(payload),
    };
  }

  /**
   * Maps the collaborator form payload to the backend contract.
   *
   * Extra collaborator fields expected by Laravel:
   * - areas: number[]
   * - availabilities: number[]
   *
   * Frontend aliases accepted here:
   * - collaborationAreas -> areas
   * - areas -> areas
   * - availabilityShifts -> availabilities
   * - availabilities -> availabilities
   */
  private mapCollaboratorPayload(payload: Record<string, unknown>): Record<string, unknown> {
    return {
      ...this.mapPeoplePayload(payload),
      areas: this.toNumberArray(
        payload['areas'] ?? payload['collaborationAreas'] ?? payload['collaboration_areas'] ?? [],
      ),
      availabilities: this.toNumberArray(
        payload['availabilities'] ??
          payload['availabilityShifts'] ??
          payload['collaboratorShifts'] ??
          payload['shifts'] ??
          [],
      ),
    };
  }

  /**
   * Maps the speaker form payload to the backend contract.
   *
   * The frontend payload has a nested structure supporting multiple speakers
   * and multiple talks:
   *
   *   { speakers: [ { name, federalCode, email, phone, minicurriculo, site, photo } ],
   *     talks:    [ { titulo, descricao, turno, tipo, tema, slideFile, slideUrl } ] }
   *
   * This mapper preserves both arrays in full and renames fields to the
   * backend convention. Laravel receives them as:
   *   speakers[0][name], speakers[0][photo], …, speakers[N][…]
   *   talks[0][title],   talks[0][slide_file], …, talks[M][…]
   *
   * Field name conversions:
   *   federalCode   → federal_code
   *   minicurriculo → bio
   *   titulo        → title
   *   descricao     → description
   *   turno         → shift
   *   tipo          → kind
   *   tema (slug)   → talk_subject_id  (nullable FK)
   *   slideFile     → slide_file
   *   slideUrl      → slide_url
   */
  private mapSpeakerPayload(payload: Record<string, unknown>): Record<string, unknown> {
    const speakers = (payload['speakers'] as Array<Record<string, unknown>>) ?? [];
    const talks = (payload['talks'] as Array<Record<string, unknown>>) ?? [];

    return {
      speakers: speakers.map((s) => ({
        name: s['name'] ?? null,
        email: s['email'] ?? null,
        federal_code: s['federalCode'] ?? null,
        phone: s['phone'] ?? null,
        photo: s['photo'] ?? null,
        bio: s['minicurriculo'] ?? null,
        site: s['site'] ?? null,
      })),
      talks: talks.map((t) => ({
        title: t['titulo'] ?? null,
        description: t['descricao'] ?? null,
        shift: t['turno'] ?? null,
        kind: t['tipo'] ?? null,
        // tema is a frontend slug; talk_subject_id is a nullable FK — send null
        // until a /talk-subjects endpoint is integrated and IDs are stored in the form
        talk_subject_id: t['tema'] ?? null,
        slide_file: t['slideFile'] ?? null,
        slide_url: t['slideUrl'] ?? null,
      })),
    };
  }

  // /**
  //  * Converts the frontend turno option value to the backend shift code.
  //  *
  //  * Frontend TURNOS values → Laravel shift enum:
  //  *   'manha' → 'M'
  //  *   'tarde' → 'T'
  //  *   'M'/'T' pass through (future-proofing if values are updated in form-options)
  //  */
  // private mapTurno(turno: string): string | null {
  //   const map: Record<string, string> = { manha: 'M', tarde: 'T', M: 'M', T: 'T' };
  //   return map[turno] ?? null;
  // }
  //
  // /**
  //  * Converts the frontend tipo option value to the backend kind code.
  //  *
  //  * Frontend TIPOS values → Laravel kind enum:
  //  *   'palestra' → 'P'
  //  *   'oficina'  → 'O'
  //  *   'P'/'O' pass through (future-proofing)
  //  */
  // private mapTipo(tipo: string): string | null {
  //   const map: Record<string, string> = { palestra: 'P', oficina: 'O', P: 'P', O: 'O' };
  //   return map[tipo] ?? null;
  // }

  /**
   * Retrieves the current edition identifier from localStorage.
   *
   * Expected storage format:
   *   localStorage[STORAGE_KEYS.EDITION] = JSON.stringify({ id: number, ... })
   *
   * Returns:
   *   number → valid edition id
   *   null   → if the value is missing or malformed
   */
  private getEditionId(): number | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.EDITION);
      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw) as { id?: unknown } | null;
      const id = parsed?.id;

      return typeof id === 'number' ? id : null;
    } catch {
      return null;
    }
  }

  /**
   * Returns a new payload enriched with `edition_id`.
   *
   * The original payload object is never mutated.
   *
   * If the caller already provided edition_id, the value from localStorage
   * still wins so the current selected edition remains authoritative.
   */
  private withEdition(payload: Record<string, unknown>): Record<string, unknown> {
    return {
      ...payload,
      edition_id: this.getEditionId(),
    };
  }

  /**
   * Converts form-like values into boolean or null.
   *
   * Accepted truthy values:
   * - true
   * - 1
   * - '1'
   * - 'true'
   * - 'yes'
   * - 'on'
   *
   * Accepted falsy values:
   * - false
   * - 0
   * - '0'
   * - 'false'
   * - 'no'
   * - 'off'
   */
  private toNullableBoolean(value: unknown): boolean | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    if (
      value === true ||
      value === 1 ||
      value === '1' ||
      value === 'true' ||
      value === 'yes' ||
      value === 'on'
    ) {
      return true;
    }

    if (
      value === false ||
      value === 0 ||
      value === '0' ||
      value === 'false' ||
      value === 'no' ||
      value === 'off'
    ) {
      return false;
    }

    return null;
  }

  /**
   * Converts a value into number when possible.
   * Returns null for empty or invalid values.
   */
  private toNullableNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  /**
   * Converts the provided value into an array of valid numbers.
   *
   * Invalid, empty or non-numeric items are discarded.
   */
  private toNumberArray(value: unknown): number[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((item) => this.toNullableNumber(item))
      .filter((item): item is number => item !== null);
  }

  /**
   * Determines whether the payload contains any File objects at any depth.
   *
   * Used to decide whether the request should be encoded as
   * JSON or multipart/form-data.
   *
   * Recursively scans nested objects and arrays so that File instances
   * inside speakers[*].photo or talks[*].slide_file are correctly detected.
   */
  private hasFiles(payload: Record<string, unknown>): boolean {
    const scan = (value: unknown): boolean => {
      if (value instanceof File) return true;
      if (Array.isArray(value)) return value.some(scan);
      if (value !== null && typeof value === 'object') {
        return Object.values(value as Record<string, unknown>).some(scan);
      }
      return false;
    };
    return scan(payload);
  }

  /**
   * Sends a JSON POST request.
   */
  private postJson(
    url: string,
    payload: Record<string, unknown>,
  ): Observable<SubscriptionResponse> {
    return this.http.post<SubscriptionResponse>(url, payload);
  }

  /**
   * Sends a multipart/form-data POST request.
   */
  private postMultipart(
    url: string,
    payload: Record<string, unknown>,
  ): Observable<SubscriptionResponse> {
    return this.http.post<SubscriptionResponse>(url, this.toFormData(payload));
  }

  /**
   * Recursively serialises a payload into FormData.
   *
   * Value rules
   * ───────────
   * File             → binary blob with original filename
   * boolean          → '1' / '0'  (PHP/Laravel truthy convention)
   * null | undefined → ''         (Laravel reads as null via ->nullable())
   * Array            → key[]      (Laravel array convention)
   * Plain object     → key[sub]   (bracket-notation recursion)
   * Everything else  → String()
   */
  private toFormData(
    payload: Record<string, unknown>,
    form = new FormData(),
    prefix = '',
  ): FormData {
    for (const [key, value] of Object.entries(payload)) {
      this.appendValue(form, prefix ? `${prefix}[${key}]` : key, value);
    }
    return form;
  }

  /**
   * Internal recursive helper used by toFormData().
   *
   * Handles nested objects, arrays, primitive values and File instances.
   */
  private appendValue(form: FormData, key: string, value: unknown): void {
    if (value instanceof File) {
      form.append(key, value, value.name);
    } else if (Array.isArray(value)) {
      value.forEach((item, index) => this.appendValue(form, `${key}[${index}]`, item));
    } else if (value !== null && typeof value === 'object') {
      this.toFormData(value as Record<string, unknown>, form, key);
    } else if (typeof value === 'boolean') {
      form.append(key, value ? '1' : '0');
    } else if (value === null || value === undefined) {
      form.append(key, '');
    } else {
      form.append(key, String(value));
    }
  }

  // ── Error handling ──────────────────────────────────────────────────────────

  /**
   * Converts HTTP errors into typed domain errors.
   *
   * Mapping rules
   * ─────────────
   * 422 → SubscriptionValidationError
   * Other HTTP errors → SubscriptionError
   * Network failure → SubscriptionError(status: 0)
   */
  private handleError(err: unknown): Observable<never> {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 422) {
        const body = err.error as ValidationErrorResponse;
        return throwError(
          () =>
            new SubscriptionValidationError(
              body?.message ?? 'Validation failed.',
              body?.errors ?? {},
            ),
        );
      }

      const message =
        (err.error as { message?: string })?.message ?? `HTTP ${err.status}: ${err.statusText}`;
      return throwError(() => new SubscriptionError(message, err.status));
    }

    return throwError(() => new SubscriptionError('An unexpected error occurred.', 0));
  }
}

// ── Custom error classes ──────────────────────────────────────────────────────

export class SubscriptionError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'SubscriptionError';
  }
}

export class SubscriptionValidationError extends SubscriptionError {
  constructor(
    message: string,
    public readonly errors: Record<string, string[]>,
  ) {
    super(message, 422);
    this.name = 'SubscriptionValidationError';
  }

  /** Returns the first validation error message for a field. */
  firstError(field: string): string | null {
    return this.errors[field]?.[0] ?? null;
  }

  /** Returns all fields that failed validation. */
  get invalidFields(): string[] {
    return Object.keys(this.errors);
  }
}
