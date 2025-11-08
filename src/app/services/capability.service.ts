import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {Capability} from '../models/capability';
import {HttpClient} from '@angular/common/http';
import {environment} from '../../environments/environment';
import {Application} from '../models/application';
import {v4 as uuidv4} from 'uuid';
import {Process} from '../models/process';




@Injectable({
  providedIn: 'root',
})
export class CapabilityService {
  public static STORAGE_KEY = 'ls_capability';

  constructor() {
  }


  private static load(): Capability[] {
    const item = JSON.parse(localStorage.getItem(CapabilityService.STORAGE_KEY)) as Capability[]
    if(!item) {
      return [];
    }
    return item;
  }


  private static store(apps: Capability[]): void {
    localStorage.setItem(CapabilityService.STORAGE_KEY, JSON.stringify(apps));
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
      const result: Capability[] = [];
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
      const result: Capability[] = [];
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
    return new Observable<Capability[]>(obs => {
      const apps = CapabilityService.load();
      const result: Capability[] = [];
      for (const app of apps) {
        if(app.implementedBy.indexOf(systemId) >= 0) {
          result.push(app);
        }
      }
      obs.next(result);
    });
    // return this.http.get<Capability[]>(`${environment.apiUrl}/cabability/byImplementation/` + systemId);
  }

  create(capability: Capability): Observable<Capability> {
    return new Observable<Capability>(obs => {
      const apps = CapabilityService.load();
      capability.id = uuidv4();
      apps.push(capability)
      CapabilityService.store(apps);
      obs.next(capability);
    });
    // return this.http.post<Capability>(`${environment.apiUrl}/capability/update`, capability);
  }

  update(id: string, capability:  Capability): Observable<Capability> {
    return new Observable<Capability>(obs => {
      const apps = CapabilityService.load();
      for (let i = 0; i < apps.length; i++){
        const app = apps[i];
        if(app.id === id) {
          apps[i] = capability;
          CapabilityService.store(apps);
          obs.next(capability);
        }
      }
      obs.error();
    });
    // return this.http.post<Capability>(`${environment.apiUrl}/capability/update`, capability);
  }

  delete(id: string): Observable<void> {
    return new Observable<void>(obs => {
      let apps = CapabilityService.load();
      for (let i = 0; i < apps.length; i++){
        const app = apps[i];
        if(app.id === id) {
          apps.splice(i, 1);
          CapabilityService.store(apps);
          obs.next();
        }
      }
      obs.error();
    });
    // return this.http.get<void>(`${environment.apiUrl}/capability/delete/` + capabilityId);
  }
}
