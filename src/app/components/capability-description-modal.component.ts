import { Component } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { Capability } from '../models/capability';

@Component({
  selector: 'app-capability-description-modal',
  templateUrl: './capability-description-modal.component.html'
})
export class CapabilityDescriptionModalComponent {
  capability: Capability;

  constructor(public bsModalRef: BsModalRef) {}
}
