import {Component, EventEmitter, Input, OnChanges, Output, SimpleChanges} from '@angular/core';
import {Process, getRoleColor} from '../models/process';
import {ProcessService} from '../services/process.service';

@Component({
  selector: 'app-process-tree-node',
  templateUrl: './process-tree-node.html',
  host: {
    'style': 'display: contents'
  }
})
export class ProcessTreeNodeComponent implements OnChanges {
  getRoleColor = getRoleColor;
  @Input() process: Process;
  @Input() allProcesses: Process[];
  @Input() level: number = 0;
  @Input() repoId: string;
  @Input() orphanIds: string[] = [];
  @Input() filter: string;
  @Input() showOrphansOnly: boolean = false;
  @Input() selectMode: boolean = false;

  @Output() deleted = new EventEmitter<void>();
  @Output() prepareDelete = new EventEmitter<Process>();
  @Output() select = new EventEmitter<Process>();

  expanded: boolean = false;
  childProcesses: Process[] = [];

  ngOnChanges(changes: SimpleChanges) {
    if (changes.process || changes.allProcesses) {
      this.calculateChildProcesses();
    }
    if (changes.filter && this.filter && this.filter.trim().length > 0) {
      this.expanded = this.hasMatchingDescendant(this.process, this.filter.toLowerCase());
    }
  }

  private hasMatchingDescendant(process: Process, q: string): boolean {
    if (!process || !process.steps || !this.allProcesses) {
      return false;
    }
    const childProcesses = this.getChildProcesses(process);
    return childProcesses.some(child => {
      const matches = child.name?.toLowerCase().includes(q) ||
        (Array.isArray(child.tags) && child.tags.join(' ').toLowerCase().includes(q));
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

  onPrepareDelete(process: Process) {
    this.prepareDelete.emit(process);
  }

  onDeleted() {
    this.deleted.emit();
  }

  onSelect(process: Process) {
    this.select.emit(process);
  }
}
