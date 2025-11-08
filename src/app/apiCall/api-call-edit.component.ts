import {Component, OnInit} from '@angular/core';
import {FormBuilder} from '@angular/forms';
import {ActivatedRoute} from '@angular/router';
import {ApiCallService} from '../services/api-call.service';

@Component({selector: 'app-function-edit', templateUrl: './api-call-edit.component.html'})
export class ApiCallEditComponent implements OnInit {

  processId: string;

  constructor(private apiCallService: ApiCallService, private formBuilder: FormBuilder, private route: ActivatedRoute) {
  }

  ngOnInit() {
    this.processId = this.route.snapshot.paramMap.get('id');
  }
}
