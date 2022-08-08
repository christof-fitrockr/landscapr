import {Component, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {first} from 'rxjs/operators';
import {ApplicationService} from '../services/application.service';
import {Application} from '../models/application';
import {Capability} from '../models/capability';
import {CapabilityService} from '../services/capability.service';

@Component({templateUrl: './system-edit-implements.component.html'})
export class SystemEditImplementsComponent implements OnInit {

  systemId: string;
  system: Application;
  implements: Capability[];

  constructor(private systemService: ApplicationService, private capabilityService: CapabilityService, private route: ActivatedRoute) {
  }

  ngOnInit() {
    this.systemId = this.route.parent.snapshot.paramMap.get('id');
    this.systemService.byId(this.systemId).pipe(first()).subscribe(system => {
      this.system = system;
    });
    this.capabilityService.byImplementation(this.systemId).pipe(first()).subscribe(capabilities => {
      this.implements = capabilities;
    });
  }
}
