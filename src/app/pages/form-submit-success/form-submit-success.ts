import { Component, computed, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { PageStructure } from '../../components/page-structure/page-structure';

type FormType = 'participant' | 'speaker' | 'collaborator';

const TITLE_KEYS: Record<FormType, string> = {
  participant: 'formSuccess.titles.participant',
  speaker: 'formSuccess.titles.speaker',
  collaborator: 'formSuccess.titles.collaborator',
};

@Component({
  selector: 'app-form-submit-success',
  imports: [MatButton, MatIcon, TranslatePipe, PageStructure],
  templateUrl: './form-submit-success.html',
  styleUrl: './form-submit-success.scss',
})
export class FormSubmitSuccess implements OnInit {
  readonly formType = signal<FormType>('participant');
  readonly titleKey = computed(() => TITLE_KEYS[this.formType()]);

  constructor(private readonly router: Router) {}

  ngOnInit(): void {
    const stateType = history.state?.['type'] as FormType | undefined;
    if (stateType && stateType in TITLE_KEYS) {
      this.formType.set(stateType);
    }
  }

  onNewSubscription(): void {
    this.router.navigate(['/subscribe'], { replaceUrl: true });
  }
}
