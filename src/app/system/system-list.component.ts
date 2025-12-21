import {Component, OnDestroy, OnInit} from '@angular/core';
import {first} from 'rxjs/operators';
import {ApplicationService} from '../services/application.service';
import {Application} from '../models/application';
import {ActivatedRoute} from '@angular/router';
import {Subscription} from 'rxjs';
import {ApiCallService} from '../services/api-call.service';

@Component({selector: 'app-system-list', templateUrl: './system-list.component.html', styleUrls: ['./system-list.component.scss']})
export class SystemListComponent implements OnInit, OnDestroy {

  repoId: string;
  systems: Application[];
  searchText = '';
  showOrphansOnly = false;
  orphanIds: string[] = [];
  private subscription: Subscription;

  constructor(
    private systemService: ApplicationService,
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

  refresh() {
    this.systemService.all(this.repoId).pipe(first()).subscribe(systems => {
      this.systems = systems;
      this.calculateOrphans();
    });
  }

  private calculateOrphans() {
    this.apiCallService.all().pipe(first()).subscribe(apiCalls => {
      const referencedSystemIds = new Set<string>();
      apiCalls.forEach(api => {
        if (api.implementedBy) {
          api.implementedBy.forEach(id => referencedSystemIds.add(id));
        }
      });
      this.orphanIds = this.systems
        .filter(sys => !referencedSystemIds.has(sys.id))
        .map(sys => sys.id);
    });
  }
}
