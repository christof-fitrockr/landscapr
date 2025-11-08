import {Component, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';

@Component({selector: 'app-journey-edit', templateUrl: './journey-edit.component.html'})
export class JourneyEditComponent implements OnInit {
  journeyId: string | null = null;

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.journeyId = this.route.snapshot.paramMap.get('id');
  }
}
