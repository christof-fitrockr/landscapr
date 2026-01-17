import { Injectable } from '@angular/core';
import { Journey } from '../models/journey.model';
import { Observable, from, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';
import { LandscaprDb } from '../db/landscapr-db';

@Injectable({
  providedIn: 'root',
})
export class JourneyService {
  public static STORAGE_KEY = 'ls_journey';

  constructor(private db: LandscaprDb) {}

  all(): Observable<Journey[]> {
    return from(this.db.journeys.toArray());
  }

  byId(id: string): Observable<Journey> {
    return from(this.db.journeys.get(id)).pipe(
        map(journey => journey || null)
    );
  }

  create(journey: Journey): Observable<Journey> {
      journey.id = uuidv4();
      return from(this.db.journeys.add(journey)).pipe(
          map(() => journey)
      );
  }

  update(id: string, journey: Journey): Observable<Journey> {
    return from((this.db.journeys as any).update(id, journey)).pipe(
        map(updated => {
            if (updated) return journey;
            return null;
        })
    );
  }

  delete(id: string): Observable<void> {
    return from(this.db.journeys.delete(id));
  }
}
