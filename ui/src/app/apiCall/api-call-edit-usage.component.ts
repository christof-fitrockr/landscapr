import {Component, OnInit} from '@angular/core';
import {FormBuilder} from '@angular/forms';
import {ActivatedRoute, Router} from '@angular/router';
import {ToastrService} from 'ngx-toastr';
import {first} from 'rxjs/operators';
import {ApiCall} from '../models/api-call';
import {ApiCallService} from '../services/api-call.service';
import {Process} from '../models/process';
import {ProcessService} from '../services/process.service';

@Component({templateUrl: './api-call-edit-usage.component.html'})
export class ApiCallEditUsageComponent implements OnInit {

  apiCallId: string;
  apiCall: ApiCall;
  usedBy: Process[];

  constructor(private apiCallService: ApiCallService, private processService: ProcessService, private formBuilder: FormBuilder,
              private route: ActivatedRoute, private router: Router, private toastr: ToastrService) {
  }

  ngOnInit() {
    this.apiCallId = this.route.parent.snapshot.paramMap.get('id');
    this.apiCallService.byId(this.apiCallId).pipe(first()).subscribe(apiCall => {
      this.apiCall = apiCall;
    });
    this.processService.getProcessesByApiCall(this.apiCallId).pipe(first()).subscribe(usedBy => {
      this.usedBy = usedBy;
    });
  }

}
