import { LOCALE_ID, Provider } from '@angular/core';
import { LocaleId } from './locale-id';
import { LanguageService } from '../../services/language/language-service';

export const LanguageProvider: Provider = {
  provide: LOCALE_ID,
  useClass: LocaleId,
  deps: [LanguageService],
};
