import {Component, OnDestroy, OnInit} from '@angular/core';
import {first} from 'rxjs/operators';
import {ApplicationService} from '../services/application.service';
import {Application} from '../models/application';
import {ActivatedRoute} from '@angular/router';
import {Subscription} from 'rxjs';

@Component({selector: 'app-system-list', templateUrl: './system-list.component.html'})
export class SystemListComponent implements OnInit, OnDestroy {

  repoId: string;
  systems: Application[];
  searchText: string;
  private subscription: Subscription;

  constructor(private systemService: ApplicationService, private activatedRoute: ActivatedRoute) {
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
    });
  }
}
