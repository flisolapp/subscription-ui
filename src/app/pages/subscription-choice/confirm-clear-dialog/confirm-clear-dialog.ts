import { Component } from '@angular/core';
import {
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { MatButton } from '@angular/material/button';
import { TranslatePipe } from '@ngx-translate/core';
import { A11yModule } from '@angular/cdk/a11y';

@Component({
  selector: 'app-confirm-clear-dialog',
  imports: [
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatButton,
    TranslatePipe,
    A11yModule,
  ],
  templateUrl: './confirm-clear-dialog.html',
  styleUrl: './confirm-clear-dialog.scss',
})
export class ConfirmClearDialog {
  constructor(public dialogRef: MatDialogRef<ConfirmClearDialog>) {}

  public cancel(): void {
    this.dialogRef.close(false);
  }

  public confirm(): void {
    this.dialogRef.close(true);
  }
}
