import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { PageStructure } from '../../components/page-structure/page-structure';
import { SubscriptionType } from '../../models/subscription-type/subscription-type';
import {
  SpeakerTwoStepProgress,
  SubscriptionError,
  SubscriptionService,
  SubscriptionValidationError,
} from '../../services/subscription/subscription-service';
import { FormStorageService } from '../../services/form-storage/form-storage-service';
import {
  buildCollaboratorSections,
  buildParticipantSections,
  buildSpeakerSections,
  TranslateFn,
} from './review-sections.builder';
import { SNACK_DURATION } from '../../app.config';

// ── File size limits (must mirror SpeakerCard and TalkCard constants) ─────────

const PHOTO_MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const SLIDE_MAX_BYTES = 10 * 1024 * 1024; // 10 MB

// ── Public interfaces (consumed by builder) ───────────────────────────────────

export interface ConfirmationField {
  label: string;
  value: string;
  image?: File | null;
  inline?: boolean;
  fullWidth?: boolean;
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

const FORM_CONFIG: Record<SubscriptionType, { titleKey: string; backRoute: string }> = {
  participant: { titleKey: 'formReview.titles.participant', backRoute: '/subscribe/participant' },
  speaker: { titleKey: 'formReview.titles.speaker', backRoute: '/subscribe/speaker' },
  collaborator: {
    titleKey: 'formReview.titles.collaborator',
    backRoute: '/subscribe/collaborator',
  },
};

// ── Component ─────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-form-review',
  imports: [CommonModule, TranslatePipe, PageStructure, MatButton, MatIcon, MatProgressBar],
  templateUrl: './form-review.html',
  styleUrl: './form-review.scss',
})
export class FormReview implements OnInit {
  // ── State ─────────────────────────────────────────────────────────────────

  readonly loading = signal(false);
  readonly sections = signal<ConfirmationSection[]>([]);
  readonly formType = signal<SubscriptionType>('participant');

  /**
   * 0–100 during an active file upload; null = indeterminate (registering step).
   */
  readonly uploadPercent = signal<number | null>(null);

  /**
   * Human-readable label shown in the submit button during a two-step upload.
   * Null means we're not in two-step mode (participant / collaborator).
   */
  readonly uploadStepKey = signal<string | null>(null);

  readonly titleKey = computed(() => FORM_CONFIG[this.formType()].titleKey);
  readonly backRoute = computed(() => FORM_CONFIG[this.formType()].backRoute);

  /** Payload kept so sections can be rebuilt on language change. */
  private payload: Record<string, unknown> | null = null;

  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly subscriptionService: SubscriptionService,
    private readonly snackBar: MatSnackBar,
    private readonly formStorage: FormStorageService,
    private readonly translate: TranslateService,
  ) {}

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnInit(): void {
    const parentPath = this.route.snapshot.parent?.routeConfig?.path as
      | SubscriptionType
      | undefined;
    const type: SubscriptionType =
      parentPath && parentPath in FORM_CONFIG ? parentPath : 'participant';
    this.formType.set(type);

    const payload = history.state?.['payload'] as Record<string, unknown> | undefined;

    if (!payload) {
      this.router.navigate([this.backRoute()], { replaceUrl: true });
      return;
    }

    this.payload = payload;
    this.sections.set(this.buildSections(type, payload));

    // Rebuild sections whenever the active language changes.
    this.translate.onLangChange.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.sections.set(this.buildSections(this.formType(), this.payload!));
    });
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
    const rows: FieldRow[] = [];
    let i = 0;

    while (i < fields.length) {
      const curr = fields[i];
      const next = fields[i + 1];

      if (curr.inline && next?.inline) {
        rows.push({ type: 'pair', first: curr, second: next });
        i += 2;
      } else {
        rows.push({ type: 'single', field: curr, fullWidth: !!curr.fullWidth });
        i++;
      }
    }

    return rows;
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  onBack(): void {
    this.router.navigate([this.backRoute()]);
  }

  /**
   * Main confirmation handler.
   *
   * Routes to the correct submission strategy based on subscription type:
   * - speaker     → two-step (JSON registration then individual file uploads)
   * - participant / collaborator → single multipart / JSON request with progress
   */
  onConfirm(): void {
    const payload = history.state?.['payload'] as Record<string, unknown> | undefined;
    if (!payload) return;

    if (this.formType() === 'speaker') {
      this.confirmSpeakerTwoStep(payload);
    } else {
      this.confirmWithProgress(payload);
    }
  }

  // ── Private submission strategies ─────────────────────────────────────────

  /**
   * Two-step speaker submission:
   *   1. Re-validates file sizes before sending anything.
   *   2. POSTs JSON (no files) → receives speaker/talk IDs.
   *   3. Uploads each photo and slide individually.
   *   4. Navigates to success page.
   */
  private confirmSpeakerTwoStep(payload: Record<string, unknown>): void {
    // ── Re-validate file sizes at review time ─────────────────────────────
    const validationError = this.validateSpeakerFiles(payload);
    if (validationError) {
      this.snackBar.open(validationError, this.translate.instant('common.ok'), {
        duration: SNACK_DURATION,
      });
      return;
    }

    this.loading.set(true);
    this.uploadPercent.set(null);
    this.uploadStepKey.set('formReview.stepRegistering');

    this.subscriptionService
      .submitSpeakerTwoStep(payload, (progress: SpeakerTwoStepProgress) => {
        if (progress.step === 'registering') {
          this.uploadPercent.set(null);
          this.uploadStepKey.set('formReview.stepRegistering');
        } else {
          this.uploadPercent.set(progress.percent);
          this.uploadStepKey.set(
            progress.fileIndex != null && progress.fileTotal != null
              ? null // use percent display instead
              : 'formReview.stepUploading',
          );
        }

        if (progress.done) {
          this.clearFormStorage();
          this.router.navigate(['/subscribe/success'], {
            state: { type: this.formType() },
            replaceUrl: true,
          });
        }
      })
      .then(() => {
        // Navigation already triggered inside the progress callback on done=true
      })
      .catch((err: unknown) => {
        this.loading.set(false);
        this.uploadPercent.set(null);
        this.uploadStepKey.set(null);
        this.handleSubmitError(err);
      });
  }

  /**
   * Standard upload-with-progress path for participant and collaborator.
   */
  private confirmWithProgress(payload: Record<string, unknown>): void {
    this.loading.set(true);
    this.uploadPercent.set(null);
    this.uploadStepKey.set(null);

    this.subscriptionService.submitWithProgress(this.formType(), payload).subscribe({
      next: ({ percent, done }) => {
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
      },
      complete: () => {
        this.loading.set(false);
        this.uploadPercent.set(null);
      },
    });
  }

  /**
   * Validates that no attached speaker file exceeds its size limit.
   * Returns a translated error message string, or null if everything is valid.
   *
   * This is a second guard — the primary guard lives in SpeakerCard / TalkCard.
   * Running it again here protects against any edge-case where the payload
   * reached the review page with an oversized file already attached.
   */
  private validateSpeakerFiles(payload: Record<string, unknown>): string | null {
    const speakers = (payload['speakers'] as Array<Record<string, unknown>>) ?? [];
    const talks = (payload['talks'] as Array<Record<string, unknown>>) ?? [];

    for (let i = 0; i < speakers.length; i++) {
      const photo = speakers[i]['photo'];
      if (photo instanceof File && photo.size > PHOTO_MAX_BYTES) {
        return this.translate.instant('fileSizeError.photo', {
          max: '5 MB',
          name: photo.name,
        });
      }
    }

    for (let i = 0; i < talks.length; i++) {
      const slide = talks[i]['slideFile'];
      if (slide instanceof File && slide.size > SLIDE_MAX_BYTES) {
        return this.translate.instant('fileSizeError.slide', {
          max: '10 MB',
          name: slide.name,
        });
      }
    }

    return null;
  }

  // ── Fallback paths (dev / debug) ──────────────────────────────────────────

  async onConfirmSimple(): Promise<void> {
    const payload = history.state?.['payload'] as Record<string, unknown> | undefined;
    if (!payload) return;

    this.loading.set(true);
    this.uploadPercent.set(null);

    try {
      const res = await this.subscriptionService.submit(this.formType(), payload);
      this.clearFormStorage();
      this.snackBar.open(
        res.message ?? this.translate.instant('common.sentSuccess'),
        this.translate.instant('common.ok'),
        { duration: SNACK_DURATION },
      );
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

  async onConfirmDry(): Promise<void> {
    const payload = history.state?.['payload'] as Record<string, unknown> | undefined;
    if (!payload) return;

    this.loading.set(true);
    this.uploadPercent.set(null);

    try {
      await this.subscriptionService.submitDry(this.formType(), payload);
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

  private async clearFormStorage(): Promise<void> {
    await this.formStorage.clearAll();
  }

  private handleSubmitError(err: unknown): void {
    if (err instanceof SubscriptionValidationError) {
      const summary = err.invalidFields
        .map((field) => err.firstError(field))
        .filter(Boolean)
        .join(' · ');

      this.snackBar.open(summary || err.message, this.translate.instant('common.ok'), {
        duration: SNACK_DURATION,
      });
      console.warn('[FormReview] Validation errors:', err.errors);
      return;
    }

    if (err instanceof SubscriptionError) {
      const label =
        err.status === 0
          ? this.translate.instant('common.noConnection')
          : this.translate.instant('common.httpError', { status: err.status });

      this.snackBar.open(`${label}: ${err.message}`, this.translate.instant('common.close'), {
        duration: SNACK_DURATION,
      });
      console.error('[FormReview] HTTP error:', err);
      return;
    }

    this.snackBar.open(
      this.translate.instant('common.unexpectedError'),
      this.translate.instant('common.close'),
      { duration: SNACK_DURATION },
    );
    console.error('[FormReview] Unexpected error:', err);
  }

  private buildSections(
    type: SubscriptionType,
    payload: Record<string, unknown>,
  ): ConfirmationSection[] {
    const t: TranslateFn = (key, params) => this.translate.instant(key, params);
    switch (type) {
      case 'participant':
        return buildParticipantSections(payload, t);
      case 'collaborator':
        return buildCollaboratorSections(payload, t);
      case 'speaker':
        return buildSpeakerSections(payload, t);
    }
  }
}
