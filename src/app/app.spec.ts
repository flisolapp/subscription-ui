import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { App } from './app';
import { LanguageService } from './services/language/language-service';

import { createTranslateTestingModule } from './tests/translate-testing.module';

describe('App', () => {
  let languageServiceMock: { init: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    languageServiceMock = {
      init: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [App, RouterOutlet, createTranslateTestingModule()],
      providers: [
        provideZonelessChangeDetection(),
        { provide: LanguageService, useValue: languageServiceMock },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should call languageService.init()', () => {
    TestBed.createComponent(App);
    expect(languageServiceMock.init).toHaveBeenCalledTimes(1);
  });
});
