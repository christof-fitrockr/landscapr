import {Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges} from '@angular/core';
import {Data} from '../models/data';

@Component({
  selector: 'app-data-tree-node',
  templateUrl: './data-tree-node.component.html',
  styleUrls: ['./data-tree-node.component.scss'],
  host: { style: 'display: contents' }
})
export class DataTreeNodeComponent implements OnInit, OnChanges {
  @Input() group: { groupName: string, items: Data[] };
  @Input() searchText: string;
  @Input() filterStatus: number = null;
  @Input() level = 0;

  @Output() delete = new EventEmitter<Data>();

  isExpanded = false;

  constructor() { }

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.searchText || changes.filterStatus) {
      this.isExpanded = this.shouldBeExpanded();
    }
  }

  private shouldBeExpanded(): boolean {
    if (this.group) {
      const hasFilter = (this.searchText && this.searchText.trim().length > 0) || this.filterStatus !== null;
      if (hasFilter) {
        return this.group.items.some(item => this.shouldShowItem(item));
      }
    }
    return false;
  }

  toggleExpand() {
    this.isExpanded = !this.isExpanded;
  }

  shouldShowGroup(): boolean {
    if (!this.group) return false;
    return this.group.items.some(item => this.shouldShowItem(item));
  }

  shouldShowItem(data: Data): boolean {
    const matchesSearch = !this.searchText || data.name?.toLowerCase().includes(this.searchText.toLowerCase());
    const matchesStatus = this.filterStatus === null || data.state === this.filterStatus;

    return matchesSearch && matchesStatus;
  }

  onDelete(data: Data) {
    this.delete.emit(data);
  }
}
