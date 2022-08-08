import {Component, EventEmitter, Input, Output} from '@angular/core';
import {Application} from '../models/application';
import {Capability} from '../models/capability';


@Component({
  selector: 'app-capability-overview',
  templateUrl: './capability-overview.component.html'
})
export class CapabilityOverviewComponent  {

  @Input() capability: Capability;
  @Input() readOnly: boolean;
  @Output() deleteEmitter = new EventEmitter<string>();

  constructor() { }

  delete() {
    this.deleteEmitter.emit(this.capability.capabilityId);
  }
}
