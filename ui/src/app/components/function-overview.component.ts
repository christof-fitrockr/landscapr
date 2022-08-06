import {Component, EventEmitter, Input, Output} from '@angular/core';
import {ApiCall} from '../models/api-call';


@Component({
  selector: 'app-function-overview',
  templateUrl: './function-overview.component.html'
})
export class ApiCallOverviewComponent  {

  @Input() apiCall: ApiCall;
  @Input() readOnly : boolean;
  @Output() deleteEmitter = new EventEmitter<string>();

  constructor() { }

  delete() {
    this.deleteEmitter.emit(this.apiCall.apiCallId);
  }
}
