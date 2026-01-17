import {Component, Input} from '@angular/core';

@Component({
  selector: 'app-capability-edit-nav',
  templateUrl: './capability-edit-nav.component.html'
})
export class CapabilityEditNavComponent {
  @Input() capabilityId: string;
}
