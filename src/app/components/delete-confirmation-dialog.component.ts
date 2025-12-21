import { Component } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-delete-confirmation-dialog',
  templateUrl: './delete-confirmation-dialog.component.html'
})
export class DeleteConfirmationDialogComponent {
  public onClose: Subject<boolean> = new Subject<boolean>();
  public itemName: string;
  public confirmationInput: string = '';

  constructor(public bsModalRef: BsModalRef) {}

  confirm(): void {
    if (this.itemName && this.confirmationInput !== this.itemName) {
      return;
    }
    this.onClose.next(true);
    this.bsModalRef.hide();
  }

  decline(): void {
    this.onClose.next(false);
    this.bsModalRef.hide();
  }

  isConfirmDisabled(): boolean {
    if (!this.itemName) {
      return false;
    }
    return this.confirmationInput !== this.itemName;
  }
}
