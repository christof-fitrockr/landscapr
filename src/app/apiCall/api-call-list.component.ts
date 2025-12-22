import {Component, OnDestroy, OnInit} from '@angular/core';
import {first} from 'rxjs/operators';
import {ApiCallService} from '../services/api-call.service';
import {ApiCall} from '../models/api-call';
import {Subscription, forkJoin} from 'rxjs';
import {ActivatedRoute} from '@angular/router';
import {ProcessService} from '../services/process.service';

@Component({selector: 'app-api-call-list', templateUrl: './api-call-list.component.html', styleUrls: ['./api-call-list.component.scss']})
export class ApiCallListComponent implements OnInit, OnDestroy {

  constructor(
    private apiCallService: ApiCallService,
    private processService: ProcessService,
    private activatedRoute: ActivatedRoute
  ) {
  }

  repoId: string;
  apiCalls: ApiCall[];
  searchText: string;
  showOrphansOnly: boolean = false;
  orphanIds: string[] = [];
  apiCallToDelete: ApiCall;
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
    forkJoin([
      this.apiCallService.all().pipe(first()),
      this.processService.all().pipe(first())
    ]).subscribe(([apiCalls, processes]) => {
      this.apiCalls = apiCalls.map(api => {
        return {
          ...api,
          usedByCount: processes.filter(p => p.apiCallIds && p.apiCallIds.includes(api.id)).length,
          implementedInCount: api.implementedBy ? api.implementedBy.length : 0
        };
      });
      this.calculateOrphans(processes);
    });
  }

  private calculateOrphans(processes: any[]) {
    const referencedApiIds = new Set<string>();
    processes.forEach(p => {
      if (p.apiCallIds) {
        p.apiCallIds.forEach(id => referencedApiIds.add(id));
      }
    });
    this.orphanIds = this.apiCalls
      .filter(api => !referencedApiIds.has(api.id))
      .map(api => api.id);
  }

  prepareDelete(apiCall: ApiCall) {
    this.apiCallToDelete = apiCall;
  }

  delete() {
    if (this.apiCallToDelete) {
      this.apiCallService.delete(this.apiCallToDelete.id).pipe(first()).subscribe(() => {
        this.refresh();
        this.apiCallToDelete = null;
      });
    }
  }
}
