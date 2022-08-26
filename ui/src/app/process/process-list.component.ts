import {Component, OnInit} from '@angular/core';
import {ProcessService} from '../services/process.service';
import {Process} from '../models/process';
import {first} from 'rxjs/operators';
import {ActivatedRoute} from '@angular/router';
import {Subscription} from 'rxjs';

@Component({selector: 'app-process-list', templateUrl: './process-list.component.html'})
export class ProcessListComponent implements OnInit {
  repoId: string;
  private subscription: Subscription;

  constructor(private processService: ProcessService, private route: ActivatedRoute) {
  }

  processes: Process[];


  ngOnInit() {
    this.subscription = this.route.parent.paramMap.subscribe(obs => {
      this.repoId = obs.get('repoId');
      this.refresh();
    });
  }

  private refresh() {
    this.processService.all().pipe(first()).subscribe(items => {
      this.processes = items;
    });
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
}
