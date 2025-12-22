import {Component, OnDestroy, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {first} from 'rxjs/operators';
import {ApplicationService} from '../services/application.service';
import {Application} from '../models/application';
import {Capability} from '../models/capability';
import {CapabilityService} from '../services/capability.service';
import {Subscription} from 'rxjs';

@Component({templateUrl: './system-edit-implements.component.html'})
export class SystemEditImplementsComponent implements OnInit, OnDestroy {

  systemId: string;
  system: Application;
  implementedCapabilities: Capability[];
  repoId: string;
  private subscription: Subscription;

  constructor(private systemService: ApplicationService, private capabilityService: CapabilityService, private route: ActivatedRoute, private router: Router) {
  }

  ngOnInit() {
    this.subscription = this.route.parent.paramMap.subscribe(obs => {
      this.systemId = obs.get('id');
      if(this.repoId && this.repoId !== obs.get('repoId')) {
        this.router.navigateByUrl('/r/' + obs.get('repoId') + '/system').then(() => {
        });
      } else {
        this.repoId = obs.get('repoId');
        this.refresh();
      }
    });

  }

  private refresh() {
    if (this.systemId) {
      this.systemService.byId(this.systemId).pipe(first()).subscribe(system => {
        this.system = system;
      });
      this.capabilityService.byImplementation(this.systemId).pipe(first()).subscribe(capabilities => {
        this.implementedCapabilities = capabilities;
      });
    }
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
}
