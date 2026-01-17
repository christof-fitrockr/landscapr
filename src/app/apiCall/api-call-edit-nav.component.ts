import {Component, Input} from '@angular/core';

@Component({
  selector: 'app-api-call-edit-nav',
  templateUrl: './api-call-edit-nav.component.html'
})
export class ApiCallEditNavComponent {
  @Input() apiCallId: string;
}
