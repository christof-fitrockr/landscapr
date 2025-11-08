import {Component, EventEmitter, Input, Output} from '@angular/core';
import {Application} from '../models/application';


@Component({
  selector: 'app-system-overview',
  templateUrl: './system-overview.component.html'
})
export class SystemOverviewComponent  {

  @Input() system: Application;
  @Input() readOnly: boolean;
  @Output() deleteEmitter = new EventEmitter<string>();

  constructor() { }

  delete() {
    this.deleteEmitter.emit(this.system.id);
  }
}
