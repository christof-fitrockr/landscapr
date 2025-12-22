import {Component, OnDestroy, OnInit} from '@angular/core';
import {ProcessService} from '../services/process.service';
import {ApiCallService} from '../services/api-call.service';
import {Process, ProcessWithStep, Step, StepSuccessor} from '../models/process';
import {ApiCall} from '../models/api-call';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {ActivatedRoute, Router} from '@angular/router';
import {first, map, switchMap, tap} from 'rxjs/operators';
import {ToastrService} from 'ngx-toastr';
import {forkJoin, noop, Observable, Observer, of, Subscription} from 'rxjs';
import {TypeaheadMatch} from 'ngx-bootstrap/typeahead';
import {CdkDragDrop, moveItemInArray} from '@angular/cdk/drag-drop';

@Component({templateUrl: './process-edit-subprocess.component.html', styleUrls: ['./process-edit-subprocess.component.scss']})
export class ProcessEditSubprocessComponent implements OnInit, OnDestroy {
  private repoId: string;

  // Typeahead search
  search?: string;
  suggestions$?: Observable<Process[]>;

  // New: catalog (all processes) + filter
  allProcesses: Process[] = [];
  allApiCalls: ApiCall[] = [];
  catalogFilter = '';
  catalogCollapsed = true;

  subProcessForm: FormGroup;
  apiCallForm: FormGroup;
  process: Process;
  private processId: string;
  subProcesses: ProcessWithStep[];
  availableSubProcesses: Process[];
  availableApiCalls: ApiCall[];
  private subscription: Subscription;


  constructor(private processService: ProcessService, private apiCallService: ApiCallService, private formBuilder: FormBuilder, private route: ActivatedRoute, private router: Router, private toastr: ToastrService) {
  }

  typeaheadOnSelect(e: TypeaheadMatch): void {
    this.addSubProcess(e.item.id);
  }

  ngOnInit() {

    this.subProcessForm = this.formBuilder.group({
      name: ['', Validators.required],
      description: [''],
    });

    this.apiCallForm = this.formBuilder.group({
      name: ['', Validators.required],
      description: [''],
    });

    this.refresh();

    // Load all processes for the catalog
    this.processService.all().pipe(first()).subscribe(list => {
      this.allProcesses = list || [];
    });

    // Load all api calls for the catalog
    this.apiCallService.all().pipe(first()).subscribe(list => {
      this.allApiCalls = list || [];
    });

    this.suggestions$ = new Observable((observer: Observer<string | undefined>) => observer.next(this.search)).pipe(
      switchMap((query: string) => {
        if (query) {
          return this.processService.byName(this.repoId, query).pipe(
            map((data: Process[]) => data || []),
            tap(() => noop, err => this.toastr.error(err && err.message || 'Something goes wrong'))
          );
        }
        return of([]);
      })
    );


    this.subscription = this.route.parent.paramMap.subscribe(obs => {
      this.repoId = obs.get('repoId');
      this.refresh()
    });
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  get filteredCatalog(): any[] {
    let processList = this.allProcesses || [];
    let apiCallList = this.allApiCalls || [];

    // Exclude the current process itself
    if (this.processId) {
      processList = processList.filter(p => p.id !== this.processId);
    }
    // Optionally exclude already added steps to avoid duplicates in the UI
    if (this.process && this.process.steps && this.process.steps.length) {
      const usedProcesses = new Set(this.process.steps.map(s => s.processReference));
      const usedApiCalls = new Set(this.process.steps.map(s => s.apiCallReference));
      processList = processList.filter(p => !usedProcesses.has(p.id));
      apiCallList = apiCallList.filter(a => !usedApiCalls.has(a.id));
    }

    const term = (this.catalogFilter || '').toLowerCase().trim();
    if (term) {
      processList = processList.filter(p =>
        (p.name || '').toLowerCase().includes(term) ||
        (p.description || '').toLowerCase().includes(term)
      );
      apiCallList = apiCallList.filter(a =>
        (a.name || '').toLowerCase().includes(term) ||
        (a.description || '').toLowerCase().includes(term)
      );
    }
    return [...processList, ...apiCallList].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }

  private refresh() {
    this.processId = this.route.parent.snapshot.paramMap.get('id');
    if (this.processId) {
      this.processService.byId(this.processId).pipe(first()).subscribe(process => {
        this.process = process;

        if (this.process.steps) {
          const processIds = this.process.steps.filter(s => !!s.processReference).map(s => s.processReference);
          const apiCallIds = this.process.steps.filter(s => !!s.apiCallReference).map(s => s.apiCallReference);

          forkJoin({
            processes: processIds.length > 0 ? this.processService.byIds(processIds).pipe(first()) : of([]),
            apiCalls: apiCallIds.length > 0 ? this.apiCallService.byIds(apiCallIds).pipe(first()) : of([])
          }).subscribe(({processes, apiCalls}) => {
            const processMap = new Map(processes.map(p => [p.id, p]));
            const apiCallMap = new Map(apiCalls.map(a => [a.id, a]));

            this.availableSubProcesses = processes;
            this.availableApiCalls = apiCalls;

            this.subProcesses = this.process.steps.map(step => {
              const pws = new ProcessWithStep();
              pws.stepDetails = step;
              if (step.processReference && processMap.has(step.processReference)) {
                pws.process = processMap.get(step.processReference) as Process;
              } else if (step.apiCallReference && apiCallMap.has(step.apiCallReference)) {
                pws.apiCall = apiCallMap.get(step.apiCallReference) as ApiCall;
              }
              return pws;
            }).filter(pws => !!pws.process || !!pws.apiCall);
          });
        } else {
          this.subProcesses = [];
        }
      });
    } else {
      this.process = new Process();
    }
  }

  onUpdate() {
    this.processService.update(this.processId, this.process).pipe(first()).subscribe(() => {
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
      this.processService.create(subProcess).pipe(first()).subscribe(docRef => {
        this.addSubProcess(docRef.id);
      });
    }
  }

  createApiCall() {
    Object.keys(this.apiCallForm.controls).forEach(field => {
      const control = this.apiCallForm.get(field);
      control.markAsTouched({ onlySelf: true });
    });

    if (this.apiCallForm.valid) {
      let apiCall = new ApiCall();
      apiCall = Object.assign(apiCall, this.apiCallForm.value);
      this.apiCallService.create(apiCall).pipe(first()).subscribe(docRef => {
        this.addApiCall(docRef.id);
      });
    }
  }

  private addSubProcess(id: string) {
    if(!this.process.steps) {
      this.process.steps = [];
    }

    const step = new Step();
    step.processReference = id;

    this.process.steps.push( step);
    this.onUpdate();
  }

  private addApiCall(id: string) {
    if(!this.process.steps) {
      this.process.steps = [];
    }

    const step = new Step();
    step.apiCallReference = id;

    this.process.steps.push( step);
    this.onUpdate();
  }


  delete(pws: ProcessWithStep) {
    if (this.process.steps !== null) {
      const index = this.process.steps.findIndex(item =>
        (pws.process && item.processReference === pws.process.id) ||
        (pws.apiCall && item.apiCallReference === pws.apiCall.id)
      );
      if (index >= 0) {
        this.process.steps.splice(index, 1);
        this.onUpdate();
      }
    }
  }

  drop(event: CdkDragDrop<any>) {
     // Reorder inside the steps list
     if (event.previousContainer === event.container) {
       moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
       this.updateList(event.container.data);
     } else {
       // Dragged from catalog to steps list
       const dragged = event.item.data;
       if (!dragged) {
         return;
       }
       if (!this.process.steps) {
         this.process.steps = [];
       }

       const isProcess = 'status' in dragged; // Process has status, ApiCall doesn't necessarily or we check type
       const exists = this.process.steps.some(s =>
         (isProcess && s.processReference === dragged.id) ||
         (!isProcess && s.apiCallReference === dragged.id)
       );

       if (exists) {
         this.toastr.info('Step already added');
         return;
       }
       const newStep = new Step();
       if (isProcess) {
         newStep.processReference = dragged.id;
       } else {
         newStep.apiCallReference = dragged.id;
       }
       // Insert at the dropped position if valid, else push at the end
       const insertAt = typeof event.currentIndex === 'number' ? event.currentIndex : this.process.steps.length;
       if (insertAt >= 0 && insertAt <= this.process.steps.length) {
         this.process.steps.splice(insertAt, 0, newStep);
       } else {
         this.process.steps.push(newStep);
       }
       this.onUpdate();
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
      if((processWithStep.process && step.processReference === processWithStep.process.id) ||
         (processWithStep.apiCall && step.apiCallReference === processWithStep.apiCall.id)) {
        step.successors = processWithStep.stepDetails.successors;
        break;
      }
    }
    this.onUpdate();

  }
}
