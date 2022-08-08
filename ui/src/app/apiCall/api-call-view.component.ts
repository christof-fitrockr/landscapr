import {Component, OnInit} from '@angular/core';
import {ApiCallService} from '../services/api-call.service';

@Component({selector: 'app-api-call-view', templateUrl: './api-call-view.component.html'})
export class ApiCallViewComponent implements OnInit {

  constructor(private apiCallService: ApiCallService) {
  }

  ngOnInit() {
  }
}
