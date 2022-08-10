import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {HttpClient} from '@angular/common/http';

import {environment} from '../../environments/environment';
import {Repo} from '../models/repo';


@Injectable({
  providedIn: 'root',
})
export class RepoService {

  constructor(private http: HttpClient) {
  }

  all(): Observable<Repo[]> {
    return this.http.get<Repo[]>(`${environment.apiUrl}/repo/all`);
  }

  byId(id: string): Observable<Repo> {
    return this.http.get<Repo>(`${environment.apiUrl}/repo/byId/` + id);
  }

  update(id: string, repo:  Repo): Observable<Repo> {
    return this.http.post<Repo>(`${environment.apiUrl}/repo/update`, repo);
  }

  delete(repoId: string): Observable<void> {
    return this.http.get<void>(`${environment.apiUrl}/repo/delete/` + repoId);
  }

  copy(repoId: string, nameOfCopy: string): Observable<Repo> {
    return this.http.post<Repo>(`${environment.apiUrl}/repo/copy/` + repoId, nameOfCopy);
  }
}
