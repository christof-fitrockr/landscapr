import {Component, OnDestroy, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {first} from 'rxjs/operators';
import {ApplicationService} from '../services/application.service';
import {Application} from '../models/application';
import {ApiCall} from '../models/api-call';
import {ApiCallService} from '../services/api-call.service';
import {Subscription} from 'rxjs';

@Component({templateUrl: './system-edit-api.component.html'})
export class SystemEditApiComponent implements OnInit, OnDestroy {

  systemId: string;
  system: Application;
  apis: ApiCall[];
  repoId: string;
  private subscription: Subscription;

  constructor(private systemService: ApplicationService, private apiCallService: ApiCallService, private route: ActivatedRoute, private router: Router) {
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
      this.apiCallService.byImplementation(this.systemId).pipe(first()).subscribe(apis => {
        this.apis = apis;
      });
    }
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
}
