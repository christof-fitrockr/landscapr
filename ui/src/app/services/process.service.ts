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

  all(repoId: string): Observable<Process[]> {
    return this.http.get<Process[]>(`${environment.apiUrl}/process/all/` + repoId);
  }

  allFavorites(repoId: string) {
    return this.http.get<Process[]>(`${environment.apiUrl}/process/allFavorites/` + repoId);
  }

  allParents(repoId: string, processId: string) {
    return this.http.get<Process[]>(`${environment.apiUrl}/process/allParent/` + repoId + '/' + processId);
  }


  byId(id: string): Observable<Process> {
    return this.http.get<Process>(`${environment.apiUrl}/process/byId/` + id);
  }

  byIds(ids: string[]): Observable<Process[]> {
    return this.http.post<Process[]>(`${environment.apiUrl}/process/byIds`, ids);
  }

  byName(repoId: string, name: string): Observable<Process[]> {
    return this.http.get<Process[]>(`${environment.apiUrl}/process/byName/` + repoId + '/' + name);
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
