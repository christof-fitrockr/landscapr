import {Component, OnInit} from '@angular/core';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {ActivatedRoute, Router} from '@angular/router';
import {first} from 'rxjs/operators';
import {ToastrService} from 'ngx-toastr';
import {CapabilityService} from '../services/capability.service';
import {Capability} from '../models/capability';

@Component({selector: 'app-capability-edit', templateUrl: './capability-edit-base.component.html'})
export class CapabilityEditBaseComponent implements OnInit {

  capabilityForm: FormGroup;
  capability: Capability;
  private capabilityId: string;


  constructor(private capabilityService: CapabilityService, private formBuilder: FormBuilder,
              private route: ActivatedRoute, private router: Router, private toastr: ToastrService) {
  }


  ngOnInit() {
    this.capabilityForm = this.formBuilder.group({
      name: ['', Validators.required],
      status: [0],
      description: [''],
      tags: ['']
    });

    this.refresh();
  }

  private refresh() {
    this.capabilityId = this.route.parent.snapshot.paramMap.get('id');
    if (this.capabilityId != null) {
      this.capabilityService.getCapabilityById(this.capabilityId).pipe(first()).subscribe(capability => {
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
      if(!this.capabilityId) {
        this.capabilityService.createCapability(this.capability).then(docRef => {
          this.router.navigateByUrl('/capability/edit/' + docRef.id).then(() => {
            this.toastr.info('Capability created successfully');
            this.refresh()
          });
        });
      } else {
        this.capabilityService.updateCapability(this.capabilityId, this.capability).then(() => {
          this.toastr.info('Capability updated successfully');
          this.refresh();
        });
      }
    }
  }

  delete() {
    this.capabilityService.deleteCapability(this.capabilityId).then(() => {
      this.router.navigate(['/capability']).then(() => {
        this.toastr.info('Capability deleted successfully');
      });
    })
  }
}
