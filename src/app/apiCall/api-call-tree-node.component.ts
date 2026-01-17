import {Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges} from '@angular/core';
import {ApiCall} from '../models/api-call';

@Component({
  selector: 'app-api-call-tree-node',
  templateUrl: './api-call-tree-node.component.html',
  styleUrls: ['./api-call-tree-node.component.scss'],
  host: { style: 'display: contents' }
})
export class ApiCallTreeNodeComponent implements OnInit, OnChanges {
  @Input() group: { name: string, items: any[] };
  @Input() searchText: string;
  @Input() orphanIds: string[] = [];
  @Input() showOrphansOnly = false;
  @Input() filterStatus: number = null;
  @Input() level = 0;
  @Input() selectMode = false;

  @Output() delete = new EventEmitter<ApiCall>();
  @Output() select = new EventEmitter<ApiCall>();
  @Output() showDescription = new EventEmitter<ApiCall>();

  isExpanded = false;

  constructor() { }

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.searchText || changes.showOrphansOnly || changes.filterStatus) {
      this.isExpanded = this.shouldBeExpanded();
    }
  }

  private shouldBeExpanded(): boolean {
    if (this.group) {
      const hasFilter = this.searchText || this.showOrphansOnly || this.filterStatus !== null;
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

  shouldShowItem(apiCall: any): boolean {
    const matchesSearch = !this.searchText || apiCall.name?.toLowerCase().includes(this.searchText.toLowerCase());
    const matchesOrphan = !this.showOrphansOnly || this.orphanIds.includes(apiCall.id);
    const matchesStatus = this.filterStatus === null || apiCall.status === this.filterStatus;

    return matchesSearch && matchesOrphan && matchesStatus;
  }

  onSelect(apiCall: ApiCall) {
    this.select.emit(apiCall);
  }

  onDelete(apiCall: ApiCall) {
    this.delete.emit(apiCall);
  }

  onShowDescription(apiCall: ApiCall) {
    this.showDescription.emit(apiCall);
  }
}
