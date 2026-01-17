import { Component } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-pr-dialog',
  templateUrl: './pr-dialog.component.html'
})
export class PrDialogComponent {
  title: string = '';
  body: string = '';

  onClose: Subject<any> = new Subject();

  constructor(public bsModalRef: BsModalRef) {}

  submit(): void {
    this.onClose.next({ title: this.title, body: this.body });
    this.onClose.complete();
    this.bsModalRef.hide();
  }

  cancel(): void {
    this.onClose.next(null);
    this.onClose.complete();
    this.bsModalRef.hide();
  }
}
