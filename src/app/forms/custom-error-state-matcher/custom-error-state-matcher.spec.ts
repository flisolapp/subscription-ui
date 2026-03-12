import { describe, expect, it } from 'vitest';
import { FormControl } from '@angular/forms';
import { CustomErrorStateMatcher } from './custom-error-state-matcher';

describe('CustomErrorStateMatcher', () => {
  const matcher = new CustomErrorStateMatcher();

  it('should create an instance', () => {
    expect(matcher).toBeDefined();
  });

  it('should return false if control is null', () => {
    expect(matcher.isErrorState(null, null)).toBe(false);
  });

  it('should return false if control is valid', () => {
    const control = new FormControl('valid');
    expect(matcher.isErrorState(control, null)).toBe(false);
  });

  it('should return true if control is invalid and dirty', () => {
    const control = new FormControl('', { nonNullable: true });
    control.setErrors({ required: true });
    control.markAsDirty();

    expect(matcher.isErrorState(control, null)).toBe(true);
  });

  it('should return true if control is invalid and touched', () => {
    const control = new FormControl('');
    control.setErrors({ required: true });
    control.markAsTouched();

    expect(matcher.isErrorState(control, null)).toBe(true);
  });

  it('should return true if control is invalid and form is submitted', () => {
    const control = new FormControl('');
    control.setErrors({ required: true });

    const formMock = { submitted: true } as any;

    expect(matcher.isErrorState(control, formMock)).toBe(true);
  });

  it('should return false if control is invalid but untouched, pristine, and form not submitted', () => {
    const control = new FormControl('');
    control.setErrors({ required: true });

    const formMock = { submitted: false } as any;

    expect(matcher.isErrorState(control, formMock)).toBe(false);
  });
});
