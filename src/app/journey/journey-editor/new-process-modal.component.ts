import { Component, EventEmitter, Output } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';

@Component({
  selector: 'app-new-process-modal',
  templateUrl: './new-process-modal.component.html'
})
export class NewProcessModalComponent {
  name: string = '';
  @Output() saved = new EventEmitter<string>();

  constructor(public bsModalRef: BsModalRef) {}

  save(): void {
    const trimmed = (this.name || '').trim();
    if (!trimmed) {
      return;
    }
    this.saved.emit(trimmed);
    this.bsModalRef.hide();
  }

  cancel(): void {
    this.bsModalRef.hide();
  }
}
