import {Component, OnInit} from '@angular/core';
import * as shape from 'd3-shape';
import {ProcessService} from '../services/process.service';
import {Layout} from '@swimlane/ngx-graph';
import {DagreNodesOnlyLayout} from '../components/customDagreNodesOnly';
import {Process} from '../models/process';
import {first} from 'rxjs/operators';

@Component({selector: 'app-dashboard', templateUrl: './dashboard.component.html'})
export class DashboardComponent implements OnInit {
  constructor(private processService: ProcessService) {
  }

  processes: Process[];

  ngOnInit() {
    this.processService.allFavorites().pipe(first()).subscribe(items => {
      this.processes = items;
    });
  }
}
