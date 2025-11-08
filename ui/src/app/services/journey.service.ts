import { Injectable } from '@angular/core';
import { Journey } from '../models/journey.model';
import { Observable } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

@Injectable({
  providedIn: 'root',
})
export class JourneyService {
  public static STORAGE_KEY = 'ls_journey';

  private static load(): Journey[] {
    const item = JSON.parse(localStorage.getItem(JourneyService.STORAGE_KEY)) as Journey[];
    if (!item) {
      return [];
    }
    return item;
  }

  private static store(journeys: Journey[]): void {
    localStorage.setItem(JourneyService.STORAGE_KEY, JSON.stringify(journeys));
  }

  all(): Observable<Journey[]> {
    return new Observable<Journey[]>((obs) => {
      obs.next(JourneyService.load());
      obs.complete();
    });
  }

  byId(id: string): Observable<Journey> {
    return new Observable<Journey>((obs) => {
      const journeys = JourneyService.load();
      for (const journey of journeys) {
        if (journey.id === id) {
          obs.next(journey);
          obs.complete();
          return;
        }
      }
      obs.next(null);
      obs.complete();
    });
  }

  create(journey: Journey): Observable<Journey> {
    return new Observable<Journey>((obs) => {
      const journeys = JourneyService.load();
      journey.id = uuidv4();
      journeys.push(journey);
      JourneyService.store(journeys);
      obs.next(journey);
      obs.complete();
    });
  }

  update(id: string, journey: Journey): Observable<Journey> {
    return new Observable<Journey>((obs) => {
      const journeys = JourneyService.load();
      for (let i = 0; i < journeys.length; i++) {
        const currentJourney = journeys[i];
        if (currentJourney.id === id) {
          journeys[i] = journey;
          JourneyService.store(journeys);
          obs.next(journey);
          obs.complete();
          return;
        }
      }
      obs.next(null);
      obs.complete();
    });
  }

  delete(id: string): Observable<void> {
    return new Observable<void>((obs) => {
      const journeys = JourneyService.load();
      for (let i = 0; i < journeys.length; i++) {
        const journey = journeys[i];
        if (journey.id === id) {
          journeys.splice(i, 1);
          JourneyService.store(journeys);
          obs.next();
          obs.complete();
          return;
        }
      }
      obs.next();
      obs.complete();
    });
  }
}
