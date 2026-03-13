import { Component, input, signal } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';

export interface NavItem {
  label: string;
  hasError: boolean;
  anchorId: string;
}

@Component({
  selector: 'app-speaker-form-nav',
  imports: [CommonModule, TranslatePipe, MatIcon],
  templateUrl: './speaker-form-nav.html',
  styleUrl: './speaker-form-nav.scss',
})
export class SpeakerFormNav {
  readonly speakerItems = input<NavItem[]>([]);
  readonly talkItems = input<NavItem[]>([]);

  readonly mobileOpen = signal(false);

  get hasAnyError(): boolean {
    return this.speakerItems().some((i) => i.hasError) || this.talkItems().some((i) => i.hasError);
  }

  scrollTo(anchorId: string): void {
    document.getElementById(anchorId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    this.mobileOpen.set(false);
  }

  toggleMobile(): void {
    this.mobileOpen.update((v) => !v);
  }
}
