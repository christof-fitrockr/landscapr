import {Component, OnInit} from '@angular/core';
import {ProcessService} from '../services/process.service';
import {Process} from '../models/process';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {ActivatedRoute, Router} from '@angular/router';
import {first} from 'rxjs/operators';
import {ToastrService} from 'ngx-toastr';
import {SystemService} from '../services/system.service';
import {Observable} from 'rxjs';
import {System} from '../models/system';

@Component({selector: 'app-process-edit', templateUrl: './process-edit-base.component.html'})
export class ProcessEditBaseComponent implements OnInit {

  processForm: FormGroup;
  process: Process;
  private processId: string;
  systems$: Observable<System[]>;


  constructor(private processService: ProcessService, private systemService: SystemService,
              private formBuilder: FormBuilder, private route: ActivatedRoute, private router: Router, private toastr: ToastrService) {
  }


  ngOnInit() {
    this.processForm = this.formBuilder.group({
      name: ['', Validators.required],
      status: [0],
      description: [''],
      input: [''],
      output: [''],
      tags: [''],
      role: [''],
      implementedBy: [''],
    });

    this.systems$ = this.systemService.allSystems()
    this.refresh();
  }

  private refresh() {
    this.processId = this.route.parent.snapshot.paramMap.get('id');
    if (this.processId != null) {
      this.processService.getProcessById(this.processId).pipe(first()).subscribe(process => {
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
      if(!this.processId) {
        this.processService.createProcess(this.process).then(docRef => {
          this.router.navigateByUrl('/process/edit/' + docRef.id).then(() => {
            this.toastr.info('Process created successfully');
            this.refresh()
          });
        });
      } else {
        this.processService.updateProcess(this.processId, this.process).then(() => {
          this.toastr.info('Process updated successfully');
          this.refresh();
        });
      }
    }
  }

  delete() {
    this.processService.deleteProcess(this.processId).then(() => {
      this.router.navigate(['/process']).then(() => {
        this.toastr.info('Process deleted successfully');
      });
    })
  }

  markAsFavorite(favorite: boolean) {
    this.process.favorite = favorite;
    this.onUpdate();
  }
}
