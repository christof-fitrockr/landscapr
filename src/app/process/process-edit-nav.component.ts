import {Component, Input} from '@angular/core';

@Component({
  selector: 'app-process-edit-nav',
  templateUrl: './process-edit-nav.component.html'
})
export class ProcessEditNavComponent {
  @Input() processId: string;
}
