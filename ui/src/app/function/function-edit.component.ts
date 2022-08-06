import {Component, OnInit} from '@angular/core';
import {ProcessService} from '../services/process.service';
import {FormBuilder} from '@angular/forms';
import {ActivatedRoute, Router} from '@angular/router';
import {ToastrService} from 'ngx-toastr';
import {ApiCallService} from '../services/api-call.service';

@Component({selector: 'app-function-edit', templateUrl: './function-edit.component.html'})
export class FunctionEditComponent implements OnInit {

  processId: string;


  constructor(private apiCallService: ApiCallService, private formBuilder: FormBuilder, private route: ActivatedRoute, private router: Router, private toastr: ToastrService) {
  }

  ngOnInit() {
    this.processId = this.route.snapshot.paramMap.get('id');
  }

}
