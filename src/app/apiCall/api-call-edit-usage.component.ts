import {Component, OnInit} from '@angular/core';
import {FormBuilder} from '@angular/forms';
import {ActivatedRoute} from '@angular/router';
import {first} from 'rxjs/operators';
import {ApiCall} from '../models/api-call';
import {ApiCallService} from '../services/api-call.service';
import {Process} from '../models/process';
import {ProcessService} from '../services/process.service';
import {Subscription} from 'rxjs';

@Component({templateUrl: './api-call-edit-usage.component.html'})
export class ApiCallEditUsageComponent implements OnInit {

  apiCallId: string;
  apiCall: ApiCall;
  usedBy: Process[];
  private subscription: Subscription;
  repoId: string;

  constructor(private apiCallService: ApiCallService, private processService: ProcessService,
              private formBuilder: FormBuilder, private route: ActivatedRoute) {
  }

  ngOnInit() {
    this.apiCallId = this.route.parent.snapshot.paramMap.get('id');
    this.apiCallService.byId(this.apiCallId).pipe(first()).subscribe(apiCall => {
      this.apiCall = apiCall;
    });
    this.refresh();

    this.subscription = this.route.parent.paramMap.subscribe(obs => {
      this.repoId = obs.get('repoId');
    });
  }

  refresh() {
    this.processService.byApiCall(this.apiCallId).pipe(first()).subscribe(usedBy => {
      this.usedBy = usedBy;
    });
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

}
