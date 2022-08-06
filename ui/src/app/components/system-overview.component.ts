import {Component, EventEmitter, Input, Output} from '@angular/core';
import {System} from '../models/system';


@Component({
  selector: 'app-system-overview',
  templateUrl: './system-overview.component.html'
})
export class SystemOverviewComponent  {

  @Input() system: System;
  @Input() readOnly: boolean;
  @Output() deleteEmitter = new EventEmitter<string>();

  constructor() { }

  delete() {
    this.deleteEmitter.emit(this.system.id);
  }
}
