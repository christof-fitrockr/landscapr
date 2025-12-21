import {Injectable} from '@angular/core';
import {Process} from '../models/process';
import {Observable} from 'rxjs';
import {environment} from '../../environments/environment';
import {HttpClient} from '@angular/common/http';
import {Application} from '../models/application';
import {v4 as uuidv4} from 'uuid';

@Injectable({
  providedIn: 'root',
})
export class ProcessService {

  public static STORAGE_KEY = 'ls_process';
  private static load(): Process[] {
    const item = JSON.parse(localStorage.getItem(ProcessService.STORAGE_KEY)) as Process[]
    if(!item) {
      return [];
    }
    return item;
  }

  private static store(apps: Process[]): void {
    localStorage.setItem(ProcessService.STORAGE_KEY, JSON.stringify(apps));
  }
  all(): Observable<Process[]> {
    return new Observable<Process[]>(obs => {
      obs.next(ProcessService.load());
    });
  }

  allFavorites(repoId: string) {
    return new Observable<Process[]>(obs => {
      const apps = ProcessService.load();
      const result: Process[] = [];

      for (const app of apps) {
        if(app.favorite) {
          result.push(app);
        }
      }
      obs.next(result);
    });
  }

  allParents(processId: string) {
    return new Observable<Process[]>(obs => {
      const apps = ProcessService.load();
      const result: Process[] = [];
      for (const app of apps) {
        if(app.steps) {
          for (const step of app.steps) {
            if (step.successors) {
              for (const succ of step.successors) {
                if (succ.processReference === processId) {
                  result.push(app);
                }
              }
            }
          }
        }
      }
      obs.next(result);
    });
  }


  byId(id: string): Observable<Process> {
    return new Observable<Process>(obs => {
      const apps = ProcessService.load();
      for (const app of apps) {
        if(app.id === id) {
          obs.next(app);
        }
      }
      obs.error();
    });
  }

  byIds(ids: string[]): Observable<Process[]> {
    return new Observable<Process[]>(obs => {
      const apps = ProcessService.load();
      const result: Process[] = [];
      for (const app of apps) {
        if(ids && ids.indexOf(app.id) >= 0) {
          result.push(app);
        }
      }
      obs.next(result);
    });
  }

  byName(repoId: string, name: string): Observable<Process[]> {
    return new Observable<Process[]>(obs => {
      const apps = ProcessService.load();
      const result: Process[] = [];
      for (const app of apps) {
        if(name === app.name) {
          result.push(app);
        }
      }
      obs.next(result);
    });
  }

  byApiCall(apiCallId: string) {
    return new Observable<Process[]>(obs => {
      const apps = ProcessService.load();
      const result: Process[] = [];
      for (const app of apps) {
        if(app.apiCallIds && app.apiCallIds.indexOf(apiCallId) >= 0) {
          result.push(app);
        }
      }
      obs.next(result);
    });
  }


  create(process: Process): Observable<Process> {
    return new Observable<Process>(obs => {
      const apps = ProcessService.load();
      process.id = uuidv4();
      apps.push(process)
      ProcessService.store(apps);
      obs.next(process);
    });
  }

  update(id: string, process:  Process): Observable<Process> {
    return new Observable<Process>(obs => {
      const apps = ProcessService.load();
      for (let i = 0; i < apps.length; i++){
        const app = apps[i];
        if(app.id === id) {
          apps[i] = process;
          ProcessService.store(apps);
          obs.next(process);
        }
      }
      obs.error();
    });
  }

  delete(id: string): Observable<void> {
    return new Observable<void>(obs => {
      let apps = ProcessService.load();
      for (let i = 0; i < apps.length; i++){
        const app = apps[i];
        if(app.id === id) {
          apps.splice(i, 1);
          ProcessService.store(apps);
          obs.next();
        }
      }
      obs.error();
    });
  }
}
