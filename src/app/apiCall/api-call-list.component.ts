import {Component, OnDestroy, OnInit} from '@angular/core';
import {first} from 'rxjs/operators';
import {ApiCallService} from '../services/api-call.service';
import {ApiCall} from '../models/api-call';
import {Subscription} from 'rxjs';
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
  expandedGroups: Set<string> = new Set();
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
    this.apiCallService.all().pipe(first()).subscribe(apiCalls => {
      this.apiCalls = apiCalls;
      this.calculateOrphans();
    });
  }

  private calculateOrphans() {
    this.processService.all().pipe(first()).subscribe(processes => {
      const referencedApiIds = new Set<string>();
      processes.forEach(p => {
        if (p.apiCallIds) {
          p.apiCallIds.forEach(id => referencedApiIds.add(id));
        }
      });
      this.orphanIds = this.apiCalls
        .filter(api => !referencedApiIds.has(api.id))
        .map(api => api.id);
    });
  }

  toggleGroup(groupName: string) {
    if (this.expandedGroups.has(groupName)) {
      this.expandedGroups.delete(groupName);
    } else {
      this.expandedGroups.add(groupName);
    }
  }

  isExpanded(groupName: string): boolean {
    return this.expandedGroups.has(groupName);
  }
}
