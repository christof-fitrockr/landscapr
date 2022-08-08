import {Component, OnInit} from '@angular/core';
import {first} from 'rxjs/operators';
import {ApiCallService} from '../services/api-call.service';
import {ApiCall} from '../models/api-call';

@Component({selector: 'app-api-call-list', templateUrl: './api-call-list.component.html'})
export class ApiCallListComponent implements OnInit {

  constructor(private apiCallService: ApiCallService) {
  }

  apiCalls: ApiCall[];
  searchText: string;

  ngOnInit() {
    this.apiCallService.all().pipe(first()).subscribe(apiCalls => {
      this.apiCalls = apiCalls;
    });
  }
}
