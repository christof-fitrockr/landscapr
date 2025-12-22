import {Component, Input, OnInit} from '@angular/core';
import {Capability} from '../models/capability';

@Component({
  selector: 'app-capability-tree-node',
  templateUrl: './capability-tree-node.component.html',
  styleUrls: ['./capability-tree-node.component.scss']
})
export class CapabilityTreeNodeComponent implements OnInit {
  @Input() capability: Capability & {
      children?: any[],
      recursiveSystemCount?: number,
      recursiveFunctionCount?: number
  };
  @Input() searchText: string;
  @Input() orphanIds: string[] = [];
  @Input() showOrphansOnly = false;
  @Input() level = 0;

  isExpanded = false;

  constructor() { }

  ngOnInit(): void {
  }

  toggleExpand() {
    this.isExpanded = !this.isExpanded;
  }

  shouldShow(): boolean {
    if (!this.capability) return false;

    const matchesSearch = !this.searchText || this.capability.name?.toLowerCase().includes(this.searchText.toLowerCase());
    const matchesOrphan = !this.showOrphansOnly || this.orphanIds.includes(this.capability.id);

    if (matchesSearch && matchesOrphan) return true;

    // If it has children, show if any child should be shown
    if (this.capability.children) {
        return this.capability.children.some(child => this.isChildVisible(child));
    }

    return false;
  }

  private isChildVisible(capability: any): boolean {
    const matchesSearch = !this.searchText || capability.name?.toLowerCase().includes(this.searchText.toLowerCase());
    const matchesOrphan = !this.showOrphansOnly || this.orphanIds.includes(capability.id);

    if (matchesSearch && matchesOrphan) return true;

    if (capability.children) {
        return capability.children.some(child => this.isChildVisible(child));
    }
    return false;
  }
}
