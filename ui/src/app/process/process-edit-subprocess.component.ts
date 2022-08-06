import {Component, OnInit} from '@angular/core';
import {ProcessService} from '../services/process.service';
import {Process, ProcessWithStep, Step, StepSuccessor} from '../models/process';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {ActivatedRoute, Router} from '@angular/router';
import {first, map, switchMap, tap} from 'rxjs/operators';
import {ToastrService} from 'ngx-toastr';
import {noop, Observable, Observer, of} from 'rxjs';
import {TypeaheadMatch} from 'ngx-bootstrap/typeahead';
import {CdkDragDrop, moveItemInArray} from '@angular/cdk/drag-drop';

@Component({templateUrl: './process-edit-subprocess.component.html', styleUrls: ['./process-edit-subprocess.component.scss']})
export class ProcessEditSubprocessComponent implements OnInit {

  search?: string;
  suggestions$?: Observable<Process[]>;

  subProcessForm: FormGroup;
  process: Process;
  private processId: string;
  subProcesses: ProcessWithStep[];
  availableSubProcesses: Process[];


  constructor(private processService: ProcessService, private formBuilder: FormBuilder, private route: ActivatedRoute, private router: Router, private toastr: ToastrService) {
  }

  typeaheadOnSelect(e: TypeaheadMatch): void {
    this.addSubProcess(e.item.processId);
  }

  ngOnInit() {

    this.subProcessForm = this.formBuilder.group({
      name: ['', Validators.required],
      description: [''],
    });

    this.refresh();

    this.suggestions$ = new Observable((observer: Observer<string | undefined>) => observer.next(this.search)).pipe(
      switchMap((query: string) => {
        if (query) {
          return this.processService.getProcessByName(query).pipe(
            map((data: Process[]) => data || []),
            tap(() => noop, err => this.toastr.error(err && err.message || 'Something goes wrong'))
          );
        }
        return of([]);
      })
    );
  }

  private refresh() {
    this.processId = this.route.parent.snapshot.paramMap.get('id');
    if (this.processId != null) {
      this.processService.getProcessById(this.processId).pipe(first()).subscribe(process => {
        this.process = process;

        const processIdMap = new Map<string, Process>();
        const ids = [];
        if(this.process.steps) {
          for (let item of this.process.steps) {
            ids.push(item.processReference);
          }

          const chunkSize = 10;
          for (let i = 0; i < ids.length; i += chunkSize) {
            const idChunk = ids.slice(i, i + chunkSize);
            // do whatever
            this.processService.getProcessByIds(idChunk).pipe(first()).subscribe(results => {
              this.availableSubProcesses = results;
              for (let process of results) {
                processIdMap.set(process.processId, process);
              }

              this.subProcesses = [];
              for (let item of this.process.steps) {
                const processWithStep = new ProcessWithStep();
                processWithStep.stepDetails = item;
                if (processIdMap.has(item.processReference)) {
                  processWithStep.process = processIdMap.get(item.processReference);
                  this.subProcesses.push(processWithStep);
                }
              }

            });
          }
        }

      });
    } else {
      this.process = new Process();
    }
  }

  onUpdate() {
    this.processService.updateProcess(this.processId, this.process).then(() => {
      this.toastr.info('Process updated successfully');
      this.refresh();
    });
  }

  createSubProcess() {
    Object.keys(this.subProcessForm.controls).forEach(field => {
      const control = this.subProcessForm.get(field);
      control.markAsTouched({ onlySelf: true });
    });

    if (this.subProcessForm.valid) {
      let subProcess = new Process();
      subProcess = Object.assign(subProcess, this.subProcessForm.value);
      this.processService.createProcess(subProcess).then(docRef => {
        this.addSubProcess(docRef.id);
      });
    }
  }

  private addSubProcess(id: string) {
    if(!this.process.steps) {
      this.process.steps = [];
    }

    const step = new Step();
    step.processReference = id;
    // if(this.process?.steps?.length > 0) {
    //   step.successor = [new StepSuccessor()];
    //   step.successor[0].processReference = this.process.steps[this.process.steps.length - 1].processReference;
    // }


    this.process.steps.push( step);
    this.onUpdate();
  }


  delete(processId: string) {
    if (this.process.steps !== null) {
      const index = this.process.steps.findIndex(item => item.processReference === processId);
      if (index >= 0) {
        this.process.steps.splice(index, 1);
        this.onUpdate();
      }
    }
  }

  drop(event: CdkDragDrop<ProcessWithStep[]>) {
     if (event.previousContainer === event.container) {
       moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
       this.updateList(event.container.data);
    }
  }

  private updateList(steps: ProcessWithStep[]) {
    this.process.steps = [];
    for(let step of steps) {
      this.process.steps.push(step.stepDetails);
    }
    this.onUpdate();
  }

  updateProcessStep(processWithStep: ProcessWithStep) {
    for(let step of this.process.steps) {
      if(step.processReference === processWithStep.stepDetails.processReference) {
        step.successor = processWithStep.stepDetails.successor;
        break;
      }
    }
    this.onUpdate();

  }
}
