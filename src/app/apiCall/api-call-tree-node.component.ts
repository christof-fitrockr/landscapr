import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {ApiCall} from '../models/api-call';

@Component({
  selector: 'app-api-call-tree-node',
  templateUrl: './api-call-tree-node.component.html',
  styleUrls: ['./api-call-tree-node.component.scss']
})
export class ApiCallTreeNodeComponent implements OnInit {
  @Input() group: { name: string, items: any[] };
  @Input() searchText: string;
  @Input() orphanIds: string[] = [];
  @Input() showOrphansOnly = false;
  @Input() selectMode = false;

  @Output() delete = new EventEmitter<ApiCall>();
  @Output() select = new EventEmitter<ApiCall>();

  isExpanded = false;

  constructor() { }

  ngOnInit(): void {
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

    return matchesSearch && matchesOrphan;
  }

  onSelect(apiCall: ApiCall) {
    this.select.emit(apiCall);
  }

  prepareDelete(apiCall: ApiCall) {
    this.delete.emit(apiCall);
  }
}
