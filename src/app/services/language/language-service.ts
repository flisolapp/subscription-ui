import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { EventEmitterService } from '../event-emitter/event-emitter-service';
import { STORAGE_KEYS } from '../../constants/storage-keys';

// ── Language model ────────────────────────────────────────────────────────────

export interface Language {
  name: string;
  code: string;
  flag?: string;
}

// ── Supported languages ───────────────────────────────────────────────────────

const SUPPORTED_LANGUAGES: Language[] = [
  { name: 'English (USA)', code: 'en', flag: 'US' },
  { name: 'Español (España)', code: 'es', flag: 'ES' },
  { name: 'Português (Brasil)', code: 'pt-BR', flag: 'BR' },
];

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable({
  providedIn: 'root',
})
export class LanguageService {
  private selected: Language | null = null;
  private _locale = 'en';

  constructor(private readonly translate: TranslateService) {}

  get locale(): string {
    return this._locale;
  }

  set locale(value: string) {
    this._locale = value;
  }

  // ── Initialisation ─────────────────────────────────────────────────────────

  init(): void {
    const browserLang = this.translate.getBrowserLang();
    if (!browserLang) return;

    let code = browserLang.startsWith('pt') ? 'pt-BR' : 'en';

    const stored = this.loadStoredLanguage();
    if (stored) code = stored.code;

    this.selected = SUPPORTED_LANGUAGES.find((l) => l.code === code) ?? SUPPORTED_LANGUAGES[0];

    this.translate.addLangs(['en', 'pt-BR']);
    this.translate.use(this.selected.code);
    this.translate.setDefaultLang(this.selected.code);

    this._locale = this.selected.code;

    this.persistSelected();
    EventEmitterService.get('set-language').emit(this.selected.code);
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  getLanguages(): Language[] {
    return SUPPORTED_LANGUAGES;
  }

  getSelected(): Language | null {
    return this.selected;
  }

  setSelected(language: Language): void {
    this.selected = language;
    this.translate.use(language.code);
    this._locale = language.code;
    this.persistSelected();
    EventEmitterService.get('set-language').emit(language.code);
  }

  // ── Static helper ──────────────────────────────────────────────────────────

  /** Reads the persisted language code without instantiating the service. */
  static getLanguageCode(): string {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.LANGUAGE);
      if (raw) {
        const lang = JSON.parse(raw) as Language;
        return lang.code ?? '';
      }
    } catch {
      // Silently ignore parse errors
    }
    return '';
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private loadStoredLanguage(): Language | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.LANGUAGE);
      return raw ? (JSON.parse(raw) as Language) : null;
    } catch {
      return null;
    }
  }

  private persistSelected(): void {
    if (this.selected) {
      localStorage.setItem(STORAGE_KEYS.LANGUAGE, JSON.stringify(this.selected));
    }
  }
}
