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
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  // ── 1. submit() ─────────────────────────────────────────────────────────────
  /**
   * Fire-and-forget POST.
   * Auto-selects JSON or multipart/form-data based on whether the payload
   * contains any File objects. Resolves to the server response.
   */
  submit(type: FormType, payload: Record<string, unknown>): Promise<SubscriptionResponse> {
    const url = this.url(type);
    const request$ = this.hasFiles(payload)
      ? this.postMultipart(url, payload)
      : this.postJson(url, payload);

    return lastValueFrom(request$.pipe(catchError(this.handleError)));
  }

  // ── 2. submitWithProgress() ─────────────────────────────────────────────────
  /**
   * Upload-aware POST.
   * Returns a stream of UploadProgress so the caller can drive a real
   * percentage progress bar instead of an indeterminate one.
   *
   * Always uses multipart/form-data (even for payloads without files)
   * because browsers only expose upload progress for FormData requests.
   *
   * Usage:
   *   this.subscriptionService
   *     .submitWithProgress(type, payload)
   *     .subscribe(({ percent, done, response }) => { ... });
   */
  submitWithProgress(type: FormType, payload: Record<string, unknown>): Observable<UploadProgress> {
    const url = this.url(type);
    const req = new HttpRequest<FormData>('POST', url, this.toFormData(payload), {
      reportProgress: true,
      withCredentials: true,
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
  }

  // ── 3. submitDry() ──────────────────────────────────────────────────────────
  /**
   * Development / debug helper — NO network request is made.
   *
   * Resolves the payload exactly as the real methods would serialise it,
   * logs a detailed breakdown to the console, and returns a mock response
   * after a short simulated delay.
   *
   * Strip all calls to this method before going to production.
   */
  async submitDry(
    type: FormType,
    payload: Record<string, unknown>,
    delayMs = 1200,
  ): Promise<SubscriptionResponse> {
    const url = this.url(type);
    const usesMultipart = this.hasFiles(payload);
    const body = usesMultipart ? this.toFormData(payload) : payload;

    console.groupCollapsed(`[SubscriptionService.submitDry] ${type.toUpperCase()} → ${url}`);
    console.log('Content-Type:', usesMultipart ? 'multipart/form-data' : 'application/json');
    console.log('Raw payload:', payload);

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

  private hasFiles(payload: Record<string, unknown>): boolean {
    return Object.values(payload).some((v) => v instanceof File);
  }

  private postJson(
    url: string,
    payload: Record<string, unknown>,
  ): Observable<SubscriptionResponse> {
    return this.http.post<SubscriptionResponse>(url, payload, { withCredentials: true });
  }

  private postMultipart(
    url: string,
    payload: Record<string, unknown>,
  ): Observable<SubscriptionResponse> {
    return this.http.post<SubscriptionResponse>(url, this.toFormData(payload), {
      withCredentials: true,
    });
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

  private appendValue(form: FormData, key: string, value: unknown): void {
    if (value instanceof File) {
      form.append(key, value, value.name);
    } else if (Array.isArray(value)) {
      value.forEach((item) => this.appendValue(form, `${key}[]`, item));
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
   * 422 → SubscriptionValidationError (carries the full Laravel error bag)
   * Other 4xx/5xx → SubscriptionError
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

  firstError(field: string): string | null {
    return this.errors[field]?.[0] ?? null;
  }

  get invalidFields(): string[] {
    return Object.keys(this.errors);
  }
}
