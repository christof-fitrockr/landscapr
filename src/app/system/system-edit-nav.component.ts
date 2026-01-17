import {Component, Input} from '@angular/core';

@Component({
  selector: 'app-system-edit-nav',
  templateUrl: './system-edit-nav.component.html'
})
export class SystemEditNavComponent {
  @Input() systemId: string;
}
