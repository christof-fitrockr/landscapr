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
import {BsModalService} from 'ngx-bootstrap/modal';
import {CapabilitySelectorDialogComponent} from '../components/capability-selector-dialog/capability-selector-dialog.component';

@Component({selector: 'app-function-edit', templateUrl: './api-call-edit-base.component.html', styleUrls: ['./api-call-edit-base.component.scss']})
export class ApiCallEditBaseComponent implements OnInit, OnDestroy {

  apiCallForm: FormGroup;
  apiCall: ApiCall;
  apiCallId: string;
  capabilities$: Observable<Capability[]>;
  selectedCapability: Capability | null = null;
  systems$: Observable<Application[]>;
  repoId: string;
  private subscription: Subscription;


  constructor(private apiCallService: ApiCallService, private capabilityService: CapabilityService, private systemService: ApplicationService,
              private formBuilder: FormBuilder, private route: ActivatedRoute, private router: Router, private toastr: ToastrService,
              private modalService: BsModalService) {
  }


  ngOnInit() {
    this.apiCallForm = this.formBuilder.group({
      name: ['', Validators.required],
      description: [''],
      implementationStatus: [''],
      apiType: [null],
      status: [0],
      capabilityId: [''],
      apiGroup: [''],
      documentation: [''],
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
        this.updateSelectedCapability(apiCall.capabilityId);
      });
    } else {
      this.apiCall = new ApiCall();
    }
  }

  private updateSelectedCapability(id: string) {
    if (!id) { this.selectedCapability = null; return; }
    this.capabilityService.byId(id).pipe(first()).subscribe(c => {
      this.selectedCapability = c;
    });
  }

  selectCapability() {
    const modalRef = this.modalService.show(CapabilitySelectorDialogComponent, {
      initialState: {
        repoId: this.repoId,
        initialSelectedIds: this.apiCallForm.get('capabilityId').value ? [this.apiCallForm.get('capabilityId').value] : []
      },
      class: 'modal-lg'
    });
    modalRef.content.onClose.pipe(first()).subscribe((result: Set<string>) => {
      if (result && result.size > 0) {
        const id = Array.from(result)[0];
        this.apiCallForm.get('capabilityId').setValue(id);
        this.updateSelectedCapability(id);
      }
    });
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
