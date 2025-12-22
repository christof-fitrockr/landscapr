import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';

@Component({
  selector: 'app-system-tree-node',
  templateUrl: './system-tree-node.component.html',
  styleUrls: ['./system-tree-node.component.scss']
})
export class SystemTreeNodeComponent implements OnInit {
  @Input() node: any;
  @Input() searchText: string;
  @Input() orphanIds: string[] = [];
  @Input() showOrphansOnly = false;
  @Input() level = 0;
  @Input() selectMode = false;

  @Output() selectEmitter = new EventEmitter<any>();

  isExpanded = true;

  constructor() { }

  ngOnInit(): void {
  }

  toggleExpand() {
    this.isExpanded = !this.isExpanded;
  }

  onSelect(system: any) {
    this.selectEmitter.emit(system);
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

    return matchesSearch && matchesOrphan;
  }
}
