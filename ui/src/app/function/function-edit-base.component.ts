import {Component, OnInit} from '@angular/core';
import {ProcessService} from '../services/process.service';
import {Process} from '../models/process';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {ActivatedRoute, Router} from '@angular/router';
import {first} from 'rxjs/operators';
import {ToastrService} from 'ngx-toastr';
import {ApiCallService} from '../services/api-call.service';
import {ApiCall} from '../models/api-call';
import {Observable} from 'rxjs';
import {Capability} from '../models/capability';
import {CapabilityService} from '../services/capability.service';
import {System} from '../models/system';
import {SystemService} from '../services/system.service';

@Component({selector: 'app-function-edit', templateUrl: './function-edit-base.component.html'})
export class FunctionEditBaseComponent implements OnInit {

  apiCallForm: FormGroup;
  apiCall: ApiCall;
  private apiCallId: string;
  capabilities$: Observable<Capability[]>;
  systems$: Observable<System[]>;


  constructor(private apiCallService: ApiCallService, private capabilityService: CapabilityService, private systemService: SystemService,
              private formBuilder: FormBuilder, private route: ActivatedRoute, private router: Router, private toastr: ToastrService) {
  }


  ngOnInit() {
    this.apiCallForm = this.formBuilder.group({
      name: ['', Validators.required],
      description: [''],
      implementationStatus: [''],
      implementationType: [''],
      dataStatus: [0],
      capabilityId: [''],
      implementedBy: [''],
      tags: [''],
      input: [''],
      output: [''],
    });

    this.systems$ = this.systemService.allSystems()
    this.capabilities$ = this.capabilityService.all();
    this.refresh();
  }

  private refresh() {
    this.apiCallId = this.route.parent.snapshot.paramMap.get('id');
    if (this.apiCallId != null) {
      this.apiCallService.getApiCallById(this.apiCallId).pipe(first()).subscribe(apiCall => {
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
      if(!this.apiCallId) {
        this.apiCallService.createApiCall(this.apiCall).then(docRef => {
          this.router.navigateByUrl('/function/edit/' + docRef.id).then(() => {
            this.toastr.info('ApiCall created successfully');
            this.refresh()
          });
        });
      } else {
        this.apiCallService.updateApiCall(this.apiCallId, this.apiCall).then(() => {
          this.toastr.info('ApiCall updated successfully');
          this.refresh();
        });
      }
    }
  }

  delete() {
    this.apiCallService.deleteApiCall(this.apiCallId).then(() => {
      this.router.navigate(['/function']).then(() => {
        this.toastr.info('ApiCall deleted successfully');
      });
    })
  }
}
