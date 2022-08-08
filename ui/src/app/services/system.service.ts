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

  allSystems(): Observable<System[]> {
    return this.http.get<System[]>(`${environment.apiUrl}/system/all`);
  }

  getSystemById(id: string): Observable<System> {
    return this.http.get<System>(`${environment.apiUrl}/system/byId/` + id);
  }

  getSystemByIds(ids: string[]): Observable<System[]> {
    return this.http.post<System[]>(`${environment.apiUrl}/system/byIds`, ids);
  }

  getSystemByName(name: string): Observable<System[]> {
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
