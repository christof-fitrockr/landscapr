import { Component } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-confirmation-dialog',
  templateUrl: './confirmation-dialog.component.html'
})
export class ConfirmationDialogComponent {
  title: string;
  message: string;
  btnYesText: string = 'Yes';
  btnNoText: string = 'No';

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
