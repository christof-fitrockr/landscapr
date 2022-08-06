import {Component, OnInit} from '@angular/core';
import {first} from 'rxjs/operators';
import {ApiCallService} from '../services/api-call.service';
import {ApiCall} from '../models/api-call';

@Component({selector: 'app-function-list', templateUrl: './function-list.component.html'})
export class FunctionListComponent implements OnInit {

  constructor(private apiCallService: ApiCallService) {
  }

  apiCalls: ApiCall[];
  searchText: string;

  ngOnInit() {
    this.apiCallService.allApiCalls().pipe(first()).subscribe(apiCalls => {
      this.apiCalls = apiCalls;
    });
  }
}
