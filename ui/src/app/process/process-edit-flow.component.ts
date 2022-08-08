import {Component, OnInit} from '@angular/core';
import {ProcessService} from '../services/process.service';
import {FormBuilder} from '@angular/forms';
import {ActivatedRoute, Router} from '@angular/router';
import {ToastrService} from 'ngx-toastr';
import {first} from 'rxjs/operators';
import {Process} from '../models/process';

@Component({templateUrl: './process-edit-flow.component.html'})
export class ProcessEditFlowComponent implements OnInit {

  processId: string;
  process: Process;

  constructor(private processService: ProcessService, private formBuilder: FormBuilder, private route: ActivatedRoute, private router: Router, private toastr: ToastrService) {
  }

  ngOnInit() {
    this.processId = this.route.parent.snapshot.paramMap.get('id');
    this.processService.byId(this.processId).pipe(first()).subscribe(process => {
      this.process = process;
    });
  }

  processNodeClicked(processId: string) {
    this.router.navigateByUrl('/process/edit/' + processId + '/base')
  }
}
