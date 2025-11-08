import { Component, OnInit } from '@angular/core';
import { Journey } from 'src/app/models/journey.model';
import { JourneyService } from 'src/app/services/journey.service';

@Component({
  selector: 'app-journey-list',
  templateUrl: './journey-list.component.html',
  styleUrls: ['./journey-list.component.scss']
})
export class JourneyListComponent implements OnInit {

  journeys: Journey[];

  constructor(private journeyService: JourneyService) { }

  ngOnInit(): void {
    this.journeyService.all().subscribe(journeys => {
      this.journeys = journeys;
    });
  }

  deleteJourney(id: string): void {
    this.journeyService.delete(id).subscribe(() => {
      this.journeys = this.journeys.filter(journey => journey.id !== id);
    });
  }
}
