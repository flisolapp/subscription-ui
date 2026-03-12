import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

export function createTranslateTestingModule() {
  return TranslateModule.forRoot({
    loader: {
      provide: TranslateLoader,
      useValue: {
        /* v8 ignore next -- @preserve */
        getTranslation: () => of({}),
      },
    },
  });
}
