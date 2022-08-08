import {Component, OnDestroy, OnInit} from '@angular/core';
import {first} from 'rxjs/operators';
import {ApiCallService} from '../services/api-call.service';
import {ApiCall} from '../models/api-call';
import {Subscription} from 'rxjs';
import {ActivatedRoute} from '@angular/router';

@Component({selector: 'app-api-call-list', templateUrl: './api-call-list.component.html'})
export class ApiCallListComponent implements OnInit, OnDestroy {

  constructor(private apiCallService: ApiCallService, private activatedRoute: ActivatedRoute) {
  }

  repoId: string;
  apiCalls: ApiCall[];
  searchText: string;
  private subscription: Subscription;

  ngOnInit() {
    this.subscription = this.activatedRoute.parent.paramMap.subscribe(obs => {
      this.repoId = obs.get('repoId');
      this.refresh()
    });
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  private refresh() {
    this.apiCallService.all(this.repoId).pipe(first()).subscribe(apiCalls => {
      this.apiCalls = apiCalls;
    });
  }
}
