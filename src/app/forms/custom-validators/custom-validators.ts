import { AbstractControl, ValidationErrors } from '@angular/forms';

// ── Regex constants ───────────────────────────────────────────────────────────

/**
 * RFC-5321-aware e-mail regex ported from AngularJS (used internally by
 * Angular's own Validators.email). Kept here for the CustomValidators.term
 * validator which needs to distinguish e-mail from certificate codes.
 *
 * See: https://github.com/angular/angular/blob/main/packages/forms/src/validators.ts
 */
const EMAIL_REGEXP =
  /^(?=.{1,254}$)(?=.{1,64}@)[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/** 15–18 alphanumeric characters (certificate code format). */
const CODE_REGEXP = /^[A-Za-z0-9]{15,18}$/;

export class CustomValidators {
  /**
   * Validates a Brazilian CPF number.
   * Accepts both raw digits and the formatted NNN.NNN.NNN-NN string.
   * Returns null (valid) when the field is empty — pair with Validators.required
   * if the field is mandatory.
   */
  public static cpfValidator(control: AbstractControl): ValidationErrors | null {
    const raw = (control.value ?? '').replace(/\D/g, '');
    if (!raw) return null;
    if (raw.length !== 11 || /^(\d)\1{10}$/.test(raw)) return { cpfInvalid: true };

    let sum = 0;
    for (let i = 0; i < 9; i++) sum += +raw[i] * (10 - i);
    let r = (sum * 10) % 11;
    if (r === 10 || r === 11) r = 0;
    if (r !== +raw[9]) return { cpfInvalid: true };

    sum = 0;
    for (let i = 0; i < 10; i++) sum += +raw[i] * (11 - i);
    r = (sum * 10) % 11;
    if (r === 10 || r === 11) r = 0;
    return r !== +raw[10] ? { cpfInvalid: true } : null;
  }

  /**
   * Validates a Brazilian phone number (10 or 11 digits).
   * Accepts both raw digits and masked input like (DD) NNNNN-NNNN.
   * Returns null (valid) when the field is empty.
   */
  public static phoneValidator(control: AbstractControl): ValidationErrors | null {
    const raw = (control.value ?? '').replace(/\D/g, '');
    if (!raw) return null;
    return raw.length >= 10 && raw.length <= 11 ? null : { phoneInvalid: true };
  }
}
