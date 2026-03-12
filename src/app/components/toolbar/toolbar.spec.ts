import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Toolbar } from './toolbar';
import { LanguageService } from '../../services/language/language-service';

declare global {
  interface Window {
    flutter_inappwebview?: {
      callHandler(name: string, ...args: any[]): Promise<any>;
    };
  }
}

describe('Toolbar', () => {
  let component: Toolbar;
  let fixture: ComponentFixture<Toolbar>;

  let languageServiceMock: {
    getSelected: ReturnType<typeof vi.fn>;
    setSelected: ReturnType<typeof vi.fn>;
    getLanguages: ReturnType<typeof vi.fn>;
  };

  const originalMatchMedia = window.matchMedia;
  const originalFlutter = window.flutter_inappwebview;

  beforeEach(async () => {
    languageServiceMock = {
      getSelected: vi.fn().mockReturnValue({
        code: 'en',
        name: 'English',
        flag: 'EN',
      }),
      setSelected: vi.fn(),
      getLanguages: vi.fn().mockReturnValue([
        { code: 'en', name: 'English', flag: 'EN' },
        { code: 'pt-BR', name: 'Português', flag: 'BR' },
      ]),
    };

    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      media: '(prefers-color-scheme: dark)',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as MediaQueryList);

    localStorage.clear();
    delete window.flutter_inappwebview;
    document.body.classList.remove('darkMode');

    await TestBed.configureTestingModule({
      imports: [Toolbar],
      providers: [
        provideZonelessChangeDetection(),
        { provide: LanguageService, useValue: languageServiceMock },
      ],
    })
      .overrideComponent(Toolbar, {
        set: { template: '' },
      })
      .compileComponents();

    fixture = TestBed.createComponent(Toolbar);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    window.flutter_inappwebview = originalFlutter;
    localStorage.clear();
    document.body.classList.remove('darkMode');
    vi.restoreAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should call detectAndLoadColorScheme and set selected language on detectChanges', () => {
      const detectSpy = vi.spyOn(component, 'detectAndLoadColorScheme');

      fixture.detectChanges();

      expect(detectSpy).toHaveBeenCalledTimes(1);
      expect(languageServiceMock.getSelected).toHaveBeenCalledTimes(1);
      expect(component.language()).toEqual({
        code: 'en',
        name: 'English',
        flag: 'EN',
      });
    });
  });

  describe('detectAndLoadColorScheme', () => {
    it('should use system preference when localStorage is empty', () => {
      window.matchMedia = vi.fn().mockReturnValue({
        matches: true,
      } as MediaQueryList);

      const applySpy = vi.spyOn(component as any, 'applyColorScheme').mockImplementation(() => {});

      localStorage.removeItem('flisolapp.DarkMode');

      component.detectAndLoadColorScheme();

      expect(component.darkMode()).toBe(true);
      expect(applySpy).toHaveBeenCalledTimes(1);
    });

    it('should override system preference with localStorage false', () => {
      window.matchMedia = vi.fn().mockReturnValue({
        matches: true,
      } as MediaQueryList);

      const applySpy = vi.spyOn(component as any, 'applyColorScheme').mockImplementation(() => {});

      localStorage.setItem('flisolapp.DarkMode', 'false');

      component.detectAndLoadColorScheme();

      expect(component.darkMode()).toBe(false);
      expect(applySpy).toHaveBeenCalledTimes(1);
    });

    it('should override system preference with localStorage true', () => {
      window.matchMedia = vi.fn().mockReturnValue({
        matches: false,
      } as MediaQueryList);

      const applySpy = vi.spyOn(component as any, 'applyColorScheme').mockImplementation(() => {});

      localStorage.setItem('flisolapp.DarkMode', 'true');

      component.detectAndLoadColorScheme();

      expect(component.darkMode()).toBe(true);
      expect(applySpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('toggleColorScheme', () => {
    it('should toggle from false to true and persist in localStorage', () => {
      const applySpy = vi.spyOn(component as any, 'applyColorScheme').mockImplementation(() => {});

      component.darkMode.set(false);

      component.toggleColorScheme();

      expect(component.darkMode()).toBe(true);
      expect(localStorage.getItem('flisolapp.DarkMode')).toBe('true');
      expect(applySpy).toHaveBeenCalledTimes(1);
    });

    it('should toggle from true to false and persist in localStorage', () => {
      const applySpy = vi.spyOn(component as any, 'applyColorScheme').mockImplementation(() => {});

      component.darkMode.set(true);

      component.toggleColorScheme();

      expect(component.darkMode()).toBe(false);
      expect(localStorage.getItem('flisolapp.DarkMode')).toBe('false');
      expect(applySpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('applyColorScheme', () => {
    it('should add darkMode class and notify Flutter when dark mode is enabled', () => {
      const callHandler = vi.fn().mockResolvedValue(undefined);
      window.flutter_inappwebview = { callHandler };

      const addSpy = vi.spyOn(document.body.classList, 'add');

      component.darkMode.set(true);
      component['applyColorScheme']();

      expect(addSpy).toHaveBeenCalledWith('darkMode');
      expect(callHandler).toHaveBeenCalledWith('setDarkMode', true);
    });

    it('should remove darkMode class and notify Flutter when dark mode is disabled', () => {
      const callHandler = vi.fn().mockResolvedValue(undefined);
      window.flutter_inappwebview = { callHandler };

      const removeSpy = vi.spyOn(document.body.classList, 'remove');

      component.darkMode.set(false);
      component['applyColorScheme']();

      expect(removeSpy).toHaveBeenCalledWith('darkMode');
      expect(callHandler).toHaveBeenCalledWith('setDarkMode', false);
    });

    it('should not throw when Flutter bridge is not available and dark mode is enabled', () => {
      component.darkMode.set(true);

      expect(() => component['applyColorScheme']()).not.toThrow();
      expect(document.body.classList.contains('darkMode')).toBe(true);
    });

    it('should not throw when Flutter bridge is not available and dark mode is disabled', () => {
      document.body.classList.add('darkMode');
      component.darkMode.set(false);

      expect(() => component['applyColorScheme']()).not.toThrow();
      expect(document.body.classList.contains('darkMode')).toBe(false);
    });
  });

  describe('selectLanguage', () => {
    it('should set language and call languageService.setSelected', () => {
      const lang = {
        code: 'pt-BR',
        name: 'Português',
        flag: 'BR',
      };

      component.selectLanguage(lang);

      expect(component.language()).toEqual(lang);
      expect(languageServiceMock.setSelected).toHaveBeenCalledTimes(1);
      expect(languageServiceMock.setSelected).toHaveBeenCalledWith(lang);
    });
  });
});
