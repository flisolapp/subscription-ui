import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';

import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';

import { routes } from './app.routes';
import { MatIconRegistry } from '@angular/material/icon';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(),

    provideTranslateService({
      fallbackLang: 'en',
      loader: provideTranslateHttpLoader({
        prefix: './assets/i18n/',
        suffix: '.json',
      }),
    }),

    provideAppInitializer(() => {
      const iconRegistry = inject(MatIconRegistry);
      // iconRegistry.setDefaultFontSetClass('material-symbols-outlined');
      // iconRegistry.registerFontClassAlias('material-icons', 'material-icons');
      iconRegistry.registerFontClassAlias('outlined', 'material-symbols-outlined');
    }),
  ],
};
