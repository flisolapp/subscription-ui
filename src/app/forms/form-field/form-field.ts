/**
 * form-field.utils.ts
 *
 * Pure, framework-agnostic helpers shared across all subscription form
 * components. Extracting them here eliminates the copy-paste duplication of
 * getError / hasError, autocomplete filter logic, input masks and the
 * displayLabel factory that previously lived inside every form component.
 *
 * None of these functions carry side-effects or depend on Angular DI — they
 * are plain functions that are easy to unit-test in isolation.
 */

import { AbstractControl } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { SelectOption } from '../../constants/form-options';

// ── Error resolution ──────────────────────────────────────────────────────────

/**
 * Returns the first translated error message for a control, or null when the
 * field is valid or has not yet been interacted with.
 *
 * @param ctrl        The reactive form control to inspect.
 * @param isSubmitted Whether the parent form has been submitted (shows errors
 *                    even on untouched fields after the user clicks Submit).
 * @param translate   The TranslateService instance from the host component.
 * @param extraErrors Optional map of Angular error-key → i18n key for errors
 *                    that are specific to a single control (e.g. cpfInvalid).
 *                    Evaluated after the common error set.
 */
export function getControlError(
  ctrl: AbstractControl | null,
  isSubmitted: boolean,
  translate: TranslateService,
  extraErrors: Record<string, string> = {},
): string | null {
  if (!ctrl) return null;
  if (!isSubmitted && !ctrl.touched) return null;

  if (ctrl.hasError('required')) return translate.instant('common.required');

  if (ctrl.hasError('minlength'))
    return translate.instant('common.minLength', {
      min: ctrl.errors!['minlength'].requiredLength,
    });

  if (ctrl.hasError('email')) return translate.instant('common.invalidEmail');
  if (ctrl.hasError('phoneInvalid')) return translate.instant('common.invalidPhone');

  for (const [errorKey, i18nKey] of Object.entries(extraErrors)) {
    if (ctrl.hasError(errorKey)) return translate.instant(i18nKey);
  }

  return null;
}

/** Convenience boolean wrapper around getControlError. */
export function hasControlError(
  ctrl: AbstractControl | null,
  isSubmitted: boolean,
  translate: TranslateService,
  extraErrors: Record<string, string> = {},
): boolean {
  return !!getControlError(ctrl, isSubmitted, translate, extraErrors);
}

// ── Autocomplete helpers ──────────────────────────────────────────────────────

/**
 * Filters a SelectOption list by value or plain-text label.
 * Returns the full list when the query is empty or already matches an exact
 * option value (i.e. after the user has selected an item).
 */
export function filterOptions(val: string, list: SelectOption[]): SelectOption[] {
  if (!val || list.some((o) => o.value === val)) return list;
  const q = val.toLowerCase();
  return list.filter((o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q));
}

/**
 * Filters a SelectOption list by the *translated* label text, falling back to
 * value matching. Used for lists whose labels are i18n keys (TEMAS, TURNOS…).
 */
export function filterTranslatedOptions(
  val: string,
  list: SelectOption[],
  translate: TranslateService,
): SelectOption[] {
  if (!val || list.some((o) => o.value === val)) return list;
  const q = val.toLowerCase();
  return list.filter((o) => {
    const translated = translate.instant(o.label).toLowerCase();
    return translated.includes(q) || o.value.toLowerCase().includes(q);
  });
}

/**
 * Returns a display function for mat-autocomplete's [displayWith] binding.
 * Resolves the stored value back to a human-readable label, running it through
 * TranslateService for option lists that use i18n keys as labels.
 */
export function buildDisplayLabel(
  options: SelectOption[],
  translate: TranslateService,
): (value: string) => string {
  return (value: string): string => {
    const found = options.find((o) => o.value === value);
    if (!found) return value ?? '';
    return translate.instant(found.label);
  };
}

// ── Input masks ───────────────────────────────────────────────────────────────

/**
 * Formats a raw digit string (already stripped of non-digits) as a Brazilian
 * phone number: (DD) NNNNN-NNNN or (DD) NNNN-NNNN.
 *
 * Usage in a component:
 *   onPhoneInput(event: Event): void {
 *     const raw = (event.target as HTMLInputElement).value;
 *     const formatted = formatPhone(raw);
 *     this.form.get('phone')!.setValue(formatted, { emitEvent: false });
 *   }
 */
export function formatPhone(raw: string): string {
  let v = raw.replace(/\D/g, '').slice(0, 11);
  if (v.length > 10) return `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`;
  if (v.length > 6) return `(${v.slice(0, 2)}) ${v.slice(2, 6)}-${v.slice(6)}`;
  if (v.length > 2) return `(${v.slice(0, 2)}) ${v.slice(2)}`;
  if (v.length > 0) return `(${v}`;
  return v;
}

/**
 * Formats a raw digit string as a Brazilian CPF: NNN.NNN.NNN-NN.
 *
 * Usage in a component:
 *   onCpfInput(event: Event): void {
 *     const raw = (event.target as HTMLInputElement).value;
 *     const formatted = formatCpf(raw);
 *     this.form.get('federalCode')!.setValue(formatted, { emitEvent: false });
 *   }
 */
export function formatCpf(raw: string): string {
  let v = raw.replace(/\D/g, '').slice(0, 11);
  if (v.length > 9) return `${v.slice(0, 3)}.${v.slice(3, 6)}.${v.slice(6, 9)}-${v.slice(9)}`;
  if (v.length > 6) return `${v.slice(0, 3)}.${v.slice(3, 6)}.${v.slice(6)}`;
  if (v.length > 3) return `${v.slice(0, 3)}.${v.slice(3)}`;
  return v;
}
