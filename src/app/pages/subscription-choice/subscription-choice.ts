import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { PageStructure } from '../../components/page-structure/page-structure';
import { TranslatePipe } from '@ngx-translate/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatIcon } from '@angular/material/icon';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { FormStorageService } from '../../services/form-storage/form-storage-service';
import { SubscriptionType } from '../../models/subscription-type/subscription-type';
import {
  ResumeSubscriptionDialog,
  ResumeSubscriptionDialogData,
} from './resume-subscription-dialog/resume-subscription-dialog';
import { ConfirmClearDialog } from './confirm-clear-dialog/confirm-clear-dialog';

@Component({
  selector: 'app-subscription-choice',
  encapsulation: ViewEncapsulation.None,
  imports: [PageStructure, TranslatePipe, ReactiveFormsModule, MatIcon, FormsModule],
  templateUrl: './subscription-choice.html',
  styleUrl: './subscription-choice.scss',
})
export class SubscriptionChoice implements OnInit {
  public cards = [
    {
      type: 'participant' as const,
      icon: 'person',
      titleKey: 'subscriptionChoice.cards.participant.title',
      descriptionKey: 'subscriptionChoice.cards.participant.description',
      path: 'participant',
    },
    {
      type: 'speaker' as const,
      icon: 'mic',
      titleKey: 'subscriptionChoice.cards.speaker.title',
      descriptionKey: 'subscriptionChoice.cards.speaker.description',
      path: 'speaker',
    },
    {
      type: 'collaborator' as const,
      icon: 'person_heart',
      titleKey: 'subscriptionChoice.cards.collaborator.title',
      descriptionKey: 'subscriptionChoice.cards.collaborator.description',
      path: 'collaborator',
    },
  ];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private dialog: MatDialog,
    private formStorageService: FormStorageService,
  ) {}

  public ngOnInit(): void {
    this.checkForSavedSubscription();
  }

  public onSelect(path: string): void {
    this.router.navigate([path], { relativeTo: this.route });
  }

  private checkForSavedSubscription(): void {
    const savedType: SubscriptionType | null = this.formStorageService.getActiveSubscriptionType();

    if (!savedType) {
      return;
    }

    this.openResumeDialog(savedType);
  }

  private openResumeDialog(savedType: SubscriptionType): void {
    const dialogRef: MatDialogRef<ResumeSubscriptionDialog> = this.dialog.open<
      ResumeSubscriptionDialog,
      ResumeSubscriptionDialogData
    >(ResumeSubscriptionDialog, {
      data: { subscriptionType: savedType },
    });

    dialogRef.afterClosed().subscribe((result: 'continue' | 'new' | undefined): void => {
      if (result === 'continue') {
        this.router.navigate([savedType], { relativeTo: this.route });
      } else if (result === 'new') {
        this.openConfirmClearDialog(savedType);
      }
    });
  }

  private openConfirmClearDialog(savedType: SubscriptionType): void {
    const confirmRef: MatDialogRef<ConfirmClearDialog> = this.dialog.open(ConfirmClearDialog);

    confirmRef.afterClosed().subscribe((confirmed: boolean): void => {
      if (confirmed) {
        this.formStorageService.clearAll();
      } else {
        this.openResumeDialog(savedType);
      }
    });
  }
}
