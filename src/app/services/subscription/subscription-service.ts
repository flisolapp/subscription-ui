import {
  HttpClient,
  HttpErrorResponse,
  HttpEvent,
  HttpEventType,
  HttpRequest,
} from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import {
  catchError,
  filter,
  from,
  lastValueFrom,
  map,
  Observable,
  switchMap,
  throwError,
} from 'rxjs';
import { environment } from '../../../environments/environment';
import { ErrorReportingService } from '../error-reporting/error-reporting-service';
import { EditionService } from '../edition/edition-service';

// ── Response shapes ───────────────────────────────────────────────────────────

export interface SubscriptionResponse {
  message: string;
  data: {
    id?: number;
    type: FormType;
    status: SubscriptionStatus;
    created_at: string;
    /** Speaker-specific: IDs of created People records, returned for file upload step. */
    speakers?: { id: number }[];
    /** Speaker-specific: IDs of created Talk records, returned for file upload step. */
    talks?: { id: number }[];
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

/**
 * Progress events emitted during a two-step speaker submission.
 * step: which phase of the submission is currently running.
 * percent: 0-100 during file uploads; null during the JSON registration step.
 */
export interface SpeakerTwoStepProgress {
  step: 'registering' | 'uploading';
  /** Upload index (1-based) out of total, only set when step = 'uploading'. */
  fileIndex?: number;
  fileTotal?: number;
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

  /** Base API URL defined in the Angular environment configuration. */
  private readonly baseUrl = environment.apiUrl;

  /** Centralised error reporting — owns all Sentry interactions. */
  private readonly errorReporting = inject(ErrorReportingService);

  /** Retrieve edition to be sent when subscribe **/
  private readonly edition = inject(EditionService);

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
   * • Automatically injects `edition_id` from localStorage (fetches from API if missing).
   * • Detects whether the payload contains File objects.
   * • Uses JSON when no files exist.
   * • Uses multipart/form-data when files are present.
   *
   * This method returns a Promise because most callers simply need the
   * final response and do not require streaming progress updates.
   */
  async submit(type: FormType, payload: Record<string, unknown>): Promise<SubscriptionResponse> {
    const url = this.url(type);

    const normalizedPayload = this.normalizePayloadByType(type, payload);
    const finalPayload = await this.withEdition(normalizedPayload);

    const request$ = this.hasFiles(finalPayload)
      ? this.postMultipart(url, finalPayload)
      : this.postJson(url, finalPayload);

    return lastValueFrom(request$.pipe(catchError(this.handleError)));
  }

  // ── 2. submitWithProgress() ─────────────────────────────────────────────────
  /**
   * Upload-aware POST.
   *
   * Returns an Observable stream emitting UploadProgress objects so
   * callers can drive a progress bar during file uploads.
   *
   * Used for participant and collaborator submissions (no separate file step).
   */
  submitWithProgress(type: FormType, payload: Record<string, unknown>): Observable<UploadProgress> {
    const url = this.url(type);

    const normalizedPayload = this.normalizePayloadByType(type, payload);

    return from(this.withEdition(normalizedPayload)).pipe(
      switchMap((finalPayload) => {
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
                return { percent: 100, done: true, response: event.body ?? undefined };
              default:
                return { percent: null, done: false };
            }
          }),
        );
      }),
    );
  }

  // ── 3. submitSpeakerTwoStep() ────────────────────────────────────────────────
  /**
   * Two-step speaker submission.
   *
   * Step 1 — JSON registration:
   *   Posts the speaker and talk data as JSON (no files). The backend creates
   *   People and Talk records and returns their IDs.
   *
   * Step 2 — File uploads:
   *   Sends each speaker photo and talk slide as a separate multipart request
   *   to the dedicated upload endpoints, using the IDs returned in step 1.
   *
   * The caller receives a stream of SpeakerTwoStepProgress events that it can
   * use to drive a progress bar and status label in the UI.
   *
   * File-size limits enforced on the frontend before this method is called:
   *   Photo  → max 5 MB  (validated in SpeakerCard)
   *   Slide  → max 10 MB (validated in TalkCard)
   *
   * @param payload  Raw frontend payload containing File objects in
   *                 speakers[*].photo and talks[*].slideFile.
   */
  async submitSpeakerTwoStep(
    payload: Record<string, unknown>,
    onProgress: (progress: SpeakerTwoStepProgress) => void,
  ): Promise<SubscriptionResponse> {
    // ── Step 1: JSON registration (no files) ─────────────────────────────────

    onProgress({ step: 'registering', percent: null, done: false });

    const normalizedPayload = this.mapSpeakerPayload(payload);
    const jsonPayload = await this.withEdition(this.stripFiles(normalizedPayload));

    const registrationResponse = await lastValueFrom(
      this.postJson(this.url('speaker'), jsonPayload).pipe(catchError(this.handleError)),
    );

    const speakerIds = registrationResponse.data.speakers?.map((s) => s.id) ?? [];
    const talkIds = registrationResponse.data.talks?.map((t) => t.id) ?? [];

    // ── Step 2: File uploads ─────────────────────────────────────────────────

    const speakers = (payload['speakers'] as Array<Record<string, unknown>>) ?? [];
    const talks = (payload['talks'] as Array<Record<string, unknown>>) ?? [];

    const photos: { speakerId: number; file: File }[] = speakers
      .map((s, i) => ({ speakerId: speakerIds[i], file: s['photo'] as File | null }))
      .filter(
        (item): item is { speakerId: number; file: File } =>
          item.file instanceof File && !!item.speakerId,
      );

    const slides: { talkId: number; file: File }[] = talks
      .map((t, i) => ({ talkId: talkIds[i], file: t['slideFile'] as File | null }))
      .filter(
        (item): item is { talkId: number; file: File } =>
          item.file instanceof File && !!item.talkId,
      );

    const fileTotal = photos.length + slides.length;
    let fileIndex = 0;

    for (const { speakerId, file } of photos) {
      fileIndex++;
      onProgress({
        step: 'uploading',
        fileIndex,
        fileTotal,
        percent: Math.round(((fileIndex - 1) / fileTotal) * 100),
        done: false,
      });
      await this.uploadSpeakerPhoto(speakerId, file);
    }

    for (const { talkId, file } of slides) {
      fileIndex++;
      onProgress({
        step: 'uploading',
        fileIndex,
        fileTotal,
        percent: Math.round(((fileIndex - 1) / fileTotal) * 100),
        done: false,
      });
      await this.uploadTalkSlide(talkId, file);
    }

    onProgress({ step: 'uploading', percent: 100, done: true, response: registrationResponse });

    return registrationResponse;
  }

  // ── 4. uploadSpeakerPhoto() ─────────────────────────────────────────────────
  /**
   * POSTs a single speaker photo to the dedicated upload endpoint.
   * Called by submitSpeakerTwoStep() after the speaker IDs are known.
   */
  async uploadSpeakerPhoto(speakerId: number, photo: File): Promise<void> {
    const url = `${this.baseUrl}/subscriptions/speakers/${speakerId}/photo`;
    const form = new FormData();
    form.append('photo', photo, photo.name);
    await lastValueFrom(this.http.post(url, form).pipe(catchError(this.handleError)));
  }

  // ── 5. uploadTalkSlide() ────────────────────────────────────────────────────
  /**
   * POSTs a single talk slide to the dedicated upload endpoint.
   * Called by submitSpeakerTwoStep() after the talk IDs are known.
   */
  async uploadTalkSlide(talkId: number, slide: File): Promise<void> {
    const url = `${this.baseUrl}/subscriptions/talks/${talkId}/slide`;
    const form = new FormData();
    form.append('slide_file', slide, slide.name);
    await lastValueFrom(this.http.post(url, form).pipe(catchError(this.handleError)));
  }

  // ── 6. submitDry() ──────────────────────────────────────────────────────────
  /**
   * Development / debug helper — NO network request is made.
   */
  async submitDry(
    type: FormType,
    payload: Record<string, unknown>,
    delayMs = 1200,
  ): Promise<SubscriptionResponse> {
    const url = this.url(type);

    const normalizedPayload = this.normalizePayloadByType(type, payload);
    const finalPayload = await this.withEdition(normalizedPayload);

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

  private url(type: FormType): string {
    return `${this.baseUrl}${ENDPOINTS[type]}`;
  }

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

  private mapPeoplePayload(payload: Record<string, unknown>): Record<string, unknown> {
    return {
      name: payload['name'] ?? null,
      email: payload['email'] ?? null,
      federal_code: payload['federalCode'] ?? payload['federal_code'] ?? null,
      phone: payload['phone'] ?? null,
      photo: payload['photo'] ?? null,
      bio: payload['bio'] ?? null,
      site: payload['site'] ?? null,
      use_free: this.toNullableBoolean(payload['usesFreeSoftware'] ?? payload['use_free'] ?? null),
      distro_id: this.toNullableNumber(payload['distro'] ?? payload['distro_id'] ?? null),
      student_info_id: this.toNullableNumber(
        payload['isStudent'] ?? payload['student_info_id'] ?? null,
      ),
      student_place: payload['institution'] ?? payload['student_place'] ?? null,
      student_course: payload['course'] ?? payload['student_course'] ?? null,
      address_state: payload['state'] ?? payload['address_state'] ?? null,
    };
  }

  private mapParticipantPayload(payload: Record<string, unknown>): Record<string, unknown> {
    return { ...this.mapPeoplePayload(payload) };
  }

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
   * NOTE: File objects (photo, slide_file) are preserved here so that
   * submitSpeakerTwoStep() can extract them for the upload step. When
   * sending the JSON registration request, stripFiles() is applied first.
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
        talk_subject_id: t['tema'] ?? null,
        slide_file: t['slideFile'] ?? null,
        slide_url: t['slideUrl'] ?? null,
      })),
    };
  }

  /**
   * Recursively strips all File objects from a payload, replacing them with null.
   * Used to produce the JSON-safe body for the first registration step.
   */
  private stripFiles(payload: unknown): Record<string, unknown> {
    const strip = (value: unknown): unknown => {
      if (value instanceof File) return null;
      if (Array.isArray(value)) return value.map(strip);
      if (value !== null && typeof value === 'object') {
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
          out[k] = strip(v);
        }
        return out;
      }
      return value;
    };
    return strip(payload) as Record<string, unknown>;
  }

  private async withEdition(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    return {
      ...payload,
      edition_id: await this.edition.getOrFetchEditionId(),
    };
  }

  private toNullableBoolean(value: unknown): boolean | null {
    if (value === null || value === undefined || value === '') return null;
    if (
      value === true ||
      value === 1 ||
      value === '1' ||
      value === 'true' ||
      value === 'yes' ||
      value === 'on'
    )
      return true;
    if (
      value === false ||
      value === 0 ||
      value === '0' ||
      value === 'false' ||
      value === 'no' ||
      value === 'off'
    )
      return false;
    return null;
  }

  private toNullableNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private toNumberArray(value: unknown): number[] {
    if (!Array.isArray(value)) return [];
    return value
      .map((item) => this.toNullableNumber(item))
      .filter((item): item is number => item !== null);
  }

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

  private postJson(
    url: string,
    payload: Record<string, unknown>,
  ): Observable<SubscriptionResponse> {
    return this.http.post<SubscriptionResponse>(url, payload);
  }

  private postMultipart(
    url: string,
    payload: Record<string, unknown>,
  ): Observable<SubscriptionResponse> {
    return this.http.post<SubscriptionResponse>(url, this.toFormData(payload));
  }

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

  private readonly handleError = (err: unknown): Observable<never> => {
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

      this.errorReporting.captureHttpError(err, 'SubscriptionService');

      const message =
        this.errorReporting.extractServerMessage(err) ?? `HTTP ${err.status}: ${err.statusText}`;

      return throwError(() => new SubscriptionError(message, err.status));
    }

    this.errorReporting.captureUnexpectedError(err, 'SubscriptionService');
    return throwError(() => new SubscriptionError('An unexpected error occurred.', 0));
  };
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

  firstError(field: string): string | null {
    return this.errors[field]?.[0] ?? null;
  }

  get invalidFields(): string[] {
    return Object.keys(this.errors);
  }
}
