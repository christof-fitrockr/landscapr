import {Component, OnInit} from '@angular/core';
import {ProcessService} from '../services/process.service';
import {Process} from '../models/process';
import {first} from 'rxjs/operators';
import {ActivatedRoute} from '@angular/router';
import {Subscription} from 'rxjs';
import {JourneyService} from '../services/journey.service';

@Component({selector: 'app-process-list', templateUrl: './process-list.component.html'})
export class ProcessListComponent implements OnInit {
  repoId: string;
  private subscription: Subscription;
  orphanIds: string[] = [];

  constructor(
    private processService: ProcessService,
    private journeyService: JourneyService,
    private route: ActivatedRoute
  ) {
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
      this.calculateOrphans();
    });
  }

  private calculateOrphans() {
    this.journeyService.all().pipe(first()).subscribe(journeys => {
      const referencedProcessIds = new Set<string>();
      journeys.forEach(journey => {
        if (journey.items) {
          journey.items.forEach(item => {
            // Check if item is a process (has 'id', 'steps', etc, but JourneyItem can be Process or Journey)
            // Assuming referenced by ID
            if (item.id) {
              referencedProcessIds.add(item.id);
            }
          });
        }
      });
      this.orphanIds = this.processes
        .filter(p => !referencedProcessIds.has(p.id))
        .map(p => p.id);
    });
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
}
