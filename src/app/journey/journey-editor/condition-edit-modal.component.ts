import { Component } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';

@Component({
  selector: 'app-condition-edit-modal',
  templateUrl: './condition-edit-modal.component.html'
})
export class ConditionEditModalComponent {
  label: string = '';

  constructor(public bsModalRef: BsModalRef) {}

  save(): void {
    this.bsModalRef.hide();
  }

  cancel(): void {
    this.bsModalRef.hide();
  }
}
