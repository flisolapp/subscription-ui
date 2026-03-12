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
import { AbstractControl, FormGroup, ReactiveFormsModule, ValidationErrors } from '@angular/forms';
import { MatError, MatFormField, MatInput, MatLabel } from '@angular/material/input';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { CommonModule } from '@angular/common';

// ── Phone validator ───────────────────────────────────────────────────────────
export function phoneValidator(control: AbstractControl): ValidationErrors | null {
  const raw = (control.value ?? '').replace(/\D/g, '');
  if (!raw) return null;
  return raw.length >= 10 && raw.length <= 11 ? null : { phoneInvalid: true };
}

// ── Component ─────────────────────────────────────────────────────────────────
@Component({
  selector: 'app-speaker-card',
  imports: [
    CommonModule,
    ReactiveFormsModule,
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

  constructor() {
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

  // ── Phone mask ─────────────────────────────────────────────────────────────
  applyPhoneMask(event: Event): void {
    const el = event.target as HTMLInputElement;
    let v = el.value.replace(/\D/g, '').slice(0, 11);
    if (v.length > 10) v = `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`;
    else if (v.length > 6) v = `(${v.slice(0, 2)}) ${v.slice(2, 6)}-${v.slice(6)}`;
    else if (v.length > 2) v = `(${v.slice(0, 2)}) ${v.slice(2)}`;
    else if (v.length > 0) v = `(${v}`;
    this.group().get('phone')!.setValue(v, { emitEvent: true });
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
  hasError(controlName: string): boolean {
    return !!this.getError(controlName);
  }

  getError(controlName: string): string | null {
    const ctrl = this.group().get(controlName);
    if (!ctrl) return null;
    if (!this.submitted() && !ctrl.touched) return null;
    if (ctrl.hasError('required')) return 'Este campo é obrigatório.';
    if (ctrl.hasError('minlength'))
      return `Mínimo de ${ctrl.errors!['minlength'].requiredLength} caracteres.`;
    if (ctrl.hasError('email')) return 'Informe um e-mail válido.';
    if (ctrl.hasError('phoneInvalid')) return 'Número de telefone inválido.';
    return null;
  }

  get hasPhotoError(): boolean {
    return this.submitted() && !this.photo();
  }
}
