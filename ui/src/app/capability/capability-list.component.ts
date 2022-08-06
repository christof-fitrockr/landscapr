import {Component, OnInit} from '@angular/core';
import {first} from 'rxjs/operators';
import {CapabilityService} from '../services/capability.service';
import {Capability} from '../models/capability';

@Component({selector: 'app-capability-list', templateUrl: './capability-list.component.html'})
export class CapabilityListComponent implements OnInit {

  constructor(private capabilityService: CapabilityService) {
  }

  capabilities: Capability[];
  searchText: string;

  ngOnInit() {
    this.capabilityService.allCapabilities().pipe(first()).subscribe(capabilities => {
      this.capabilities = capabilities;
    });
  }
}
