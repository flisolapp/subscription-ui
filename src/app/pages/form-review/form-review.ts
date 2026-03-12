import { Component, computed, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PageStructure } from '../../components/page-structure/page-structure';
import {
  SubscriptionError,
  SubscriptionService,
  SubscriptionValidationError,
} from '../../services/subscription/subscription';
import { FormStorageService } from '../../services/form-storage/form-storage-service';
import {
  buildCollaboratorSections,
  buildParticipantSections,
  buildSpeakerSections,
} from './review-sections.builder';

// ── Public interfaces (consumed by builder) ───────────────────────────────────

export interface ConfirmationField {
  label: string;
  value: string;
  image?: File | null;
  inline?: boolean;
}

export interface ConfirmationSection {
  title?: string;
  fields: ConfirmationField[];
  cardLayout?: boolean;
  tagLayout?: boolean;
}

export interface FieldRow {
  type: 'single' | 'pair';
  field?: ConfirmationField;
  first?: ConfirmationField;
  second?: ConfirmationField;
  fullWidth?: boolean;
}

// ── Form-type config ──────────────────────────────────────────────────────────

type FormType = 'participant' | 'speaker' | 'collaborator';

const FORM_CONFIG: Record<FormType, { title: string; backRoute: string }> = {
  participant: { title: 'Inscreva-se', backRoute: '/subscribe/participant' },
  speaker: { title: 'Submissão de palestras', backRoute: '/subscribe/speaker' },
  collaborator: { title: 'Quero colaborar', backRoute: '/subscribe/collaborator' },
};

// ── Snackbar helpers ──────────────────────────────────────────────────────────

const SNACK_DURATION = 5_000;

// ── Component ─────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-form-review',
  imports: [CommonModule, PageStructure, MatButton, MatIcon, MatProgressBar],
  templateUrl: './form-review.html',
  styleUrl: './form-review.scss',
})
export class FormReview implements OnInit {
  // ── State ─────────────────────────────────────────────────────────────────
  readonly loading = signal(false);
  readonly sections = signal<ConfirmationSection[]>([]);
  readonly formType = signal<FormType>('participant');

  /**
   * 0–100 during an active upload (drives the determinate progress bar).
   * null = no active upload → progress bar renders as indeterminate.
   */
  readonly uploadPercent = signal<number | null>(null);

  readonly title = computed(() => FORM_CONFIG[this.formType()].title);
  readonly backRoute = computed(() => FORM_CONFIG[this.formType()].backRoute);

  constructor(
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly subscriptionService: SubscriptionService,
    private readonly snackBar: MatSnackBar,
    private readonly formStorage: FormStorageService,
  ) {}

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngOnInit(): void {
    const parentPath = this.route.snapshot.parent?.routeConfig?.path as FormType | undefined;
    const type: FormType = parentPath && parentPath in FORM_CONFIG ? parentPath : 'participant';
    this.formType.set(type);

    const payload = history.state?.['payload'] as Record<string, unknown> | undefined;

    if (!payload) {
      this.router.navigate([this.backRoute()], { replaceUrl: true });
      return;
    }

    this.sections.set(this.buildSections(type, payload));
  }

  // ── Template helpers ──────────────────────────────────────────────────────

  imageUrl(file: File | null | undefined): string | null {
    return file ? URL.createObjectURL(file) : null;
  }

  cardImageField(section: ConfirmationSection): ConfirmationField | undefined {
    return section.fields.find((f) => !!f.image);
  }

  cardTextFields(section: ConfirmationSection): ConfirmationField[] {
    return section.fields.filter((f) => !f.image);
  }

  fieldRows(fields: ConfirmationField[]): FieldRow[] {
    const FULL_WIDTH = new Set(['título', 'descrição']);
    const rows: FieldRow[] = [];
    let i = 0;

    while (i < fields.length) {
      const curr = fields[i];
      const next = fields[i + 1];

      if (curr.inline && next?.inline) {
        rows.push({ type: 'pair', first: curr, second: next });
        i += 2;
      } else {
        rows.push({
          type: 'single',
          field: curr,
          fullWidth: FULL_WIDTH.has(curr.label.toLowerCase()),
        });
        i++;
      }
    }

    return rows;
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  onBack(): void {
    this.router.navigate([this.backRoute()]);
  }

  // ── 1. onConfirm — production path ────────────────────────────────────────
  /**
   * Uses submitWithProgress() so the progress bar shows real upload %.
   * Falls back to indeterminate while the server processes the request
   * (uploadPercent = null after bytes are sent but before the response).
   *
   * On success → clears all form storage and returns to /subscribe.
   * On error   → shows a snackbar and stays on the review page so the
   *              user can go back to fix the form or retry.
   */
  onConfirm(): void {
    const payload = history.state?.['payload'] as Record<string, unknown> | undefined;
    if (!payload) return;

    this.loading.set(true);
    this.uploadPercent.set(null);

    this.subscriptionService.submitWithProgress(this.formType(), payload).subscribe({
      next: ({ percent, done, response }) => {
        // Drive the progress bar with real upload bytes
        this.uploadPercent.set(percent);

        if (done) {
          this.clearFormStorage();
          this.router.navigate(['/subscribe/success'], {
            state: { type: this.formType() },
            replaceUrl: true,
          });
        }
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.uploadPercent.set(null);
        this.handleSubmitError(err);
        // ← no navigation: user stays on the review page to retry or go back
      },
      complete: () => {
        this.loading.set(false);
        this.uploadPercent.set(null);
      },
    });
  }

  // ── 2. onConfirmSimple — fallback / lower-overhead path ───────────────────
  /**
   * Uses the plain submit() (JSON or multipart, no progress events).
   * Handy if you need to bypass FormData serialisation for a specific flow.
   * Wire to a secondary button or swap with onConfirm() as needed.
   *
   * Same success/error contract as onConfirm().
   */
  async onConfirmSimple(): Promise<void> {
    const payload = history.state?.['payload'] as Record<string, unknown> | undefined;
    if (!payload) return;

    this.loading.set(true);
    this.uploadPercent.set(null);

    try {
      const res = await this.subscriptionService.submit(this.formType(), payload);
      this.clearFormStorage();
      this.snackBar.open(res.message ?? 'Enviado com sucesso!', 'OK', {
        duration: SNACK_DURATION,
      });
      // v1: this.router.navigate(['/subscribe/success'], { state: { type: this.formType() }, replaceUrl: true });
      this.router.navigate(['/subscribe/success'], {
        state: { type: this.formType() },
        replaceUrl: true,
      });
    } catch (err: unknown) {
      this.handleSubmitError(err);
      // ← no navigation on error
    } finally {
      this.loading.set(false);
      this.uploadPercent.set(null);
    }
  }

  // ── 3. onConfirmDry — dev/debug path ──────────────────────────────────────
  /**
   * Calls submitDry(): logs the full serialised body to the console,
   * simulates a delay, and shows a snackbar — NO network request.
   *
   * Intentionally does NOT clear storage or navigate so you can re-run
   * the dry-run multiple times without losing the review state.
   *
   * Remove before going to production.
   */
  async onConfirmDry(): Promise<void> {
    const payload = history.state?.['payload'] as Record<string, unknown> | undefined;
    if (!payload) return;

    this.loading.set(true);
    this.uploadPercent.set(null);

    try {
      const res = await this.subscriptionService.submitDry(this.formType(), payload);
      // Dry run: no clearFormStorage(), no navigate — stay on page for re-runs
      // this.snackBar.open(`🧪 ${res.message}`, 'OK', { duration: SNACK_DURATION });
      this.router.navigate(['/subscribe/success'], {
        state: { type: this.formType() },
        replaceUrl: true,
      });
    } catch (err: unknown) {
      this.handleSubmitError(err);
    } finally {
      this.loading.set(false);
      this.uploadPercent.set(null);
    }
  }

  // ── Private ───────────────────────────────────────────────────────────────

  /**
   * Wipes every form-related storage entry so the next visit to /subscribe
   * starts with a completely fresh flow.
   *
   * Uncomment the line below once you are ready to plug in the real service.
   * FormStorageService.clearAll() handles:
   *   • localStorage keys: flisol_form_participant, flisol_form_speakers,
   *     flisol_form_talks, flisol_form_collaborator,
   *     flisol_form_collaborator_disp, flisol_form_collaborator_grupos
   *   • IndexedDB files under the prefix:  flisol_speaker_*
   *
   * The router navigation state that carries the payload is discarded
   * automatically by replaceUrl: true on the navigate() call.
   */
  private clearFormStorage(): void {
    // this.formStorage.clearAll();
    console.debug(
      '[FormReview] clearFormStorage() called — uncomment this.formStorage.clearAll() when ready',
    );
  }

  /**
   * Centralised error handler for all three submit paths.
   * Always stays on the current page — the user decides what to do next.
   *
   * 422 → joins the first error of each invalid field into one message
   * Other HTTP errors → shows server message + status label
   * Unknown → generic Portuguese fallback
   */
  private handleSubmitError(err: unknown): void {
    if (err instanceof SubscriptionValidationError) {
      const summary = err.invalidFields
        .map((field) => err.firstError(field))
        .filter(Boolean)
        .join(' · ');

      this.snackBar.open(summary || err.message, 'OK', { duration: SNACK_DURATION });
      console.warn('[FormReview] Validation errors:', err.errors);
      return;
    }

    if (err instanceof SubscriptionError) {
      const label = err.status === 0 ? 'Sem conexão' : `Erro ${err.status}`;
      this.snackBar.open(`${label}: ${err.message}`, 'Fechar', { duration: SNACK_DURATION });
      console.error('[FormReview] HTTP error:', err);
      return;
    }

    this.snackBar.open('Ocorreu um erro inesperado. Tente novamente.', 'Fechar', {
      duration: SNACK_DURATION,
    });
    console.error('[FormReview] Unexpected error:', err);
  }

  private buildSections(type: FormType, payload: Record<string, unknown>): ConfirmationSection[] {
    switch (type) {
      case 'participant':
        return buildParticipantSections(payload);
      case 'collaborator':
        return buildCollaboratorSections(payload);
      case 'speaker':
        return buildSpeakerSections(payload);
    }
  }
}
