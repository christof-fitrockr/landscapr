import {Component, OnDestroy, OnInit} from '@angular/core';
import {ProcessService} from '../services/process.service';
import {Process} from '../models/process';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {ActivatedRoute, Router} from '@angular/router';
import {first} from 'rxjs/operators';
import {ToastrService} from 'ngx-toastr';
import {ApplicationService} from '../services/application.service';
import {Observable, Subscription} from 'rxjs';
import {Application} from '../models/application';

@Component({selector: 'app-process-edit', templateUrl: './process-edit-base.component.html', styleUrls: ['./process-edit-base.component.scss']})
export class ProcessEditBaseComponent implements OnInit, OnDestroy {

  processForm: FormGroup;
  process: Process;
  processId: string;
  systems$: Observable<Application[]>;
  repoId: string;
  private subscription: Subscription;
  roles: string[] = ['Customer', 'Vehicle', 'Service with Customer', 'Service', 'Workshop', 'Parts', 'Processing'];


  constructor(private processService: ProcessService, private systemService: ApplicationService,
              private formBuilder: FormBuilder, private route: ActivatedRoute, private router: Router, private toastr: ToastrService) {
  }


  ngOnInit() {
    this.processForm = this.formBuilder.group({
      name: ['', Validators.required],
      status: [0],
      description: [''],
      input: [''],
      output: [''],
      tags: [],
      role: [''],
      implementedBy: [],
    });


    this.subscription = this.route.parent.paramMap.subscribe(obs => {
      if(this.repoId && this.repoId !== obs.get('repoId')) {
        this.router.navigateByUrl('/r/' + obs.get('repoId') + '/process').then(() => {
        });
      } else {
        this.repoId = obs.get('repoId');
        this.refresh();
      }
      this.systems$ = this.systemService.all(this.repoId);
    });


    this.refresh();
  }
  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  private refresh() {
    this.processId = this.route.parent.snapshot.paramMap.get('id');
    if (this.processId != null) {
      this.processService.byId(this.processId).pipe(first()).subscribe(process => {
        this.process = process;
        this.processForm.patchValue(this.process);
      });
    } else {
      this.process = new Process();
    }
  }

  onUpdate() {
    Object.keys(this.processForm.controls).forEach(field => {
      const control = this.processForm.get(field);
      control.markAsTouched({ onlySelf: true });
    });

    if (this.processForm.valid) {
      this.process = Object.assign(this.process, this.processForm.value);
      this.process.repoId = this.repoId;
      if(!this.processId) {
        this.processService.create(this.process).pipe(first()).subscribe(docRef => {
          this.router.navigateByUrl('/process/edit/' + docRef.id).then(() => {
            this.toastr.info('Process created successfully');
            this.refresh()
          });
        });
      } else {
        this.processService.update(this.processId, this.process).pipe(first()).subscribe(() => {
          this.toastr.info('Process updated successfully');
          this.refresh();
        });
      }
    }
  }

  delete() {
    this.processService.delete(this.processId).pipe(first()).subscribe(() => {
      this.router.navigateByUrl('/process').then(() => {
        this.toastr.info('Process deleted successfully');
      });
    })
  }

  markAsFavorite(favorite: boolean) {
    this.process.favorite = favorite;
    this.onUpdate();
  }
}
