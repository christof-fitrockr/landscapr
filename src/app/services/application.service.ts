import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {Application} from '../models/application';
import {v4 as uuidv4} from 'uuid';
import {ApiCall} from '../models/api-call';


@Injectable({
  providedIn: 'root',
})
export class ApplicationService {


  public static STORAGE_KEY = 'ls_app';

  private static load(): Application[] {
    const item = JSON.parse(localStorage.getItem(ApplicationService.STORAGE_KEY)) as Application[];
    if(!item) {
      return [];
    }
    return item;
  }

  private static store(apps: Application[]): void {
    localStorage.setItem(ApplicationService.STORAGE_KEY, JSON.stringify(apps));
  }

  all(repoId: string): Observable<Application[]> {
    return new Observable<Application[]>(obs => {
      obs.next(ApplicationService.load());
    });
  }

  byId(id: string): Observable<Application> {
    return new Observable<Application>(obs => {
      const apps = ApplicationService.load();
      for (const app of apps) {

        if(app.id === id) {
          obs.next(app);
        }
      }
      obs.error();
    });
  }

  byIds(ids: string[]): Observable<Application[]> {
    return new Observable<Application[]>(obs => {
      const apps = ApplicationService.load();
      const result: Application[] = [];
      for (const app of apps) {
        if(ids.indexOf(app.id) >= 0) {
          result.push(app);
        }
      }
      obs.next(result);
    });
  }

  byName(repoId: string, name: string): Observable<Application[]> {
    return new Observable<Application[]>(obs => {
      const apps = ApplicationService.load();
      const result: Application[] = [];
      for (const app of apps) {
        if(name === app.name) {
          result.push(app);
        }
      }
      obs.next(result);
    });
  }

  create(system: Application): Observable<Application> {
    return new Observable<Application>(obs => {
      const apps = ApplicationService.load();
      system.id = uuidv4();
      apps.push(system)
      ApplicationService.store(apps);
      obs.next(system);
    });
  }

  update(id: string, system:  Application): Observable<Application> {
    return new Observable<Application>(obs => {
      const apps = ApplicationService.load();
      for (let i = 0; i < apps.length; i++){
        const app = apps[i];
        if(app.id === id) {
          apps[i] = system;
          ApplicationService.store(apps);
          obs.next(system);
        }
      }
      obs.error();
    });
  }

  delete(id: string): Observable<void> {
    return new Observable<void>(obs => {
      let apps = ApplicationService.load();
      for (let i = 0; i < apps.length; i++){
        const app = apps[i];
        if(app.id === id) {
          apps.splice(i, 1);
          ApplicationService.store(apps);
          obs.next();
        }
      }
      obs.error();
    });
  }
}
