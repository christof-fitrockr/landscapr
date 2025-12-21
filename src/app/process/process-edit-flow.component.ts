import {Component, OnDestroy, OnInit} from '@angular/core';
import {ProcessService} from '../services/process.service';
import {FormBuilder} from '@angular/forms';
import {ActivatedRoute, Router} from '@angular/router';
import {ToastrService} from 'ngx-toastr';
import {first} from 'rxjs/operators';
import {Process} from '../models/process';
import {Subscription} from 'rxjs';

@Component({templateUrl: './process-edit-flow.component.html', styleUrls: ['./process-edit-flow.component.scss']})
export class ProcessEditFlowComponent implements OnInit {

  processId: string;
  process: Process;
  repoId: string;

  zoomFactor = 0.6;

  constructor(private processService: ProcessService, private formBuilder: FormBuilder, private route: ActivatedRoute, private router: Router, private toastr: ToastrService) {
  }


  zoomIn() {
    this.zoomFactor += 0.1;
  }
  zoomOut() {
    this.zoomFactor -= 0.1;
  }


  ngOnInit() {
    this.processId = this.route.parent.snapshot.paramMap.get('id');
    this.refresh();
  }


  private refresh() {
    this.processService.byId(this.processId).pipe(first()).subscribe(process => {
      this.process = process;
      this.repoId = process.repoId;

    });
  }

  processNodeClicked(processId: string) {
    this.router.navigateByUrl('/process/edit/' + processId + '/base')
  }
}
