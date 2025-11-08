import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { first } from 'rxjs/operators';
import { Journey } from '../models/journey.model';
import { JourneyService } from '../services/journey.service';

@Component({ selector: 'app-journey-edit-base', templateUrl: './journey-edit-base.component.html' })
export class JourneyEditBaseComponent implements OnInit, OnDestroy {
  journeyForm: FormGroup;
  journey: Journey;
  private journeyId: string | null = null;
  private subscription: Subscription;

  constructor(
    private formBuilder: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private journeyService: JourneyService
  ) {}

  ngOnInit(): void {
    this.journeyForm = this.formBuilder.group({
      name: ['', Validators.required],
      description: ['']
    });

    // subscribe to parent route id (for edit)
    this.subscription = this.route.parent?.paramMap.subscribe(() => {
      this.refresh();
    }) as Subscription;

    if (!this.subscription) {
      // if no parent (create route), just refresh once
      this.refresh();
    }
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  private refresh(): void {
    this.journeyId = this.route.parent?.snapshot.paramMap.get('id') ?? null;
    if (this.journeyId) {
      this.journeyService.byId(this.journeyId).pipe(first()).subscribe(j => {
        this.journey = j;
        if (this.journey) {
          this.journeyForm.patchValue({ name: this.journey.name, description: this.journey.description });
        }
      });
    } else {
      // initialize new journey object
      this.journey = { id: null as any, name: '', description: '', items: [], connections: [] } as Journey;
      this.journeyForm.reset({ name: '', description: '' });
    }
  }

  onUpdate(): void {
    Object.keys(this.journeyForm.controls).forEach(field => {
      const control = this.journeyForm.get(field);
      control?.markAsTouched({ onlySelf: true });
    });

    if (!this.journeyForm.valid) {
      return;
    }

    const updated: Journey = {
      ...this.journey,
      ...this.journeyForm.value
    } as Journey;

    if (!this.journeyId) {
      this.journeyService.create(updated).pipe(first()).subscribe(() => {
        this.router.navigate(['/journeys']).then();
      });
    } else {
      this.journeyService.update(this.journeyId, updated).pipe(first()).subscribe(() => {
        this.router.navigate(['/journeys']).then();
      });
    }
  }
}
