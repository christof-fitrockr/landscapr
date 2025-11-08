import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { Journey, JourneyItem, Connection } from 'src/app/models/journey.model';
import { Process } from 'src/app/models/process';
import { JourneyService } from 'src/app/services/journey.service';
import { ProcessService } from 'src/app/services/process.service';

@Component({
  selector: 'app-journey-maintenance',
  templateUrl: './journey-maintenance.component.html',
  styleUrls: ['./journey-maintenance.component.scss']
})
export class JourneyMaintenanceComponent implements OnInit {

  journeyForm: FormGroup;
  journey: Journey;
  availableProcesses: Process[] = [];
  availableJourneys: Journey[] = [];
  journeyProcesses: JourneyItem[] = [];

  connectionStart: JourneyItem;
  connectionEnd: JourneyItem;
  connectionLabel: string;

  constructor(
    private formBuilder: FormBuilder,
    private journeyService: JourneyService,
    private processService: ProcessService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.journeyForm = this.formBuilder.group({
      name: ['', Validators.required],
      description: ['']
    });

    this.processService.all().subscribe(processes => {
      this.availableProcesses = processes;
    });

    this.journeyService.all().subscribe(journeys => {
      this.availableJourneys = journeys;
    });

    this.route.params.subscribe(params => {
      const journeyId = params['id'];
      if (journeyId) {
        this.journeyService.byId(journeyId).subscribe(journey => {
          this.journey = journey;
          this.journeyForm.patchValue(journey);
          this.journeyProcesses = journey.items;
        });
      }
    });
  }

  drop(event: CdkDragDrop<JourneyItem[]>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex);
    }
  }

  setConnectionStart(item: JourneyItem): void {
    this.connectionStart = item;
  }

  setConnectionEnd(item: JourneyItem): void {
    this.connectionEnd = item;
  }

  addConnection(): void {
    if (!this.journey) {
      this.journey = { id: null, name: '', description: '', items: [], connections: [] };
    }
    if (!this.journey.connections) {
      this.journey.connections = [];
    }
    this.journey.connections.push({
      from: this.connectionStart.id,
      to: this.connectionEnd.id,
      label: this.connectionLabel
    });
    this.connectionStart = null;
    this.connectionEnd = null;
    this.connectionLabel = '';
  }

  removeConnection(index: number): void {
    this.journey.connections.splice(index, 1);
  }

  getConnectionNodeName(id: string): string {
    const item = this.journeyProcesses.find(p => p.id === id);
    return item ? item.name : '';
  }

  saveJourney(): void {
    if (this.journeyForm.invalid) {
      return;
    }

    const journeyData = {
      ...this.journey,
      ...this.journeyForm.value,
      items: this.journeyProcesses
    };

    if (this.journey && this.journey.id) {
      this.journeyService.update(this.journey.id, journeyData).subscribe(() => {
        this.router.navigate(['/journeys']);
      });
    } else {
      this.journeyService.create(journeyData).subscribe(() => {
        this.router.navigate(['/journeys']);
      });
    }
  }
}
