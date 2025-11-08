import {Component, OnDestroy, OnInit} from '@angular/core';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {ActivatedRoute, Router} from '@angular/router';
import {first} from 'rxjs/operators';
import {ToastrService} from 'ngx-toastr';
import {ApiCallService} from '../services/api-call.service';
import {ApiCall} from '../models/api-call';
import {Observable, Subscription} from 'rxjs';
import {Capability} from '../models/capability';
import {CapabilityService} from '../services/capability.service';
import {Application} from '../models/application';
import {ApplicationService} from '../services/application.service';

@Component({selector: 'app-function-edit', templateUrl: './api-call-edit-base.component.html'})
export class ApiCallEditBaseComponent implements OnInit, OnDestroy {

  apiCallForm: FormGroup;
  apiCall: ApiCall;
  private apiCallId: string;
  capabilities$: Observable<Capability[]>;
  systems$: Observable<Application[]>;
  repoId: string;
  private subscription: Subscription;


  constructor(private apiCallService: ApiCallService, private capabilityService: CapabilityService, private systemService: ApplicationService,
              private formBuilder: FormBuilder, private route: ActivatedRoute, private router: Router, private toastr: ToastrService) {
  }


  ngOnInit() {
    this.apiCallForm = this.formBuilder.group({
      name: ['', Validators.required],
      description: [''],
      implementationStatus: [''],
      implementationType: [''],
      status: [0],
      capabilityId: [''],
      implementedBy: [],
      tags: [],
      input: [''],
      output: [''],
    });

    this.subscription = this.route.parent.paramMap.subscribe(obs => {
      this.repoId = obs.get('repoId');
      this.systems$ = this.systemService.all(this.repoId);
      this.capabilities$ = this.capabilityService.all(this.repoId);

      if(this.repoId && this.repoId !== obs.get('repoId')) {
        this.router.navigateByUrl('/r/' + obs.get('repoId') + '/apiCall').then(() => {
        });
      } else {
        this.repoId = obs.get('repoId');
        this.refresh();
      }
    });
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  private refresh() {
    this.apiCallId = this.route.parent.snapshot.paramMap.get('id');
    if (this.apiCallId != null) {
      this.apiCallService.byId(this.apiCallId).pipe(first()).subscribe(apiCall => {
        this.apiCall = apiCall;
        this.apiCallForm.patchValue(this.apiCall);
      });
    } else {
      this.apiCall = new ApiCall();
    }
  }

  onUpdate() {
    Object.keys(this.apiCallForm.controls).forEach(field => {
      const control = this.apiCallForm.get(field);
      control.markAsTouched({ onlySelf: true });
    });

    if (this.apiCallForm.valid) {
      this.apiCall = Object.assign(this.apiCall, this.apiCallForm.value);
      this.apiCall.repoId = this.repoId;
      if(!this.apiCallId) {
        this.apiCallService.create(this.apiCall).pipe(first()).subscribe(docRef => {
          this.router.navigateByUrl('/apiCall/edit/' + docRef.id).then(() => {
            this.toastr.info('ApiCall created successfully');
            this.refresh()
          });
        });
      } else {
        this.apiCallService.update(this.apiCallId, this.apiCall).pipe(first()).subscribe(() => {
          this.toastr.info('ApiCall updated successfully');
          this.refresh();
        });
      }
    }
  }

  delete() {
    this.apiCallService.delete(this.apiCallId).pipe(first()).subscribe(() => {
      this.router.navigateByUrl('/apiCall').then(() => {
        this.toastr.info('ApiCall deleted successfully');
      });
    })
  }
}
