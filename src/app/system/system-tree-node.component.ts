import {Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges} from '@angular/core';

@Component({
  selector: 'app-system-tree-node',
  templateUrl: './system-tree-node.component.html',
  styleUrls: ['./system-tree-node.component.scss'],
  host: {
    'style': 'display: contents'
  }
})
export class SystemTreeNodeComponent implements OnInit, OnChanges {
  @Input() node: any;
  @Input() searchText: string;
  @Input() orphanIds: string[] = [];
  @Input() showOrphansOnly = false;
  @Input() filterStatus: number = null;
  @Input() level = 0;
  @Input() selectMode = false;

  @Output() selectEmitter = new EventEmitter<any>();
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
    if (this.node?.isCluster) {
      const hasFilter = this.searchText || this.showOrphansOnly || this.filterStatus !== null;
      if (hasFilter) {
        return this.node.systems.some(sys => this.isSystemVisible(sys));
      }
    }
    return false;
  }

  toggleExpand() {
    this.isExpanded = !this.isExpanded;
  }

  onSelect(system: any) {
    this.selectEmitter.emit(system);
  }

  onDelete(system: any) {
    this.deleteEmitter.emit(system);
  }

  onShowDescription(system: any) {
    this.showDescriptionEmitter.emit(system);
  }

  shouldShow(): boolean {
    if (!this.node) return false;

    // Cluster node
    if (this.node.isCluster) {
        if (!this.searchText && !this.showOrphansOnly) return true;
        // If it's a cluster, show if any system matches
        return this.node.systems.some(sys => this.isSystemVisible(sys));
    }

    // System node
    return this.isSystemVisible(this.node);
  }

  private isSystemVisible(system: any): boolean {
    const matchesSearch = !this.searchText ||
        system.name?.toLowerCase().includes(this.searchText.toLowerCase()) ||
        system.systemCluster?.toLowerCase().includes(this.searchText.toLowerCase());
    const matchesOrphan = !this.showOrphansOnly || this.orphanIds.includes(system.id);
    const matchesStatus = this.filterStatus === null || system.status === this.filterStatus;

    return matchesSearch && matchesOrphan && matchesStatus;
  }
}
