import {Component, OnDestroy, OnInit} from '@angular/core';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {ActivatedRoute, Router} from '@angular/router';
import {first} from 'rxjs/operators';
import {ToastrService} from 'ngx-toastr';
import {ApplicationService} from '../services/application.service';
import {Application} from '../models/application';

@Component({selector: 'app-system-edit', templateUrl: './system-edit-base.component.html'})
export class SystemEditBaseComponent implements OnInit {

  systemForm: FormGroup;
  system: Application;
  private systemId: string;

  constructor(private systemService: ApplicationService, private formBuilder: FormBuilder,
              private route: ActivatedRoute, private router: Router, private toastr: ToastrService) {
  }


  ngOnInit() {
    this.systemForm = this.formBuilder.group({
      name: ['', Validators.required],
      description: [''],
      status: [0],
      contact: [''],
      url: [''],
      tags: [],
      systemCluster: ['']
    });
    this.refresh();
  }

  private refresh() {
    this.systemId = this.route.parent.snapshot.paramMap.get('id');
    if (this.systemId != null) {
      this.systemService.byId(this.systemId).pipe(first()).subscribe(system => {
        this.system = system;
        this.systemForm.patchValue(this.system);
      });
    } else {
      this.system = new Application();
    }
  }

  onUpdate() {
    Object.keys(this.systemForm.controls).forEach(field => {
      const control = this.systemForm.get(field);
      control.markAsTouched({ onlySelf: true });
    });

    if (this.systemForm.valid) {
      this.system = Object.assign(this.system, this.systemForm.value);
      if(!this.systemId) {
        this.systemService.create(this.system).pipe(first()).subscribe(system => {

          this.router.navigateByUrl('/system/edit/' + system.id).then(() => {
            this.toastr.info('System created successfully');
            this.refresh()
          });
        });
      } else {
        this.systemService.update(this.systemId, this.system).pipe(first()).subscribe(() => {
          this.toastr.info('System updated successfully');
          this.refresh();
        });
      }
    }
  }

  delete() {
    this.systemService.delete(this.systemId).pipe(first()).subscribe(() => {
      this.router.navigateByUrl('/system').then(() => {
        this.toastr.info('System deleted successfully');
      });
    })
  }
}
