import {Injectable} from '@angular/core';
import {Process} from '../models/process';
import {Observable, from, throwError, of} from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import {environment} from '../../environments/environment';
import {HttpClient} from '@angular/common/http';
import {Application} from '../models/application';
import {v4 as uuidv4} from 'uuid';
import { LandscaprDb } from '../db/landscapr-db';

@Injectable({
  providedIn: 'root',
})
export class ProcessService {

  public static STORAGE_KEY = 'ls_process';

  constructor(private db: LandscaprDb) {}

  all(): Observable<Process[]> {
    return from(this.db.processes.toArray());
  }

  allFavorites(repoId: string): Observable<Process[]> {
    return from(this.db.processes.filter(p => !!p.favorite).toArray());
  }

  allParents(processId: string): Observable<Process[]> {
     return from(this.db.processes.filter(app => {
        if(app.steps) {
          for (const step of app.steps) {
            if (step.processReference === processId || step.apiCallReference === processId) {
              return true;
            }
            if (step.successors) {
              for (const succ of step.successors) {
                if (succ.processReference === processId || succ.apiCallReference === processId) {
                  return true;
                }
              }
            }
          }
        }
        return false;
     }).toArray());
  }


  byId(id: string): Observable<Process> {
    return from(this.db.processes.get(id)).pipe(
        switchMap(process => {
            if (process) return of(process);
            return throwError(undefined);
        })
    );
  }

  byIds(ids: string[]): Observable<Process[]> {
    if (!ids || ids.length === 0) return of([]);
    return from(this.db.processes.where('id').anyOf(ids).toArray());
  }

  byName(repoId: string, name: string): Observable<Process[]> {
    return from(this.db.processes.where('name').equals(name).toArray());
  }

  byApiCall(apiCallId: string): Observable<Process[]> {
    return from(this.db.processes.filter(app => {
        if (app.apiCallIds && app.apiCallIds.indexOf(apiCallId) >= 0) {
          return true;
        }
        if (app.steps) {
          for (const step of app.steps) {
            if (step.apiCallReference === apiCallId) {
              return true;
            }
          }
        }
        return false;
    }).toArray());
  }


  create(process: Process): Observable<Process> {
      process.id = uuidv4();
      return from(this.db.processes.add(process)).pipe(
          map(() => process)
      );
  }

  update(id: string, process:  Process): Observable<Process> {
    return from(this.db.processes.update(id, process)).pipe(
        switchMap(updated => {
            if (updated) return of(process);
            return throwError(undefined);
        })
    );
  }

  delete(id: string): Observable<void> {
    return from(this.db.processes.delete(id));
  }
}
