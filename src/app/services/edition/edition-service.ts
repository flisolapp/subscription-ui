import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, lastValueFrom, map, Observable, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { STORAGE_KEYS } from '../../constants/storage-keys';

@Injectable({
  providedIn: 'root',
})
export class EditionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  getCurrentEdition(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/editions/active`).pipe(
      map((response) => response.data),
      catchError((error: HttpErrorResponse) => {
        console.error('Failed to fetch current edition:', error);
        return throwError(() => new Error('Failed to fetch current edition'));
      }),
    );
  }

  // TODO: Must be removed on Multi Edition
  /**
   * Returns the current edition id, fetching it from the API when it is not
   * already cached in localStorage.
   *
   * Resolution order
   * ────────────────
   * 1. localStorage hit  → return cached id immediately (no network call)
   * 2. localStorage miss → call EditionService.getCurrentEdition(), persist
   *    the response under STORAGE_KEYS.EDITION, then extract and return the id
   * 3. API failure       → log the error and return null so the submission
   *    proceeds without an edition_id (Laravel will respond with 422)
   *
   * // Uncomment the block below once an EditionSelectorDialog component exists.
   * // When the API call also fails, open the dialog so the user can pick the
   * // edition manually instead of silently swallowing the error.
   */
  public async getOrFetchEditionId(): Promise<number | null> {
    // ── 1. Fast path: already cached ────────────────────────────────────────
    const cached = this.readEditionIdFromStorage();
    if (cached !== null) return cached;

    // ── 2. Slow path: fetch from API and persist ─────────────────────────────
    try {
      const edition = await lastValueFrom(this.getCurrentEdition());
      localStorage.setItem(STORAGE_KEYS.EDITION, JSON.stringify(edition));
      return this.extractEditionId(edition);
    } catch (err) {
      console.error('[SubscriptionService] Could not resolve edition id:', err);

      // // ── 3. No edition available — ask the user to select one ──────────
      // // Requires EditionSelectorDialog to be implemented first.
      // this.dialog.open(EditionSelectorDialog).afterClosed().subscribe((selectedEdition) => {
      //   if (selectedEdition) {
      //     localStorage.setItem(STORAGE_KEYS.EDITION, JSON.stringify(selectedEdition));
      //   }
      // });

      return null;
    }
  }

  /**
   * Extracts a numeric edition id from any object-shaped value.
   *
   * Centralised so every storage read and API response use the same logic.
   * Returns null when the value is absent, not an object, or has no numeric id.
   */
  private extractEditionId(value: unknown): number | null {
    if (!value || typeof value !== 'object') return null;
    const id = (value as Record<string, unknown>)['id'];
    return typeof id === 'number' ? id : null;
  }

  /**
   * Reads the edition id that was previously persisted to localStorage.
   *
   * Returns null when:
   * - The key is missing
   * - The stored JSON is malformed
   * - The parsed object has no numeric `id` field
   */
  private readEditionIdFromStorage(): number | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.EDITION);
      if (!raw) return null;
      return this.extractEditionId(JSON.parse(raw));
    } catch {
      return null;
    }
  }
}
