import { Component } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { Process } from '../models/process';

@Component({
  selector: 'app-process-description-modal',
  templateUrl: './process-description-modal.component.html'
})
export class ProcessDescriptionModalComponent {
  process: Process;

  constructor(public bsModalRef: BsModalRef) {}
}
