import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
// import {MessageService, PrimeNGConfig} from 'primeng/api';
import { EventEmitterService } from '../event-emitter/event-emitter-service';

@Injectable({
  providedIn: 'root',
})
export class LanguageService {
  private static LANGUAGE_KEY: string = 'flisolapp.Language';
  public static LANGUAGES: any[] = [
    { name: 'English (USA)', code: 'en', flag: 'US' },
    { name: 'Español (España)', code: 'es', flag: 'ES' },
    { name: 'Português (Brasil)', code: 'pt-BR', flag: 'BR' },
  ];
  private selected: any = null;

  private _locale: string = 'en';

  set locale(value: string) {
    this._locale = value;
  }

  get locale(): string {
    return this._locale || 'en';
  }

  constructor(
    // private config: PrimeNGConfig,
    private translate: TranslateService,
    // private messageService: MessageService
  ) {}

  init(): void {
    // let language = window.navigator.userLanguage || window.navigator.language;
    const browserLang: string | undefined = this.translate.getBrowserLang();
    let language: string = 'en';

    if (browserLang !== undefined) {
      // console.log(browserLang);

      if (browserLang.substring(0, 2) === 'pt')
        //
        language = 'pt-BR';

      try {
        let slanguage: string | null = localStorage.getItem(LanguageService.LANGUAGE_KEY);

        if (slanguage !== null) {
          let oLanguage = JSON.parse(slanguage);
          language = oLanguage.code;
        }
      } catch (e) {
        // Do nothing.
      }

      for (
        let i = 0;
        i < LanguageService.LANGUAGES.length;
        i++ //
      )
        if (LanguageService.LANGUAGES[i].code === language)
          //
          this.selected = LanguageService.LANGUAGES[i];

      this.translate.addLangs(['en', 'pt-BR']);
      // this.translate.setDefaultLang('en');

      // this.translate.use(browserLang.match(/en|fr/) ? browserLang : 'en');
      this._locale = language;
      this.translate.use(language);
      this.translate.setDefaultLang(language);
      // this.translate.get('primeng').subscribe(res => this.config.setTranslation(res));
      localStorage.setItem(LanguageService.LANGUAGE_KEY, JSON.stringify(this.selected));
      EventEmitterService.get('set-language').emit(this.selected.code);
    }
  }

  getLanguages(): any[] {
    return LanguageService.LANGUAGES;
  }

  getSelected(): any {
    return this.selected;
  }

  setSelected(language: any): void {
    this.selected = language;
    // this.messageService.clear();
    this.translate.use(this.selected.code);
    // this.translate.get('primeng').subscribe(res => this.config.setTranslation(res));
    localStorage.setItem(LanguageService.LANGUAGE_KEY, JSON.stringify(this.selected));
    EventEmitterService.get('set-language').emit(this.selected.code);

    // // DONE: Only reloads because when change the language, the pipe Date doesn't updates
    // window.location.reload();
  }

  static getLanguageCode(): string {
    try {
      const slanguage: string | null = localStorage.getItem(LanguageService.LANGUAGE_KEY);
      // console.log(slanguage);

      if (slanguage !== null) {
        const language = JSON.parse(slanguage);
        // console.log(language);
        return language.code;
      }
    } catch (e) {
      // console.error(e);
      // Do nothing.
    }

    return '';
  }
}
