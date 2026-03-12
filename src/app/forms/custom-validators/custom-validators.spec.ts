import { describe, expect, it } from 'vitest';
import { FormControl } from '@angular/forms';
import { CustomValidators } from './custom-validators';

describe('CustomValidators', () => {
  describe('term', () => {
    it('should return required error if value is undefined', () => {
      const control = new FormControl(undefined);
      expect(CustomValidators.term(control)).toEqual({ required: true });
    });

    it('should return required error if value is null', () => {
      const control = new FormControl(null);
      expect(CustomValidators.term(control)).toEqual({ required: true });
    });

    it('should return required error if value is empty string', () => {
      const control = new FormControl('');
      expect(CustomValidators.term(control)).toEqual({ required: true });
    });

    it('should return invalid error if processed term is empty after trimming slashes', () => {
      const control = new FormControl('   /   ');
      expect(CustomValidators.term(control)).toEqual({ invalid: true });
    });

    it('should accept a valid email', () => {
      const control = new FormControl('user@example.com');
      expect(CustomValidators.term(control)).toBeNull();
    });

    it('should accept a valid code (alphanumeric 15 to 18 chars)', () => {
      const control = new FormControl('ABCDEF123456789');
      expect(CustomValidators.term(control)).toBeNull();
    });

    it('should accept an email-like string inside a path', () => {
      const control = new FormControl('something/user@example.com');
      expect(CustomValidators.term(control)).toBeNull();
    });

    it('should accept a code-like string inside a path', () => {
      const control = new FormControl('path/ABCDEF123456789');
      expect(CustomValidators.term(control)).toBeNull();
    });

    it('should sanitize non-email string and reject if not matching code pattern', () => {
      const control = new FormControl('invalid-input!');
      expect(CustomValidators.term(control)).toEqual({ term: true });
    });

    it('should reject if processed term does not match email or code', () => {
      const control = new FormControl('invalid!!');
      expect(CustomValidators.term(control)).toEqual({ term: true });
    });
  });
});
