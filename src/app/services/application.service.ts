import {Injectable} from '@angular/core';
import {Observable, from, of, throwError} from 'rxjs';
import {map, switchMap} from 'rxjs/operators';
import {Application} from '../models/application';
import {v4 as uuidv4} from 'uuid';
import { LandscaprDb } from '../db/landscapr-db';


@Injectable({
  providedIn: 'root',
})
export class ApplicationService {

  public static STORAGE_KEY = 'ls_app';

  constructor(private db: LandscaprDb) {}

  all(repoId: string): Observable<Application[]> {
    return from(this.db.applications.toArray());
  }

  byId(id: string): Observable<Application> {
    return from(this.db.applications.get(id)).pipe(
        switchMap(app => {
            if (app) return of(app);
            return throwError(undefined);
        })
    );
  }

  byIds(ids: string[]): Observable<Application[]> {
    if (!ids || ids.length === 0) return of([]);
    return from(this.db.applications.where('id').anyOf(ids).toArray());
  }

  byName(repoId: string, name: string): Observable<Application[]> {
    return from(this.db.applications.where('name').equals(name).toArray());
  }

  create(system: Application): Observable<Application> {
      system.id = uuidv4();
      return from(this.db.applications.add(system)).pipe(
          map(() => system)
      );
  }

  update(id: string, system:  Application): Observable<Application> {
    return from(this.db.applications.update(id, system as any)).pipe(
        switchMap(updated => {
            if (updated) return of(system);
            return throwError(undefined);
        })
    );
  }

  delete(id: string): Observable<void> {
    return from(this.db.applications.delete(id));
  }
}
