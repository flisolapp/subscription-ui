import { Component, computed, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { PageStructure } from '../../components/page-structure/page-structure';

type FormType = 'participant' | 'speaker' | 'collaborator';

const TITLES: Record<FormType, string> = {
  participant: 'Inscreva-se',
  speaker: 'Submissão de palestras',
  collaborator: 'Quero colaborar',
};

@Component({
  selector: 'app-form-submit-success',
  imports: [MatButton, MatIcon, PageStructure],
  templateUrl: './form-submit-success.html',
  styleUrl: './form-submit-success.scss',
})
export class FormSubmitSuccess implements OnInit {
  readonly formType = signal<FormType>('participant');
  readonly title = computed(() => TITLES[this.formType()]);

  constructor(private readonly router: Router) {}

  ngOnInit(): void {
    // Form type is passed via router navigation state from FormReview
    const stateType = history.state?.['type'] as FormType | undefined;
    if (stateType && stateType in TITLES) {
      this.formType.set(stateType);
    }
  }

  onNewSubscription(): void {
    this.router.navigate(['/subscribe'], { replaceUrl: true });
  }
}
