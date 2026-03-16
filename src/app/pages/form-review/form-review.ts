import { Component, computed, OnInit, signal } from '@angular/core';
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
   * 0–100 during an active upload (drives the determinate progress bar).
   * null = no active upload → progress bar renders as indeterminate.
   */
  readonly uploadPercent = signal<number | null>(null);

  readonly titleKey = computed(() => FORM_CONFIG[this.formType()].titleKey);
  readonly backRoute = computed(() => FORM_CONFIG[this.formType()].backRoute);

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

  // ── 1. onConfirm - production path ────────────────────────────────────────

  onConfirm(): void {
    const payload = history.state?.['payload'] as Record<string, unknown> | undefined;
    if (!payload) return;

    this.loading.set(true);
    this.uploadPercent.set(null);

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

  // ── 2. onConfirmSimple - fallback / lower-overhead path ───────────────────

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

  // ── 3. onConfirmDry - dev/debug path ──────────────────────────────────────

  async onConfirmDry(): Promise<void> {
    const payload = history.state?.['payload'] as Record<string, unknown> | undefined;
    if (!payload) return;

    this.loading.set(true);
    this.uploadPercent.set(null);

    try {
      await this.subscriptionService.submitDry(this.formType(), payload);
      // Dry run: no clearFormStorage(), no navigate - stay on page for re-runs
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
