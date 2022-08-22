import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {Capability} from '../models/capability';
import {HttpClient} from '@angular/common/http';
import {environment} from '../../environments/environment';
import {Application} from '../models/application';


@Injectable({
  providedIn: 'root',
})
export class CapabilityService {

  constructor() {
  }

  private static load(): Capability[] {
    return JSON.parse(localStorage.getItem('ls_capability')) as Capability[];
  }

  private static store(apps: Capability[]): void {
    localStorage.setItem('ls_capability', JSON.stringify(apps));
  }

  all(repoId: string): Observable<Capability[]> {
    return new Observable<Capability[]>(obs => {
      obs.next(CapabilityService.load());
    });
    // return this.http.get<Capability[]>(`${environment.apiUrl}/capability/all/` + repoId);
  }

  byId(id: string): Observable<Capability> {
    return new Observable<Capability>(obs => {
      const apps = CapabilityService.load();
      for (const app of apps) {
        if(app.id === id) {
          obs.next(app);
        }
      }
      obs.error();
    });
    // return this.http.get<Capability>(`${environment.apiUrl}/capability/byId/` + id);
  }

  byIds(ids: string[]): Observable<Capability[]> {
    return new Observable<Capability[]>(obs => {
      const apps = CapabilityService.load();
      const result: Application[] = [];
      for (const app of apps) {
        if(ids.indexOf(app.id) >= 0) {
          result.push(app);
        }
      }
      obs.next(result);
    });
    // return this.http.post<Capability[]>(`${environment.apiUrl}/capability/byIds`, ids);
  }

  byName(name: string): Observable<Capability[]> {
    return new Observable<Capability[]>(obs => {
      const apps = CapabilityService.load();
      const result: Application[] = [];
      for (const app of apps) {
        if(name === app.name) {
          result.push(app);
        }
      }
      obs.next(result);
    });
    // return this.http.get<Capability[]>(`${environment.apiUrl}/capability/byName/` + name);
  }

  byImplementation(systemId: string): Observable<Capability[]> {
    // return this.http.get<Capability[]>(`${environment.apiUrl}/cabability/byImplementation/` + systemId);
  }

  create(capability: Capability): Observable<Capability> {
    // return this.http.post<Capability>(`${environment.apiUrl}/capability/update`, capability);
  }

  update(id: string, capability:  Capability): Observable<Capability> {
    // return this.http.post<Capability>(`${environment.apiUrl}/capability/update`, capability);
  }

  delete(capabilityId: string): Observable<void> {
    // return this.http.get<void>(`${environment.apiUrl}/capability/delete/` + capabilityId);
  }
}
