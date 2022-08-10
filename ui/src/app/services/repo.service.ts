import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {HttpClient} from '@angular/common/http';

import {environment} from '../../environments/environment';
import {Repo} from '../models/repo';
import {upload, Upload} from '../helpers/upload';


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

  downloadAsJson(repoId: string): Observable<Blob> {
    // @ts-ignore
    return this.http.get<Blob>(`${environment.apiUrl}/repo/download/` + repoId + `.json`,  { responseType: 'blob' });
  }

  uploadJson(repoId, document: File): Observable<Upload> {
      const formData: FormData = new FormData();
      formData.append('Document', document, document.name);
      return this.http.post(`${environment.apiUrl}/repo/upload/${repoId}`, formData, {
      reportProgress: true,
      observe: 'events',
    }).pipe(upload());
  }
}
