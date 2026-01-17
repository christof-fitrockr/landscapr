import {Component, OnInit} from '@angular/core';
import {ProcessService} from '../services/process.service';
import {Process} from '../models/process';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {ActivatedRoute, Router} from '@angular/router';
import {catchError, first, map, switchMap, tap} from 'rxjs/operators';
import {ToastrService} from 'ngx-toastr';
import {forkJoin, noop, Observable, Observer, of} from 'rxjs';
import {TypeaheadMatch} from 'ngx-bootstrap/typeahead';
import {ApiCall} from '../models/api-call';
import {ApiCallService} from '../services/api-call.service';

@Component({templateUrl: './process-edit-api-calls.component.html'})
export class ProcessEditApiCallsComponent implements OnInit {

  processId: string;
  process: Process;

  search?: string;
  suggestions$?: Observable<Process[]>;

  apiCallForm: FormGroup;
  apiCalls: ApiCall[];
  allApiCalls: ApiCall[];
  repoId: string;
  modalSearch: string = '';


  constructor(private processService: ProcessService, private apiCallService: ApiCallService, private formBuilder: FormBuilder,
              private route: ActivatedRoute, private router: Router, private toastr: ToastrService) {
  }

  typeaheadOnSelect(e: TypeaheadMatch): void {
    this.addApiCall(e.item.id);
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
    this.apiCallService.all().pipe(first()).subscribe(all => this.allApiCalls = all);

    this.suggestions$ = new Observable((observer: Observer<string | undefined>) => observer.next(this.search)).pipe(
      switchMap((query: string) => {
        if (query) {
          return this.apiCallService.byName(this.repoId, query).pipe(
            map((data: ApiCall[]) => data || []),
            tap(() => noop, err => this.toastr.error(err && err.message || 'Something went wrong'))
          );
        }
        return of([]);
      })
    );
  }

  private refresh() {
    this.processId = this.route.parent.snapshot.paramMap.get('id');
    if (this.processId != null) {
      this.processService.byId(this.processId).pipe(
        first(),
        tap(process => this.process = process),
        switchMap(process => {
          if (process.apiCallIds && process.apiCallIds.length > 0) {
            const observables = process.apiCallIds.map(item =>
              this.apiCallService.byId(item).pipe(
                first(),
                catchError(() => of(null))
              )
            );
            return forkJoin(observables);
          } else {
            return of([]);
          }
        })
      ).subscribe(apiCalls => {
        this.apiCalls = apiCalls.filter(apiCall => apiCall !== null);
        if (this.apiCalls.length !== this.process.apiCallIds.length) {
          this.process.apiCallIds = this.apiCalls.map(a => a.id);
          this.processService.update(this.processId, this.process).pipe(first()).subscribe();
        }
      });
    }
  }

  onUpdate() {
    this.processService.update(this.processId, this.process).pipe(first()).subscribe(() => {
      this.toastr.info('Process updated successfully');
      this.refresh();
      this.apiCallService.all().pipe(first()).subscribe(all => this.allApiCalls = all);
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
    this.apiCallService.all().pipe(first()).subscribe(all => this.allApiCalls = all);
  }

  moveUp(apiCallId: string) {
    if (this.process.apiCallIds !== null) {
      const index = this.process.apiCallIds.findIndex(item => item === apiCallId);
      if (index >= 1) {
        this.process.apiCallIds.splice(index - 1, 0, this.process.apiCallIds.splice(index, 1)[0]);
        this.onUpdate();
      }
    }
  }

  moveDown(apiCallId: string) {
    if (this.process.apiCallIds !== null) {
      const index = this.process.apiCallIds.findIndex(item => item === apiCallId);
      if (index >= 0 && index < this.process.apiCallIds.length - 1) {
        this.process.apiCallIds.splice(index + 1, 0, this.process.apiCallIds.splice(index, 1)[0]);
        this.onUpdate();
      }
    }
  }

  delete(apiCallId: string) {
    if (this.process.apiCallIds !== null) {
      const index = this.process.apiCallIds.findIndex(item => item === apiCallId);
      if (index >= 0) {
        this.process.apiCallIds.splice(index, 1);
        this.onUpdate();
      }
    }
  }
}
