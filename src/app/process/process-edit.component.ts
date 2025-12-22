import {Component, OnInit} from '@angular/core';
import {ProcessService} from '../services/process.service';
import {FormBuilder} from '@angular/forms';
import {ActivatedRoute, Router} from '@angular/router';
import {ToastrService} from 'ngx-toastr';
import {Process} from '../models/process';
import {Comment} from '../models/comment';

@Component({selector: 'app-process-edit', templateUrl: './process-edit.component.html'})
export class ProcessEditComponent implements OnInit {

  processId: string;
  process: Process;
  showCommentsPanel = false;


  constructor(private processService: ProcessService, private formBuilder: FormBuilder, private route: ActivatedRoute, private router: Router, private toastr: ToastrService) {
  }

  ngOnInit() {
    this.processId = this.route.snapshot.paramMap.get('id');
    if (this.processId) {
      this.processService.byId(this.processId).subscribe(p => {
        this.process = p;
      });
    }
  }

  updateProcessComments(comments: Comment[]) {
    if (!this.process) return;
    this.process.comments = comments;
    this.processService.update(this.process.id, this.process).subscribe();
  }

}
