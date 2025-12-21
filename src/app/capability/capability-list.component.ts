import {Component, OnDestroy, OnInit} from '@angular/core';
import {first} from 'rxjs/operators';
import {CapabilityService} from '../services/capability.service';
import {Capability} from '../models/capability';
import {Subscription} from 'rxjs';
import {ActivatedRoute} from '@angular/router';
import {ApiCallService} from '../services/api-call.service';

@Component({selector: 'app-capability-list', templateUrl: './capability-list.component.html', styleUrls: ['./capability-list.component.scss']})
export class CapabilityListComponent implements OnInit, OnDestroy {


  repoId: string;
  capabilities: Capability[];
  searchText: string;
  showOrphansOnly = false;
  orphanIds: string[] = [];
  private subscription: Subscription;

  constructor(
    private capabilityService: CapabilityService,
    private apiCallService: ApiCallService,
    private activatedRoute: ActivatedRoute
  ) {
  }

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
    this.capabilityService.all(this.repoId).pipe(first()).subscribe(capabilities => {
      this.capabilities = capabilities;
      this.calculateOrphans();
    });
  }

  private calculateOrphans() {
    this.apiCallService.all().pipe(first()).subscribe(apiCalls => {
      const referencedCapabilityIds = new Set<string>();
      apiCalls.forEach(api => {
        if (api.capabilityId) {
          referencedCapabilityIds.add(api.capabilityId);
        }
      });
      this.orphanIds = this.capabilities
        .filter(cap => !referencedCapabilityIds.has(cap.id))
        .map(cap => cap.id);
    });
  }
}
