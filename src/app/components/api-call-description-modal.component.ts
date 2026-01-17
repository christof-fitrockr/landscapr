import { Component } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { ApiCall } from '../models/api-call';

@Component({
  selector: 'app-api-call-description-modal',
  templateUrl: './api-call-description-modal.component.html'
})
export class ApiCallDescriptionModalComponent {
  apiCall: ApiCall;

  constructor(public bsModalRef: BsModalRef) {}
}
