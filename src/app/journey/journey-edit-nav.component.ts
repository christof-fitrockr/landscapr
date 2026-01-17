import {Component, Input} from '@angular/core';

@Component({
  selector: 'app-journey-edit-nav',
  templateUrl: './journey-edit-nav.component.html'
})
export class JourneyEditNavComponent {
  @Input() journeyId: string;
}
