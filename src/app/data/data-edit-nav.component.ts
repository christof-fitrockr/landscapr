import {Component, Input} from '@angular/core';

@Component({
  selector: 'app-data-edit-nav',
  templateUrl: './data-edit-nav.component.html'
})
export class DataEditNavComponent {
  @Input() dataId: string;
}
