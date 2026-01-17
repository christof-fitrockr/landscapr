import { Component } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { Application } from '../models/application';

@Component({
  selector: 'app-system-description-modal',
  templateUrl: './system-description-modal.component.html'
})
export class SystemDescriptionModalComponent {
  system: Application;

  constructor(public bsModalRef: BsModalRef) {}
}
