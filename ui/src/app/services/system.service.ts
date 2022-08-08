import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {System} from '../models/system';
import {HttpClient} from '@angular/common/http';

import {environment} from '../../environments/environment';


@Injectable({
  providedIn: 'root',
})
export class SystemService {

  constructor(private http: HttpClient) {
  }

  all(): Observable<System[]> {
    return this.http.get<System[]>(`${environment.apiUrl}/system/all`);
  }

  byId(id: string): Observable<System> {
    return this.http.get<System>(`${environment.apiUrl}/system/byId/` + id);
  }

  byIds(ids: string[]): Observable<System[]> {
    return this.http.post<System[]>(`${environment.apiUrl}/system/byIds`, ids);
  }

  byName(name: string): Observable<System[]> {
    return this.http.get<System[]>(`${environment.apiUrl}/system/byName/` + name);
  }

  createSystem(system: System): Observable<System> {
    return this.http.post<System>(`${environment.apiUrl}/system/update`, system);
  }

  updateSystem(id: string, system:  System): Observable<System> {
    return this.http.post<System>(`${environment.apiUrl}/system/update`, system);
  }

  deleteSystem(systemId: string): Observable<void> {
    return this.http.get<void>(`${environment.apiUrl}/system/delete/` + systemId);
  }
}
