import { Routes } from '@angular/router';
import { SubscriptionChoice } from './pages/subscription-choice/subscription-choice';
import { FormParticipant } from './pages/form-participant/form-participant';
import { FormSpeaker } from './pages/form-speaker/form-speaker';
import { FormCollaborator } from './pages/form-collaborator/form-collaborator';
import { FormReview } from './pages/form-review/form-review';
import { FormSubmitSuccess } from './pages/form-submit-success/form-submit-success';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'subscribe',
    pathMatch: 'full',
  },
  {
    path: 'subscribe',
    children: [
      {
        path: '',
        component: SubscriptionChoice,
      },
      {
        path: 'success',
        component: FormSubmitSuccess,
      },
      {
        path: 'participant',
        children: [
          { path: '', component: FormParticipant },
          { path: 'review', component: FormReview },
        ],
      },
      {
        path: 'speaker',
        children: [
          { path: '', component: FormSpeaker },
          { path: 'review', component: FormReview },
        ],
      },
      {
        path: 'collaborator',
        children: [
          { path: '', component: FormCollaborator },
          { path: 'review', component: FormReview },
        ],
      },
    ],
  },
];
