import {Component, OnDestroy, OnInit} from '@angular/core';
import {ProcessService} from '../services/process.service';
import {Process} from '../models/process';
import {FormBuilder} from '@angular/forms';
import {ActivatedRoute, Router} from '@angular/router';
import {first} from 'rxjs/operators';
import {ToastrService} from 'ngx-toastr';

@Component({templateUrl: './process-edit-used-by.component.html'})
export class ProcessEditUsedByComponent implements OnInit, OnDestroy {
  processId: string;
  process: Process;
  parentProcesses: Process[];
  private subscription: any;
  private repoId: string;

  constructor(private processService: ProcessService, private formBuilder: FormBuilder, private route: ActivatedRoute, private router: Router, private toastr: ToastrService) {
  }

  ngOnInit() {
    this.processId = this.route.parent.snapshot.paramMap.get('id');
    this.processService.byId(this.processId).pipe(first()).subscribe(process => {
      this.process = process;
    });

    this.subscription = this.route.parent.paramMap.subscribe(obs => {
      this.repoId = obs.get('repoId');
      this.refresh()
    });
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  refresh() {
    this.processService.allParents(this.processId).pipe(first()).subscribe(parentProcesses => {
      this.parentProcesses = parentProcesses;
    });
  }
}
