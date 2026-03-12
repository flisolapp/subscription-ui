import { beforeEach, describe, expect, it } from 'vitest';
import { LocaleId } from './locale-id';
import { LanguageService } from '../../services/language/language-service';

describe('LocaleId', () => {
  let languageServiceMock: LanguageService;

  beforeEach(() => {
    languageServiceMock = {
      locale: 'en-US',
    } as LanguageService;
  });

  it('should create an instance of LocaleId', () => {
    const localeId = new LocaleId(languageServiceMock);
    expect(localeId).toBeDefined();
  });

  it('toString should return languageService.locale', () => {
    const localeId = new LocaleId(languageServiceMock);
    expect(localeId.toString()).toBe('en-US');
  });

  it('valueOf should return the same as toString', () => {
    const localeId = new LocaleId(languageServiceMock);
    expect(localeId.valueOf()).toBe('en-US');
  });

  it('should behave like a string when coerced', () => {
    const localeId = new LocaleId(languageServiceMock);
    expect(`${localeId}`).toBe('en-US');
  });
});
