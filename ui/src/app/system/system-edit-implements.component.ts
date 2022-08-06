import {Component, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {first} from 'rxjs/operators';
import {SystemService} from '../services/system.service';
import {System} from '../models/system';
import {Capability} from '../models/capability';
import {CapabilityService} from '../services/capability.service';

@Component({templateUrl: './system-edit-implements.component.html'})
export class SystemEditImplementsComponent implements OnInit {

  systemId: string;
  system: System;
  implements: Capability[];

  constructor(private systemService: SystemService, private capabilityService: CapabilityService, private route: ActivatedRoute) {
  }

  ngOnInit() {
    this.systemId = this.route.parent.snapshot.paramMap.get('id');
    this.systemService.getSystemById(this.systemId).pipe(first()).subscribe(system => {
      this.system = system;
    });
    this.capabilityService.getByImplementingSystem(this.systemId).pipe(first()).subscribe(capabilities => {
      this.implements = capabilities;
    });
  }
}
