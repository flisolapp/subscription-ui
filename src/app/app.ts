import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LanguageService } from './services/language/language-service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected title = 'subscription-ui';

  constructor(private languageService: LanguageService) {
    languageService.init();
  }
}
