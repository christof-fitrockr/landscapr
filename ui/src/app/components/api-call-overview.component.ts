import {Component, EventEmitter, Input, Output} from '@angular/core';
import {ApiCall} from '../models/api-call';


@Component({
  selector: 'app-api-call-overview',
  templateUrl: './api-call-overview.component.html'
})
export class ApiCallOverviewComponent  {

  @Input() apiCall: ApiCall;
  @Input() readOnly : boolean;
  @Output() deleteEmitter = new EventEmitter<string>();

  constructor() { }

  delete() {
    this.deleteEmitter.emit(this.apiCall.id);
  }
}
