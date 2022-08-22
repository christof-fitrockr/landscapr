import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {ApiCall} from '../models/api-call';
import {v4 as uuidv4} from 'uuid';

@Injectable({
  providedIn: 'root',
})
export class ApiCallService {


  private static load(): ApiCall[] {
    return JSON.parse(localStorage.getItem('ls_api')) as ApiCall[];
  }

  private static store(apps: ApiCall[]): void {
    localStorage.setItem('ls_api', JSON.stringify(apps));
  }

  all(repoId: string): Observable<ApiCall[]> {
    return new Observable<ApiCall[]>(obs => {
      obs.next(ApiCallService.load());
    });
  }

  byId(id: string): Observable<ApiCall> {
    return new Observable<ApiCall>(obs => {
      const apps = ApiCallService.load();
      for (const app of apps) {
        if(app.id === id) {
          obs.next(app);
        }
      }
      obs.error();
    });
  }

  byIds(ids: string[]): Observable<ApiCall[]> {
    return new Observable<ApiCall[]>(obs => {
      const apps = ApiCallService.load();
      const result: ApiCall[] = [];
      for (const app of apps) {
        if(ids.indexOf(app.id) >= 0) {
          result.push(app);
        }
      }
      obs.next(result);
    });
  }

  byName(repoId: string, name: string): Observable<ApiCall[]> {
    return new Observable<ApiCall[]>(obs => {
      const apps = ApiCallService.load();
      const result: ApiCall[] = [];
      for (const app of apps) {
        if(name === app.name) {
          result.push(app);
        }
      }
      obs.next(result);
    });
  }

  byCapability(repoId: string, capabilityId: string): Observable<ApiCall[]> {
    return new Observable<ApiCall[]>(obs => {
      const apps = ApiCallService.load();
      const result: ApiCall[] = [];
      for (const app of apps) {
        if(app.capabilityId === capabilityId) {
          result.push(app);
        }
      }
      obs.next(result);
    });
  }

  create(apiCall: ApiCall): Observable<ApiCall> {
    return new Observable<ApiCall>(obs => {
      const apps = ApiCallService.load();
      apiCall.id = uuidv4();
      apps.push(apiCall)
      ApiCallService.store(apps);
      obs.next(apiCall);
    });
  }

  update(id: string, apiCall:  ApiCall): Observable<ApiCall> {
    return new Observable<ApiCall>(obs => {
      const apps = ApiCallService.load();
      apiCall.id = uuidv4();
      apps.push(apiCall)
      ApiCallService.store(apps);
      obs.next(apiCall);
    });
  }

  delete(id: string): Observable<void> {
    return new Observable<void>(obs => {
      let apps = ApiCallService.load();
      for (let i = 0; i < apps.length; i++){
        const app = apps[i];
        if(app.id === id) {
          apps = apps.splice(i, 1);
          ApiCallService.store(apps);
          obs.next();
        }
      }
      obs.error();
    });
  }
}
