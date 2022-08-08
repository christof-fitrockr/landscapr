import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {Application} from '../models/application';
import {HttpClient} from '@angular/common/http';

import {environment} from '../../environments/environment';


@Injectable({
  providedIn: 'root',
})
export class ApplicationService {

  constructor(private http: HttpClient) {
  }

  all(): Observable<Application[]> {
    return this.http.get<Application[]>(`${environment.apiUrl}/application/all`);
  }

  byId(id: string): Observable<Application> {
    return this.http.get<Application>(`${environment.apiUrl}/application/byId/` + id);
  }

  byIds(ids: string[]): Observable<Application[]> {
    return this.http.post<Application[]>(`${environment.apiUrl}/application/byIds`, ids);
  }

  byName(name: string): Observable<Application[]> {
    return this.http.get<Application[]>(`${environment.apiUrl}/application/byName/` + name);
  }

  create(system: Application): Observable<Application> {
    return this.http.post<Application>(`${environment.apiUrl}/application/update`, system);
  }

  update(id: string, system:  Application): Observable<Application> {
    return this.http.post<Application>(`${environment.apiUrl}/application/update`, system);
  }

  delete(systemId: string): Observable<void> {
    return this.http.get<void>(`${environment.apiUrl}/application/delete/` + systemId);
  }
}
