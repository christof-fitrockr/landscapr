import {Injectable} from '@angular/core';
import {Process} from '../models/process';
import {Observable} from 'rxjs';
import {environment} from '../../environments/environment';
import {HttpClient} from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class ProcessService {

  constructor(private http: HttpClient) {
  }

  all(): Observable<Process[]> {
    return this.http.get<Process[]>(`${environment.apiUrl}/process/all`);
  }

  allFavorites() {
    return this.http.get<Process[]>(`${environment.apiUrl}/process/allFavorites`);
  }

  allParents(processId: string) {
    return this.http.get<Process[]>(`${environment.apiUrl}/process/allParent/` + processId);
  }


  byId(id: string): Observable<Process> {
    return this.http.get<Process>(`${environment.apiUrl}/process/byId/` + id);
  }

  byIds(ids: string[]): Observable<Process[]> {
    return this.http.post<Process[]>(`${environment.apiUrl}/process/byIds`, ids);
  }

  byName(name: string): Observable<Process[]> {
    return this.http.get<Process[]>(`${environment.apiUrl}/process/byName/` + name);
  }

  byApiCall(apiCallId: string) {
    return this.http.get<Process[]>(`${environment.apiUrl}/process/byApiCall/` + apiCallId);
  }


  create(process: Process): Observable<Process> {
    return this.http.post<Process>(`${environment.apiUrl}/process/update`, process);
  }

  update(id: string, process:  Process): Observable<Process> {
    return this.http.post<Process>(`${environment.apiUrl}/process/update`, process);
  }

  delete(processId: string): Observable<void> {
    return this.http.get<void>(`${environment.apiUrl}/process/delete/` + processId);
  }
}
