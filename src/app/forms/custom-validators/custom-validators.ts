import { AbstractControl, ValidationErrors } from '@angular/forms';

/**
 * A regular expression that matches valid e-mail addresses.
 *
 * At a high level, this regexp matches e-mail addresses of the format `local-part@tld`, where:
 * - `local-part` consists of one or more of the allowed characters (alphanumeric and some
 *   punctuation symbols).
 * - `local-part` cannot begin or end with a period (`.`).
 * - `local-part` cannot be longer than 64 characters.
 * - `tld` consists of one or more `labels` separated by periods (`.`). For example `localhost` or
 *   `foo.com`.
 * - A `label` consists of one or more of the allowed characters (alphanumeric, dashes (`-`) and
 *   periods (`.`)).
 * - A `label` cannot begin or end with a dash (`-`) or a period (`.`).
 * - A `label` cannot be longer than 63 characters.
 * - The whole address cannot be longer than 254 characters.
 *
 * ## Implementation background
 *
 * This regexp was ported over from AngularJS (see there for git history):
 * https://github.com/angular/angular.js/blob/c133ef836/src/ng/directive/input.js#L27
 * It is based on the
 * [WHATWG version](https://html.spec.whatwg.org/multipage/input.html#valid-e-mail-address) with
 * some enhancements to incorporate more RFC rules (such as rules related to domain names and the
 * lengths of different parts of the address). The main differences from the WHATWG version are:
 *   - Disallow `local-part` to begin or end with a period (`.`).
 *   - Disallow `local-part` length to exceed 64 characters.
 *   - Disallow total address length to exceed 254 characters.
 *
 * See [this commit](https://github.com/angular/angular.js/commit/f3f5cf72e) for more details.
 * See [validators.ts](https://github.com/angular/angular/blob/main/packages/forms/src/validators.ts) for more details.
 */
const EMAIL_REGEXP: RegExp =
  /^(?=.{1,254}$)(?=.{1,64}@)[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/**
 * Define a function to check if a string is a valid code.
 * This uses a regular expression to match a string of 15 to 18 alphanumeric characters.
 */
const CODE_REGEXP: RegExp = /^[A-Za-z0-9]{15,18}$/;

export class CustomValidators {
  static term(control: AbstractControl): ValidationErrors | null {
    // Check if the term is null, undefined, or an empty string and throw an error if any.
    // This ensures that we have a valid, non-empty string to process.
    if (control.value === undefined || control.value === null || control.value.trim() === '') {
      // throw new EvalError('The term is invalid to search. It is required.', {cause: -1});
      return { required: true };
    }

    // Process the term to extract the last segment after the last '/' character.
    // This is useful for cases where the term might be part of a URL or path-like string.
    let processedTerm: string = control.value.substring(control.value.lastIndexOf('/') + 1).trim();

    // Further validate the processed term to ensure it's not an empty string.
    // Throw an error if the processed term is empty after trimming.
    if (processedTerm === undefined || processedTerm === null || processedTerm === '') {
      // throw new EvalError('The term is invalid to search.', {cause: -2});
      return { invalid: true };
    }

    // Convert the term to lowercase if it's an email to ensure consistency.
    // If it's not an email, remove all non-alphanumeric characters to sanitize the term.
    if (EMAIL_REGEXP.test(control.value)) {
      processedTerm = processedTerm.toLowerCase();
    } else {
      processedTerm = processedTerm.replace(/[^a-zA-Z0-9]/g, '');
    }

    // Ensure the term is either a valid email or code.
    // If it doesn't fit either pattern, throw an error indicating the term is invalid.
    if (!EMAIL_REGEXP.test(processedTerm) && !CODE_REGEXP.test(processedTerm)) {
      // throw new EvalError('The term is invalid to search. Must be an e-mail or certificate\'s code.', //
      //   {cause: -3});
      return { term: true };
    }

    // Return null if it's valid.
    return null;
  }
}
