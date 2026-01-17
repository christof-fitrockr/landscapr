import { Component } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { Journey } from '../models/journey.model';

@Component({
  selector: 'app-journey-description-modal',
  templateUrl: './journey-description-modal.component.html'
})
export class JourneyDescriptionModalComponent {
  journey: Journey;

  constructor(public bsModalRef: BsModalRef) {}
}
