import { LanguageService } from '../../services/language/language-service';

export class LocaleId extends String {
  constructor(private languageService: LanguageService) {
    super();
  }

  override toString(): string {
    return this.languageService.locale;
  }

  override valueOf(): string {
    return this.toString();
  }
}
