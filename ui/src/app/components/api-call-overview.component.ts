import {Component, EventEmitter, Input, Output} from '@angular/core';
import {Process} from '../models/process';
import {ApiCall} from '../models/api-call';


@Component({
  selector: 'app-api-call-overview',
  templateUrl: './api-call-overview.component.html'
})
export class ProcessApiCallOverviewComponent  {

  @Input() apiCall: ApiCall;
  @Output() moveUpEmitter = new EventEmitter<string>();
  @Output() moveDownEmitter = new EventEmitter<string>();
  @Output() deleteEmitter = new EventEmitter<string>();


  constructor() { }

  moveUp() {
    this.moveUpEmitter.emit(this.apiCall.apiCallId);
  }

  moveDown() {
    this.moveDownEmitter.emit(this.apiCall.apiCallId);
  }

  delete() {
    this.deleteEmitter.emit(this.apiCall.apiCallId);
  }
}
