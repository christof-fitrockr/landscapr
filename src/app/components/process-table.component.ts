import {Component, EventEmitter, Input, OnChanges, Output} from '@angular/core';
import {Process} from '../models/process';
import {ProcessService} from '../services/process.service';
import {first} from 'rxjs/operators';
import {BsModalService} from 'ngx-bootstrap/modal';
import {ProcessDescriptionModalComponent} from './process-description-modal.component';
import {ToastrService} from 'ngx-toastr';
import {DeleteConfirmationDialogComponent} from './delete-confirmation-dialog.component';


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

  _rootProcesses: Process[] = [];

  filterStatus: number = null;
  filterComments: boolean = false;

  constructor(private processService: ProcessService, private modalService: BsModalService, private toastr: ToastrService) { }

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

  onDelete(process: Process) {
    const modalRef = this.modalService.show(DeleteConfirmationDialogComponent, { class: 'modal-md' });
    modalRef.content.itemName = process.name;
    modalRef.content.onClose.subscribe(result => {
      if (result) {
        this.processService.delete(process.id).pipe(first()).subscribe(() => {
          this.toastr.success('Process deleted');
          this.deleted.emit();
        }, error => {
          this.toastr.error('Error deleting Process');
        });
      }
    });
  }

  onShowDescription(process: Process) {
    this.modalService.show(ProcessDescriptionModalComponent, {
      initialState: { process },
      class: 'modal-dialog-centered'
    });
  }

}
