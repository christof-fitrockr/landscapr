import {Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges} from '@angular/core';
import {Capability} from '../models/capability';

@Component({
  selector: 'app-capability-tree-node',
  templateUrl: './capability-tree-node.component.html',
  host: {
    'style': 'display: contents'
  }
})
export class CapabilityTreeNodeComponent implements OnInit, OnChanges {
  @Input() capability: Capability & {
      children?: any[],
      recursiveSystemCount?: number,
      recursiveFunctionCount?: number
  };
  @Input() searchText: string;
  @Input() orphanIds: string[] = [];
  @Input() showOrphansOnly = false;
  @Input() filterStatus: number = null;
  @Input() level = 0;

  @Output() deleteEmitter = new EventEmitter<any>();
  @Output() showDescriptionEmitter = new EventEmitter<any>();

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
    const hasFilter = this.searchText || this.showOrphansOnly || this.filterStatus !== null;
    if (hasFilter && this.capability.children) {
      return this.capability.children.some(child => this.hasVisibleDescendant(child));
    }
    return false;
  }

  toggleExpand() {
    this.isExpanded = !this.isExpanded;
  }

  onDelete(capability: any) {
    this.deleteEmitter.emit(capability);
  }

  onShowDescription(capability: any) {
    this.showDescriptionEmitter.emit(capability);
  }

  shouldShow(): boolean {
    if (!this.capability) return false;

    if (this.isCapabilityVisible(this.capability)) return true;

    // If it has children, show if any child should be shown
    if (this.capability.children) {
        return this.capability.children.some(child => this.hasVisibleDescendant(child));
    }

    return false;
  }

  private hasVisibleDescendant(capability: any): boolean {
    if (this.isCapabilityVisible(capability)) return true;

    if (capability.children) {
        return capability.children.some(child => this.hasVisibleDescendant(child));
    }
    return false;
  }

  private isCapabilityVisible(capability: any): boolean {
    const matchesSearch = !this.searchText || capability.name?.toLowerCase().includes(this.searchText.toLowerCase());
    const matchesOrphan = !this.showOrphansOnly || this.orphanIds.includes(capability.id);
    const matchesStatus = this.filterStatus === null || capability.status === this.filterStatus;

    return matchesSearch && matchesOrphan && matchesStatus;
  }
}
