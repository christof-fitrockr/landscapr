import {Component, OnInit} from '@angular/core';
import {ProcessService} from '../services/process.service';
import {Process} from '../models/process';
import {first} from 'rxjs/operators';
import {ActivatedRoute} from '@angular/router';
import {Subscription} from 'rxjs';
import {JourneyService} from '../services/journey.service';

@Component({selector: 'app-process-list', templateUrl: './process-list.component.html', styleUrls: ['./process-list.component.scss']})
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

  refresh() {
    this.processService.all().pipe(first()).subscribe(items => {
      this.processes = items;
      this.calculateOrphans();
    });
  }

  private calculateOrphans() {
    this.journeyService.all().pipe(first()).subscribe(journeys => {
      const referencedProcessIds = new Set<string>();

      // Check references in journeys
      journeys.forEach(journey => {
        if (journey.items) {
          journey.items.forEach(item => {
            // JourneyItem can be Process or Journey. Both have 'id'.
            if (item.id) {
              referencedProcessIds.add(item.id);
            }
          });
        }
        if (journey.layout && journey.layout.nodes) {
          journey.layout.nodes.forEach(node => {
            if (node.processId) {
              referencedProcessIds.add(node.processId);
            }
          });
        }
      });

      // Check references in other processes (as subprocesses)
      this.processes.forEach(process => {
        if (process.steps) {
          process.steps.forEach(step => {
            if (step.processReference) {
              referencedProcessIds.add(step.processReference);
            }
            if (step.successors) {
              step.successors.forEach(succ => {
                if (succ.processReference) {
                  referencedProcessIds.add(succ.processReference);
                }
              });
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
