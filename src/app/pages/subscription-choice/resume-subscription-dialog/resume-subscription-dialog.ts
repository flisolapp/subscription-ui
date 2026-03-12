import { Component, Inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { MatButton } from '@angular/material/button';
import { TranslatePipe } from '@ngx-translate/core';
import { SubscriptionType } from '../../../models/subscription-type/subscription-type';
import { A11yModule } from '@angular/cdk/a11y';

export interface ResumeSubscriptionDialogData {
  subscriptionType: SubscriptionType;
}

@Component({
  selector: 'app-resume-subscription-dialog',
  imports: [
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatButton,
    TranslatePipe,
    A11yModule,
  ],
  templateUrl: './resume-subscription-dialog.html',
  styleUrl: './resume-subscription-dialog.scss',
})
export class ResumeSubscriptionDialog {
  constructor(
    public dialogRef: MatDialogRef<ResumeSubscriptionDialog>,
    @Inject(MAT_DIALOG_DATA) public data: ResumeSubscriptionDialogData,
  ) {}

  public continue(): void {
    this.dialogRef.close('continue');
  }

  public startNew(): void {
    this.dialogRef.close('new');
  }
}
