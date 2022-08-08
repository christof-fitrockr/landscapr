import {Component, OnDestroy, OnInit} from '@angular/core';
import {first} from 'rxjs/operators';
import {CapabilityService} from '../services/capability.service';
import {Capability} from '../models/capability';
import {Subscription} from 'rxjs';
import {ActivatedRoute} from '@angular/router';

@Component({selector: 'app-capability-list', templateUrl: './capability-list.component.html'})
export class CapabilityListComponent implements OnInit, OnDestroy {


  repoId: string;
  capabilities: Capability[];
  searchText: string;
  private subscription: Subscription;

  constructor(private capabilityService: CapabilityService, private activatedRoute: ActivatedRoute) {
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
    });
  }
}
