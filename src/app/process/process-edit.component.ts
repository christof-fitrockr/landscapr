import {Component, OnInit} from '@angular/core';
import {ProcessService} from '../services/process.service';
import {FormBuilder} from '@angular/forms';
import {ActivatedRoute, Router} from '@angular/router';
import {ToastrService} from 'ngx-toastr';

@Component({selector: 'app-process-edit', templateUrl: './process-edit.component.html'})
export class ProcessEditComponent implements OnInit {

  processId: string;


  constructor(private processService: ProcessService, private formBuilder: FormBuilder, private route: ActivatedRoute, private router: Router, private toastr: ToastrService) {
  }

  ngOnInit() {
    this.processId = this.route.snapshot.paramMap.get('id');
  }

}
