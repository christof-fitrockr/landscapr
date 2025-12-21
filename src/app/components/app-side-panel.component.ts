import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-side-panel',
  templateUrl: './app-side-panel.component.html',
  styleUrls: ['./app-side-panel.component.scss']
})
export class AppSidePanelComponent {
  @Input() isOpen = false;
  @Input() title = '';
  @Output() close = new EventEmitter<void>();
}
