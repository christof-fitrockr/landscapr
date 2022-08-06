import {Component, OnInit} from '@angular/core';
import {ProcessService} from '../services/process.service';
import {ApiCallService} from '../services/api-call.service';

@Component({selector: 'app-function-view', templateUrl: './function-view.component.html'})
export class FunctionViewComponent implements OnInit {

  constructor(private apiCallService: ApiCallService) {
  }

  ngOnInit() {

  }
}
