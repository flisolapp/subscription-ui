import { Component, OnInit, signal } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIcon } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { LanguageService } from '../../services/language/language-service';

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
  public language = signal<any>(null);

  constructor(public languageService: LanguageService) {}

  public ngOnInit(): void {
    this.detectAndLoadColorScheme();
    this.language.set(this.languageService.getSelected());
  }

  public detectAndLoadColorScheme(): void {
    let isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    const darkModeFromStorage = localStorage.getItem('flisolapp.DarkMode');
    if (darkModeFromStorage !== null) {
      isDark = darkModeFromStorage === 'true';
    }

    this.darkMode.set(isDark);
    this.applyColorScheme();
  }

  public toggleColorScheme(): void {
    this.darkMode.update((value) => !value);
    localStorage.setItem('flisolapp.DarkMode', this.darkMode() ? 'true' : 'false');
    this.applyColorScheme();
  }

  private applyColorScheme(): void {
    const darkClassName = 'darkMode';

    if (this.darkMode()) {
      document.body.classList.add(darkClassName);
    } else {
      document.body.classList.remove(darkClassName);
    }

    if (window.flutter_inappwebview) {
      window.flutter_inappwebview.callHandler('setDarkMode', this.darkMode());
    }
  }

  public selectLanguage(item: any): void {
    this.language.set(item);
    this.languageService.setSelected(item);
  }
}
