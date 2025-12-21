import {Component, EventEmitter, Input, Output} from '@angular/core';
import {Process} from '../models/process';
import {ApiCall} from '../models/api-call';
import {ProcessService} from '../services/process.service';
import {first} from 'rxjs/operators';


@Component({
  selector: 'app-process-table',
  templateUrl: './process-table.component.html'
})
export class ProcessTableComponent  {


  @Input() repoId: string;
  @Input() filter: string;
  @Input() processes: Process[];
  @Input() showFilter = true
  @Input() orphanIds: string[] = [];
  // UI toggle for the default subprocess filter (checked by default)
  @Input() onlyWithSubprocesses: boolean = true;
  @Input() showOrphansOnly: boolean = false;

  @Output() deleted = new EventEmitter<void>();

  processToDelete: Process;

  constructor(private processService: ProcessService) { }

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

}
