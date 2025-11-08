import {Component, OnDestroy, OnInit} from '@angular/core';
import {CapabilityService} from '../services/capability.service';
import {first} from 'rxjs/operators';
import {Capability} from '../models/capability';
import {Subscription} from 'rxjs';
import {ActivatedRoute} from '@angular/router';

@Component({selector: 'app-capability-view', templateUrl: './capability-view.component.html'})
export class CapabilityViewComponent implements OnInit, OnDestroy {

  repoId: string;
  caps: Capability[];
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
    this.capabilityService.all(this.repoId).pipe(first()).subscribe(caps => {
      this.caps = caps;
    });
  }
}
