import { TestBed } from '@angular/core/testing';
import { LOCALE_ID, provideZonelessChangeDetection } from '@angular/core';
import { beforeEach, describe, expect, it } from 'vitest';

import { LanguageProvider } from './language-provider';
import { LanguageService } from '../../services/language/language-service';
import { LocaleId } from './locale-id';

describe('LanguageProvider', () => {
  beforeEach(() => {
    const languageServiceMock = { locale: 'pt-BR' } as LanguageService;

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        LanguageProvider,
        { provide: LanguageService, useValue: languageServiceMock },
      ],
    });
  });

  it('should provide LOCALE_ID using LocaleId class', () => {
    const localeId = TestBed.inject(LOCALE_ID);

    expect(localeId).toBeInstanceOf(LocaleId);
    expect(String(localeId)).toBe('pt-BR');
  });
});
