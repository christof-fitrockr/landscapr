import { Component } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-commit-message-dialog',
  templateUrl: './commit-message-dialog.component.html'
})
export class CommitMessageDialogComponent {
  message: string = '';
  onClose: Subject<string | null> = new Subject();

  constructor(public bsModalRef: BsModalRef) {}

  submit(): void {
    this.onClose.next(this.message);
    this.onClose.complete();
    this.bsModalRef.hide();
  }

  cancel(): void {
    this.onClose.next(null);
    this.onClose.complete();
    this.bsModalRef.hide();
  }
}
