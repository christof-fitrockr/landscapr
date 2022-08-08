import {Component, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {first} from 'rxjs/operators';
import {CapabilityService} from '../services/capability.service';
import {Capability} from '../models/capability';
import {ApiCall} from '../models/api-call';
import {ApiCallService} from '../services/api-call.service';

@Component({templateUrl: './capability-edit-api-call.component.html'})
export class CapabilityEditApiCallComponent implements OnInit {

  capabilityId: string;
  capability: Capability;
  usedBy: ApiCall[];

  constructor(private capabilityService: CapabilityService, private apiCallService: ApiCallService, private route: ActivatedRoute) {
  }

  ngOnInit() {
    this.capabilityId = this.route.parent.snapshot.paramMap.get('id');
    this.capabilityService.byId(this.capabilityId).pipe(first()).subscribe(capability => {
      this.capability = capability;
    });

    this.apiCallService.byCapability(this.capabilityId).pipe(first()).subscribe(usedBy => {
      this.usedBy = usedBy;
    });
  }
}
