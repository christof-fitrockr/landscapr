import {Component, OnInit} from '@angular/core';
import {ProcessService} from '../services/process.service';
import {Process} from '../models/process';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {ActivatedRoute, Router} from '@angular/router';
import {first, map, switchMap, debounceTime, distinctUntilChanged, catchError} from 'rxjs/operators';
import {ToastrService} from 'ngx-toastr';
import {Observable, of, Subject} from 'rxjs';
import {ApiCall} from '../models/api-call';
import {ApiCallService} from '../services/api-call.service';

@Component({templateUrl: './process-edit-api-calls.component.html'})
export class ProcessEditApiCallsComponent implements OnInit {

  private processId: string;
  process: Process;

  suggestions$?: Observable<ApiCall[]>;
  apiCallInput$ = new Subject<string>();
  selectedApiCallId?: string;

  apiCallForm: FormGroup;
  apiCalls: ApiCall[];
  repoId: string;


  constructor(private processService: ProcessService, private apiCallService: ApiCallService, private formBuilder: FormBuilder,
              private route: ActivatedRoute, private router: Router, private toastr: ToastrService) {
  }

  onApiCallSelected(apiCallId: string) {
    if (apiCallId) {
      this.addApiCall(apiCallId);
    }
    this.selectedApiCallId = undefined;
  }

  ngOnInit() {

    this.apiCallForm = this.formBuilder.group({
      name: ['', Validators.required],
      description: [''],
    });

    this.route.parent.paramMap.subscribe(obs => {
      this.repoId = obs.get('repoId');
    });

    this.refresh();

    this.suggestions$ = this.apiCallInput$.pipe(
      debounceTime(200),
      distinctUntilChanged(),
      switchMap((term: string) => {
        if (!!term && this.repoId) {
          return this.apiCallService.byName(this.repoId, term).pipe(
            map((data: ApiCall[]) => data || []),
            catchError(err => {
              this.toastr.error((err && err.message) || 'Something went wrong');
              return of([]);
            })
          );
        }
        return of([]);
      })
    );
  }

  private refresh() {
    this.processId = this.route.parent.snapshot.paramMap.get('id');
    if (this.processId != null) {
      this.processService.byId(this.processId).pipe(first()).subscribe(process => {
        this.process = process;

        // todo seqquential
        if(this.process.apiCallIds) {
          this.apiCalls = [];
          this.process.apiCallIds.forEach(item => {
            this.apiCallService.byId(item).pipe(first()).subscribe(result => {
              this.apiCalls.push(result);
            })
          });
        }

      });
    }
  }

  onUpdate() {
    this.processService.update(this.processId, this.process).pipe(first()).subscribe(() => {
      this.toastr.info('Process updated successfully');
      this.refresh();
    });
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

  private addApiCall(id: string) {
    if(!this.process.apiCallIds) {
      this.process.apiCallIds = [];
    }
    this.process.apiCallIds.push( id);
    this.onUpdate();
  }

  moveUp(processId: string) {
    if (this.process.apiCallIds !== null) {
      const index = this.process.apiCallIds.findIndex(item => item === processId);
      if (index >= 1) {
        this.process.apiCallIds.splice(index - 1, 0, this.process.apiCallIds.splice(index, 1)[0]);
        this.onUpdate();
      }
    }
  }

  moveDown(processId: string) {
    if (this.process.apiCallIds !== null) {
      const index = this.process.apiCallIds.findIndex(item => item === processId);
      if (index >= 0 && index < this.process.apiCallIds.length - 1) {
        this.process.apiCallIds.splice(index + 1, 0, this.process.apiCallIds.splice(index, 1)[0]);
        this.onUpdate();
      }
    }
  }

  delete(processId: string) {
    if (this.process.apiCallIds !== null) {
      const index = this.process.apiCallIds.findIndex(item => item === processId);
      if (index >= 0) {
        this.process.apiCallIds.splice(index, 1);
        this.onUpdate();
      }
    }
  }
}
