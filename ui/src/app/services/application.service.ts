import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {Application} from '../models/application';
import {v4 as uuidv4} from 'uuid';


@Injectable({
  providedIn: 'root',
})
export class ApplicationService {

  constructor() {
  }

  private static load(): Application[] {
    return JSON.parse(localStorage.getItem('ls_app')) as Application[];
  }

  private static store(apps: Application[]): void {
    localStorage.setItem('ls_app', JSON.stringify(apps));
  }

  all(repoId: string): Observable<Application[]> {
    return new Observable<Application[]>(obs => {
      obs.next(ApplicationService.load());
    });
    //return this.http.get<Application[]>(`${environment.apiUrl}/application/all/` + repoId);
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
    //return this.http.get<Application>(`${environment.apiUrl}/application/byId/` + id);
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
    //return this.http.post<Application[]>(`${environment.apiUrl}/application/byIds`, ids);
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
    //return this.http.get<Application[]>(`${environment.apiUrl}/application/byName/` + repoId + '/' + name);
  }

  create(system: Application): Observable<Application> {
    return new Observable<Application>(obs => {
      const apps = ApplicationService.load();
      system.id = uuidv4();
      apps.push(system)
      ApplicationService.store(apps);
      obs.next(system);
    });
    //return this.http.post<Application>(`${environment.apiUrl}/application/update`, system);
  }

  update(id: string, system:  Application): Observable<Application> {
    return new Observable<Application>(obs => {
      const apps = ApplicationService.load();
      for (let i = 0; i < apps.length; i++){
        const app = apps[i];
        if(app.id === id) {
          app[i] = system;
          ApplicationService.store(apps);
          obs.next(system);
        }
      }
      obs.error();
    });
    //return this.http.post<Application>(`${environment.apiUrl}/application/update`, system);
  }

  delete(id: string): Observable<void> {
    return new Observable<void>(obs => {
      let apps = ApplicationService.load();
      for (let i = 0; i < apps.length; i++){
        const app = apps[i];
        if(app.id === id) {
          apps = apps.splice(i, 1);
          ApplicationService.store(apps);
          obs.next();
        }
      }
      obs.error();
    });
    //return this.http.get<void>(`${environment.apiUrl}/application/delete/` + systemId);
  }
}
