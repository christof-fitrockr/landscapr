import {Component, EventEmitter, Input, OnChanges, Output, SimpleChanges} from '@angular/core';
import {Process} from '../models/process';
import {ProcessService} from '../services/process.service';
import {RoleService} from '../services/role.service';

@Component({
  selector: 'app-process-tree-node',
  templateUrl: './process-tree-node.html',
  host: {
    'style': 'display: contents'
  }
})
export class ProcessTreeNodeComponent implements OnChanges {
  @Input() process: Process;
  @Input() allProcesses: Process[];
  @Input() level: number = 0;
  @Input() repoId: string;
  @Input() orphanIds: string[] = [];
  @Input() filter: string;
  @Input() filterStatus: number;
  @Input() filterComments: boolean = false;
  @Input() showOrphansOnly: boolean = false;
  @Input() selectMode: boolean = false;

  @Output() deleted = new EventEmitter<void>();
  @Output() delete = new EventEmitter<Process>();
  @Output() select = new EventEmitter<Process>();
  @Output() showDescription = new EventEmitter<Process>();

  expanded: boolean = false;
  childProcesses: Process[] = [];

  constructor(private roleService: RoleService) {}

  getRoleColor(id: any) {
    return this.roleService.getRoleColor(id);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.process || changes.allProcesses) {
      this.calculateChildProcesses();
    }
    if (changes.filter || changes.filterStatus || changes.filterComments) {
      this.expanded = this.shouldBeExpanded();
    }
  }

  private shouldBeExpanded(): boolean {
    const hasSearch = this.filter && this.filter.trim().length > 0;
    const q = hasSearch ? this.filter.toLowerCase() : '';
    if (hasSearch || (this.filterStatus !== undefined && this.filterStatus !== null) || this.filterComments) {
      return this.hasMatchingDescendant(this.process, q);
    }
    return false;
  }

  private hasMatchingDescendant(process: Process, q: string): boolean {
    if (!process || !process.steps || !this.allProcesses) {
      return false;
    }
    const childProcesses = this.getChildProcesses(process);
    return childProcesses.some(child => {
      const matchesSearch = !q ||
        child.name?.toLowerCase().includes(q) ||
        (Array.isArray(child.tags) && child.tags.join(' ').toLowerCase().includes(q));

      const matchesStatus = (this.filterStatus === undefined || this.filterStatus === null) || child.status === this.filterStatus;
      const matchesComments = !this.filterComments || (!!child.comments && child.comments.length > 0);

      const matches = matchesSearch && matchesStatus && matchesComments;

      return matches || this.hasMatchingDescendant(child, q);
    });
  }

  private getChildProcesses(process: Process): Process[] {
    if (!process || !process.steps || !this.allProcesses) {
      return [];
    }
    const childIds: string[] = [];
    process.steps.forEach(step => {
      if (step.processReference) {
        childIds.push(step.processReference);
      }
      if (step.successors) {
        step.successors.forEach(succ => {
          if (succ.processReference) {
            childIds.push(succ.processReference);
          }
        });
      }
    });

    return childIds
      .map(id => this.allProcesses.find(p => p.id === id))
      .filter(p => !!p);
  }

  trackByProcessId(index: number, item: Process) {
    return `${item.id}-${index}`;
  }

  private calculateChildProcesses() {
    this.childProcesses = this.getChildProcesses(this.process);
  }

  toggle() {
    this.expanded = !this.expanded;
  }

  onDelete(process: Process) {
    this.delete.emit(process);
  }

  onDeleted() {
    this.deleted.emit();
  }

  onSelect(process: Process) {
    this.select.emit(process);
  }

  onShowDescription(process: Process) {
    this.showDescription.emit(process);
  }
}
