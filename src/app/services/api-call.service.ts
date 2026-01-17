import {Injectable} from '@angular/core';
import {Observable, from, of, throwError} from 'rxjs';
import {map, switchMap} from 'rxjs/operators';
import {ApiCall} from '../models/api-call';
import {v4 as uuidv4} from 'uuid';
import { LandscaprDb } from '../db/landscapr-db';

@Injectable({
  providedIn: 'root',
})
export class ApiCallService {

  public static STORAGE_KEY = 'ls_api';

  constructor(private db: LandscaprDb) {}

  private fixLegacy(api: ApiCall): ApiCall {
      // @ts-ignore
      if ((api as any).documentation == null && (api as any).docLinkUrl) {
        // @ts-ignore
        (api as any).documentation = (api as any).docLinkUrl;
      }
      return api;
  }

  all(): Observable<ApiCall[]> {
    return from(this.db.apiCalls.toArray()).pipe(
        map(apis => apis.map(api => this.fixLegacy(api)))
    );
  }

  byId(id: string): Observable<ApiCall> {
    return from(this.db.apiCalls.get(id)).pipe(
        switchMap(api => {
            if (api) return of(this.fixLegacy(api));
            return throwError(undefined);
        })
    );
  }

  byIds(ids: string[]): Observable<ApiCall[]> {
    if (!ids || ids.length === 0) return of([]);
    return from(this.db.apiCalls.where('id').anyOf(ids).toArray()).pipe(
        map(apis => apis.map(api => this.fixLegacy(api)))
    );
  }

  byName(repoId: string, name: string): Observable<ApiCall[]> {
    return from(this.db.apiCalls.where('name').equals(name).toArray()).pipe(
        map(apis => apis.map(api => this.fixLegacy(api)))
    );
  }

  byCapability(repoId: string, capabilityId: string): Observable<ApiCall[]> {
    return from(this.db.apiCalls.where('capabilityId').equals(capabilityId).toArray()).pipe(
        map(apis => apis.map(api => this.fixLegacy(api)))
    );
  }

  byImplementation(systemId: string): Observable<ApiCall[]> {
    return from(this.db.apiCalls.where('implementedBy').equals(systemId).toArray()).pipe(
        map(apis => apis.map(api => this.fixLegacy(api)))
    );
  }

  create(apiCall: ApiCall): Observable<ApiCall> {
      apiCall.id = uuidv4();
      return from(this.db.apiCalls.add(apiCall)).pipe(
          map(() => apiCall)
      );
  }

  update(id: string, apiCall:  ApiCall): Observable<ApiCall> {
    return from(this.db.apiCalls.update(id, apiCall as any)).pipe(
        switchMap(updated => {
            if (updated) return of(apiCall);
            return throwError(undefined);
        })
    );
  }

  delete(id: string): Observable<void> {
    return from(this.db.apiCalls.delete(id));
  }
}
