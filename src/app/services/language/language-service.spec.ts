import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageService } from './language-service';
import { TranslateService } from '@ngx-translate/core';
import { EventEmitterService } from '../event-emitter/event-emitter-service';

type TranslateServiceMock = {
  getBrowserLang: ReturnType<typeof vi.fn>;
  addLangs: ReturnType<typeof vi.fn>;
  use: ReturnType<typeof vi.fn>;
  setDefaultLang: ReturnType<typeof vi.fn>;
};

describe('LanguageService', () => {
  let service: LanguageService;
  let translateServiceMock: TranslateServiceMock;
  let eventEmitterSpy: { emit: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    translateServiceMock = {
      getBrowserLang: vi.fn(),
      addLangs: vi.fn(),
      use: vi.fn(),
      setDefaultLang: vi.fn(),
    };

    eventEmitterSpy = { emit: vi.fn() };

    vi.spyOn(EventEmitterService, 'get').mockReturnValue(eventEmitterSpy as any);

    service = new LanguageService(translateServiceMock as unknown as TranslateService);

    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create the service', () => {
    expect(service).toBeDefined();
  });

  describe('locale getter and setter', () => {
    it('should set and get locale', () => {
      service.locale = 'pt-BR';
      expect(service.locale).toBe('pt-BR');
    });

    it('should return default "en" if locale is falsy', () => {
      (service as any)._locale = '';
      expect(service.locale).toBe('en');
    });
  });

  describe('getLanguages', () => {
    it('should return available languages', () => {
      const langs = service.getLanguages();

      expect(langs).toHaveLength(3);
      expect(langs[0].code).toBe('en');
    });
  });

  describe('init', () => {
    it('should initialize language from browserLang pt', () => {
      translateServiceMock.getBrowserLang.mockReturnValue('pt');

      service.init();

      expect(translateServiceMock.addLangs).toHaveBeenCalledWith(['en', 'pt-BR']);
      expect(translateServiceMock.use).toHaveBeenCalledWith('pt-BR');
      expect(translateServiceMock.setDefaultLang).toHaveBeenCalledWith('pt-BR');

      expect(localStorage.getItem('flisolapp.Language')).toContain('"code":"pt-BR"');
      expect(eventEmitterSpy.emit).toHaveBeenCalledWith('pt-BR');
    });

    it('should initialize language from saved localStorage (overrides browser)', () => {
      const savedLang = { name: 'Español (España)', code: 'es', flag: 'ES' };
      localStorage.setItem('flisolapp.Language', JSON.stringify(savedLang));

      translateServiceMock.getBrowserLang.mockReturnValue('en');

      service.init();

      expect(translateServiceMock.use).toHaveBeenCalledWith('es');
      expect(eventEmitterSpy.emit).toHaveBeenCalledWith('es');
      expect((service as any)._locale).toBe('es');
    });

    it('should handle malformed localStorage gracefully', () => {
      localStorage.setItem('flisolapp.Language', 'invalid-json');
      translateServiceMock.getBrowserLang.mockReturnValue('en');

      expect(() => service.init()).not.toThrow();
      expect(translateServiceMock.use).toHaveBeenCalledWith('en');
      expect(eventEmitterSpy.emit).toHaveBeenCalledWith('en');
    });

    it('should not initialize if getBrowserLang returns undefined', () => {
      translateServiceMock.getBrowserLang.mockReturnValue(undefined);

      service.init();

      expect(translateServiceMock.addLangs).not.toHaveBeenCalled();
      expect(translateServiceMock.use).not.toHaveBeenCalled();
      expect(eventEmitterSpy.emit).not.toHaveBeenCalled();
    });

    it('should select the matching language object and store it', () => {
      translateServiceMock.getBrowserLang.mockReturnValue('pt');

      service.init();

      const stored = localStorage.getItem('flisolapp.Language');
      expect(stored).not.toBeNull();

      const parsed = JSON.parse(stored!);
      expect(parsed.code).toBe('pt-BR');
      expect(service.getSelected()?.code).toBe('pt-BR');
    });
  });

  describe('getSelected and setSelected', () => {
    it('should return selected language', () => {
      (service as any).selected = { code: 'en' };
      expect(service.getSelected()).toEqual({ code: 'en' });
    });

    it('should set selected language and emit event', () => {
      const lang = { code: 'es', name: 'Español', flag: 'ES' };

      service.setSelected(lang);

      expect(translateServiceMock.use).toHaveBeenCalledWith('es');
      expect(localStorage.getItem('flisolapp.Language')).toContain('"code":"es"');
      expect(eventEmitterSpy.emit).toHaveBeenCalledWith('es');
    });
  });

  describe('getLanguageCode (static)', () => {
    it('should return code from localStorage', () => {
      localStorage.setItem('flisolapp.Language', JSON.stringify({ code: 'pt-BR' }));
      expect(LanguageService.getLanguageCode()).toBe('pt-BR');
    });

    it('should return empty string if no language saved', () => {
      expect(LanguageService.getLanguageCode()).toBe('');
    });

    it('should handle invalid JSON gracefully', () => {
      localStorage.setItem('flisolapp.Language', 'invalid-json');
      expect(LanguageService.getLanguageCode()).toBe('');
    });
  });
});
