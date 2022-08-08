import {Component, OnInit} from '@angular/core';
import {ProcessService} from '../services/process.service';
import {Process} from '../models/process';
import {first} from 'rxjs/operators';
import {Subscription} from 'rxjs';
import {ActivatedRoute} from '@angular/router';

@Component({selector: 'app-dashboard', templateUrl: './dashboard.component.html'})
export class DashboardComponent implements OnInit {
  private subscription: Subscription;
  private repoId: string;
  constructor(private processService: ProcessService, private route: ActivatedRoute) {
  }

  processes: Process[];

  ngOnInit() {

    this.subscription = this.route.parent.paramMap.subscribe(obs => {
      this.repoId = obs.get('repoId');
      this.refresh()
    });
  }

  private refresh() {
    this.processService.allFavorites(this.repoId).pipe(first()).subscribe(items => {
      this.processes = items;
    });
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
}
