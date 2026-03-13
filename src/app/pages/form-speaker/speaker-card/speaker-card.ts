import {
  Component,
  effect,
  ElementRef,
  input,
  OnDestroy,
  output,
  signal,
  ViewChild,
} from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatError, MatFormField, MatInput, MatLabel } from '@angular/material/input';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { formatPhone, getControlError } from '../../../forms/form-field/form-field';

@Component({
  selector: 'app-speaker-card',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslatePipe,
    MatFormField,
    MatLabel,
    MatError,
    MatInput,
    MatIconButton,
    MatIcon,
  ],
  templateUrl: './speaker-card.html',
  styleUrl: './speaker-card.scss',
})
export class SpeakerCard implements OnDestroy {
  readonly group = input.required<FormGroup>();
  readonly idx = input.required<number>();
  readonly total = input(1);
  readonly photo = input<File | null>(null);
  readonly submitted = input(false);

  readonly remove = output<void>();
  readonly photoChange = output<File | null>();

  @ViewChild('photoFileInput') private photoFileInput!: ElementRef<HTMLInputElement>;

  readonly photoPreviewUrl = signal<string | null>(null);
  private previousUrl: string | null = null;

  constructor(private readonly translate: TranslateService) {
    effect(() => {
      const file = this.photo();

      if (this.previousUrl) {
        URL.revokeObjectURL(this.previousUrl);
        this.previousUrl = null;
      }

      if (file) {
        this.previousUrl = URL.createObjectURL(file);
        this.photoPreviewUrl.set(this.previousUrl);
      } else {
        this.photoPreviewUrl.set(null);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.previousUrl) URL.revokeObjectURL(this.previousUrl);
  }

  // ── Input masks ────────────────────────────────────────────────────────────

  onPhoneInput(event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    this.group().get('phone')!.setValue(formatPhone(raw), { emitEvent: true });
  }

  // ── File input ─────────────────────────────────────────────────────────────

  onPhotoSelect(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    this.photoChange.emit(file);
  }

  onPhotoRemove(event: MouseEvent): void {
    event.stopPropagation();
    this.photoFileInput.nativeElement.value = '';
    this.photoChange.emit(null);
  }

  downloadPhoto(): void {
    const url = this.photoPreviewUrl();
    const file = this.photo();
    if (!url || !file) return;
    Object.assign(document.createElement('a'), { href: url, download: file.name }).click();
  }

  // ── Validation helpers ─────────────────────────────────────────────────────

  getError(controlName: string): string | null {
    return getControlError(this.group().get(controlName), this.submitted(), this.translate);
  }

  hasError(controlName: string): boolean {
    return !!this.getError(controlName);
  }

  get hasPhotoError(): boolean {
    return this.submitted() && !this.photo();
  }
}
