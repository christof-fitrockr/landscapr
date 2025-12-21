import { Component } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-delete-confirmation-dialog',
  templateUrl: './delete-confirmation-dialog.component.html'
})
export class DeleteConfirmationDialogComponent {
  public onClose: Subject<boolean> = new Subject<boolean>();

  constructor(public bsModalRef: BsModalRef) {}

  confirm(): void {
    this.onClose.next(true);
    this.bsModalRef.hide();
  }

  decline(): void {
    this.onClose.next(false);
    this.bsModalRef.hide();
  }
}
