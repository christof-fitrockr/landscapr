import {Component, EventEmitter, Input, OnChanges, Output} from '@angular/core';
import {Process} from '../models/process';
import {ApiCall} from '../models/api-call';
import {ProcessService} from '../services/process.service';
import {first} from 'rxjs/operators';


@Component({
  selector: 'app-process-table',
  templateUrl: './process-table.component.html'
})
export class ProcessTableComponent implements OnChanges {


  @Input() repoId: string;
  @Input() filter: string;
  @Input() processes: Process[];
  @Input() showFilter = true
  @Input() orphanIds: string[] = [];
  // UI toggle for the default subprocess filter (checked by default)
  @Input() showOrphansOnly: boolean = false;

  @Output() deleted = new EventEmitter<void>();

  processToDelete: Process;
  _rootProcesses: Process[] = [];

  filterStatus: number = null;
  filterComments: boolean = false;
  processToShowDescription: Process = null;

  constructor(private processService: ProcessService) { }

  ngOnChanges(changes: any) {
    if (changes.processes) {
      this.calculateRootProcesses();
    }
  }

  private calculateRootProcesses() {
    if (!this.processes) {
      this._rootProcesses = [];
      return;
    }

    const referencedAsSubprocess = new Set<string>();
    this.processes.forEach(p => {
      if (p.steps) {
        p.steps.forEach(s => {
          if (s.processReference) {
            referencedAsSubprocess.add(s.processReference);
          }
          if (s.successors) {
            s.successors.forEach(succ => {
              if (succ.processReference) {
                referencedAsSubprocess.add(succ.processReference);
              }
            });
          }
        });
      }
    });

    this._rootProcesses = this.processes.filter(p => !referencedAsSubprocess.has(p.id));
  }

  trackByProcessId(index: number, item: Process) {
    return item.id;
  }

  prepareDelete(process: Process) {
    this.processToDelete = process;
  }

  delete() {
    if (this.processToDelete) {
      this.processService.delete(this.processToDelete.id).pipe(first()).subscribe(() => {
        this.deleted.emit();
        this.processToDelete = null;
      });
    }
  }

  onShowDescription(process: Process) {
    this.processToShowDescription = process;
  }

  closeDescriptionModal() {
    this.processToShowDescription = null;
  }

}
