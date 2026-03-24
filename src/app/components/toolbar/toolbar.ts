import { Component, OnInit, signal } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIcon } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { Language, LanguageService } from '../../services/language/language-service';
import { STORAGE_KEYS } from '../../constants/storage-keys';

@Component({
  selector: 'app-toolbar',
  imports: [
    NgOptimizedImage,
    MatIconButton,
    MatTooltip,
    MatIcon,
    TranslatePipe,
    MatMenuTrigger,
    MatMenu,
    MatMenuItem,
  ],
  templateUrl: './toolbar.html',
  styleUrl: './toolbar.scss',
})
export class Toolbar implements OnInit {
  /* v8 ignore next -- @preserve */
  public darkMode = signal<boolean>(false);
  /* v8 ignore next -- @preserve */
  public language = signal<Language | null>(null);

  constructor(public readonly languageService: LanguageService) {}

  public ngOnInit(): void {
    this.detectAndLoadColorScheme();
    this.language.set(this.languageService.getSelected());
  }

  public detectAndLoadColorScheme(): void {
    let isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    const stored = localStorage.getItem(STORAGE_KEYS.DARK_MODE);
    if (stored !== null) {
      isDark = stored === 'true';
    }

    this.darkMode.set(isDark);
    this.applyColorScheme();
  }

  public toggleColorScheme(): void {
    this.darkMode.update((value) => !value);
    localStorage.setItem(STORAGE_KEYS.DARK_MODE, String(this.darkMode()));
    this.applyColorScheme();
  }

  public selectLanguage(item: Language): void {
    this.language.set(item);
    this.languageService.setSelected(item);
  }

  private applyColorScheme(): void {
    document.body.classList.toggle('darkMode', this.darkMode());

    if (window.flutter_inappwebview) {
      window.flutter_inappwebview.callHandler('setDarkMode', this.darkMode());
    }
  }

  // public throwTestError(): void {
  //   throw new Error('Sentry Test Error');
  // }
}
