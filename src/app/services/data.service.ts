import {Injectable} from '@angular/core';
import {Observable, from, of, throwError, forkJoin} from 'rxjs';
import {map, switchMap} from 'rxjs/operators';
import {Data, DataType} from '../models/data';
import {v4 as uuidv4} from 'uuid';
import { LandscaprDb } from '../db/landscapr-db';

@Injectable({
  providedIn: 'root',
})
export class DataService {

  public static STORAGE_KEY = 'ls_data';

  constructor(private db: LandscaprDb) {}

  all(): Observable<Data[]> {
    return from(this.db.data.toArray());
  }

  byId(id: string): Observable<Data> {
    return from(this.db.data.get(id)).pipe(
        switchMap(data => {
            if (data) return of(data);
            return throwError(undefined);
        })
    );
  }

  byName(name: string): Observable<Data[]> {
    return from(this.db.data.where('name').equals(name).toArray());
  }

  create(data: Data): Observable<Data> {
      data.id = uuidv4();
      return from(this.db.data.add(data)).pipe(
          map(() => data)
      );
  }

  update(id: string, data: Data): Observable<Data> {
    return from(this.db.data.update(id, data as any)).pipe(
        switchMap(updated => {
            if (updated) return of(data);
            return throwError(undefined);
        })
    );
  }

  delete(id: string): Observable<void> {
    return from(this.db.data.get(id)).pipe(
        switchMap(data => {
            if (!data) return of(undefined);

            const subDeletes = (data.items || [])
                .filter(item => item.type === DataType.SubObject && item.dataId)
                .map(item => this.delete(item.dataId));

            if (subDeletes.length > 0) {
                return forkJoin(subDeletes).pipe(map(() => undefined));
            }
            return of(undefined);
        }),
        switchMap(() => from(this.db.data.delete(id)))
    );
  }
}
