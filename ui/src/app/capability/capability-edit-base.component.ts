import {Component, OnDestroy, OnInit} from '@angular/core';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {ActivatedRoute, Router} from '@angular/router';
import {first} from 'rxjs/operators';
import {ToastrService} from 'ngx-toastr';
import {CapabilityService} from '../services/capability.service';
import {Capability} from '../models/capability';
import {Subscription} from 'rxjs';

@Component({selector: 'app-capability-edit', templateUrl: './capability-edit-base.component.html'})
export class CapabilityEditBaseComponent implements OnInit, OnDestroy {

  capabilityForm: FormGroup;
  capability: Capability;
  repoId: string;
  private capabilityId: string;
  private subscription: Subscription;


  constructor(private capabilityService: CapabilityService, private formBuilder: FormBuilder,
              private route: ActivatedRoute, private router: Router, private toastr: ToastrService) {
  }


  ngOnInit() {
    this.capabilityForm = this.formBuilder.group({
      name: ['', Validators.required],
      status: [0],
      description: [''],
      tags: []
    });

    this.subscription = this.route.parent.paramMap.subscribe(obs => {
      if(this.repoId && this.repoId !== obs.get('repoId')) {
        this.router.navigateByUrl('/r/' + obs.get('repoId') + '/capability').then(() => {
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
    this.capabilityId = this.route.parent.snapshot.paramMap.get('id');
    if (this.capabilityId != null) {
      this.capabilityService.byId(this.capabilityId).pipe(first()).subscribe(capability => {
        this.capability = capability;
        this.capabilityForm.patchValue(this.capability);
      });
    } else {
      this.capability = new Capability();
    }
  }

  onUpdate() {
    Object.keys(this.capabilityForm.controls).forEach(field => {
      const control = this.capabilityForm.get(field);
      control.markAsTouched({ onlySelf: true });
    });

    if (this.capabilityForm.valid) {
      this.capability = Object.assign(this.capability, this.capabilityForm.value);
      this.capability.repoId = this.repoId;
      if(!this.capabilityId) {
        this.capabilityService.create(this.capability).pipe(first()).subscribe(doc => {
          this.router.navigateByUrl('/r/' + this.repoId + '/capability/edit/' + doc.id).then(() => {
            this.toastr.info('Capability created successfully');
            this.refresh()
          });
        });
      } else {
        this.capabilityService.update(this.capabilityId, this.capability).pipe(first()).subscribe(() => {
          this.router.navigateByUrl('/r/' + this.repoId + '/capability').then(() => {
            this.toastr.info('Capability updated successfully');
          });
        });
      }
    }
  }

  delete() {
    this.capabilityService.delete(this.capabilityId).pipe(first()).subscribe(() => {
      this.router.navigate(['/capability']).then(() => {
        this.toastr.info('Capability deleted successfully');
      });
    })
  }
}
