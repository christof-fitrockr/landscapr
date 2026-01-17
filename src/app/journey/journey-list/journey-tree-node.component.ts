import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Journey } from '../../models/journey.model';

@Component({
  selector: 'app-journey-tree-node',
  templateUrl: './journey-tree-node.component.html',
  host: {
    'style': 'display: contents'
  }
})
export class JourneyTreeNodeComponent {
  @Input() journey: Journey;
  @Input() searchText: string;
  @Input() filterStatus: number = null;
  @Input() level = 0;

  @Output() deleteEmitter = new EventEmitter<Journey>();
  @Output() showDescriptionEmitter = new EventEmitter<Journey>();

  constructor() { }

  onDelete(journey: Journey) {
    this.deleteEmitter.emit(journey);
  }

  onShowDescription(journey: Journey) {
    this.showDescriptionEmitter.emit(journey);
  }

  shouldShow(): boolean {
    if (!this.journey) return false;

    const matchesSearch = !this.searchText ||
      this.journey.name?.toLowerCase().includes(this.searchText.toLowerCase()) ||
      this.journey.description?.toLowerCase().includes(this.searchText.toLowerCase());

    const matchesStatus = this.filterStatus === null || this.journey.status === this.filterStatus;

    return matchesSearch && matchesStatus;
  }
}
