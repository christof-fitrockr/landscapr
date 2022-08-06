import {Component, OnInit} from '@angular/core';
import {CapabilityService} from '../services/capability.service';
import {ApiCallService} from '../services/api-call.service';
import {first} from 'rxjs/operators';
import {Capability} from '../models/capability';

@Component({selector: 'app-capability-view', templateUrl: './capability-view.component.html'})
export class CapabilityViewComponent implements OnInit {

  caps: Capability[];

  constructor(private capabilityService: CapabilityService) {
  }

  ngOnInit() {

    this.capabilityService.allCapabilities().pipe(first()).subscribe(caps => {
      this.caps = caps;
    });

  }
}
