import {Component, Input} from '@angular/core';
import {Capability} from '../../models/capability';

@Component({
  selector: 'app-capability-selector-tree-node',
  templateUrl: './capability-selector-tree-node.component.html',
  styleUrls: ['./capability-selector-tree-node.component.scss']
})
export class CapabilitySelectorTreeNodeComponent {
  @Input() capability: Capability & { children?: any[] };
  @Input() selectedIds: Set<string>;
  @Input() searchText: string;
  @Input() level = 0;

  isExpanded = false;

  toggleExpand() {
    this.isExpanded = !this.isExpanded;
  }

  toggleSelection() {
    if (this.selectedIds.has(this.capability.id)) {
      this.selectedIds.delete(this.capability.id);
    } else {
      this.selectedIds.add(this.capability.id);
    }
  }

  shouldShow(): boolean {
    if (!this.capability) return false;

    const matchesSearch = !this.searchText || this.capability.name.toLowerCase().includes(this.searchText.toLowerCase());

    if (matchesSearch) return true;

    if (this.capability.children) {
      return this.capability.children.some(child => this.isChildVisible(child));
    }

    return false;
  }

  private isChildVisible(capability: any): boolean {
    const matchesSearch = !this.searchText || capability.name.toLowerCase().includes(this.searchText.toLowerCase());
    if (matchesSearch) return true;
    if (capability.children) {
      return capability.children.some(child => this.isChildVisible(child));
    }
    return false;
  }
}
