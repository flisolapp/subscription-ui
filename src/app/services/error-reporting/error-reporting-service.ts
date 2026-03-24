import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import * as Sentry from '@sentry/angular';

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * Identifies the service that originated the error.
 * Stored as a Sentry tag so events can be filtered per-service in the dashboard.
 */
export type ErrorSource = 'SubscriptionService' | string;

// ── Service ───────────────────────────────────────────────────────────────────

/**
 * Centralised error reporting facade.
 *
 * All Sentry imports and calls live here.
 * No other service or component should import @sentry/angular directly.
 *
 * Capture strategy
 * ────────────────
 * HTTP status 0      → Network failure (no connection, CORS, timeout) → captured
 * HTTP status 422    → Validation error (user mistake, expected)       → NOT captured
 * HTTP status 4xx    → Other client errors                             → NOT captured
 * HTTP status 5xx    → Server crash / unavailable                      → captured
 * Non-HTTP errors    → Unexpected JS errors                            → captured
 *
 * Message extraction handles three Laravel/proxy response formats:
 * 1. Classic Laravel       { message: '...' }
 * 2. Laravel 13 JSON:API   { errors: [{ detail: '...', title: '...' }] }
 * 3. Raw string / HTML     Plain-text or HTML page from nginx / AWS ALB
 */
@Injectable({
  providedIn: 'root',
})
export class ErrorReportingService {
  /**
   * Evaluates an HttpErrorResponse and forwards it to Sentry when the status
   * indicates a server or network failure.
   *
   * Safe to call unconditionally — the method applies the capture strategy
   * internally and silently ignores 4xx client errors.
   *
   * @param err    The HttpErrorResponse caught in the HTTP pipeline.
   * @param source A label identifying the originating service (used as a Sentry tag).
   */
  captureHttpError(err: HttpErrorResponse, source: ErrorSource): void {
    const shouldCapture = err.status === 0 || err.status >= 500;
    if (!shouldCapture) return;

    const serverMessage = this.extractServerMessage(err);

    Sentry.captureException(err, {
      tags: {
        source,
        http_status: err.status,
      },
      extra: {
        // Human-readable message from the server body — most diagnostic for 503s
        server_message: serverMessage ?? '(no message in response body)',
        // Full raw body so nothing is lost even when the message is ambiguous
        response_body: err.error,
        // Request metadata
        url: err.url,
        status_text: err.statusText,
      },
    });
  }

  /**
   * Captures a non-HTTP error (unexpected JS exception thrown inside a
   * service pipeline that was not caused by an HTTP response).
   *
   * @param err    The unknown error value caught by the pipeline.
   * @param source A label identifying the originating service.
   */
  captureUnexpectedError(err: unknown, source: ErrorSource): void {
    Sentry.captureException(err, {
      tags: {
        source,
        http_status: 0,
      },
      extra: {
        description: `Non-HTTP error thrown inside ${source} pipeline`,
      },
    });
  }

  /**
   * Extracts a human-readable message from an HTTP error response body.
   *
   * Handles three formats in order of precedence:
   *
   * 1. Classic Laravel       { message: 'Something went wrong.' }
   *    Used by all standard Laravel error responses across all versions.
   *
   * 2. Laravel 13 JSON:API   { errors: [{ detail: '...', title: '...' }] }
   *    Used when the project adopts the new first-party JSON:API resources
   *    introduced in Laravel 13. Falls back from detail → title if detail
   *    is absent.
   *
   * 3. Raw string body       'Service Unavailable' or an HTML error page.
   *    Common for 503s thrown by nginx / AWS ALB before the request reaches
   *    PHP-FPM. HTML tags are stripped and the result is capped at 200 chars
   *    to avoid flooding Sentry with full HTML pages.
   *
   * Returns null when no meaningful message can be extracted.
   */
  extractServerMessage(err: HttpErrorResponse): string | null {
    const body = err.error;

    // Format 1 — classic Laravel: { message: '...' }
    if (
      body &&
      typeof body === 'object' &&
      typeof (body as Record<string, unknown>)['message'] === 'string'
    ) {
      return (body as { message: string }).message;
    }

    // Format 2 — Laravel 13 JSON:API: { errors: [{ detail: '...', title: '...' }] }
    const jsonApiErrors = (body as { errors?: Array<{ detail?: string; title?: string }> })?.errors;
    if (Array.isArray(jsonApiErrors) && jsonApiErrors.length > 0) {
      const first = jsonApiErrors[0];
      return first.detail ?? first.title ?? null;
    }

    // Format 3 — raw string body (nginx/proxy HTML or plain-text error page)
    if (typeof body === 'string' && body.trim().length > 0) {
      return body
        .replace(/<[^>]*>/g, '')
        .trim()
        .slice(0, 200);
    }

    return null;
  }
}
