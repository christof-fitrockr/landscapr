import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {Repo} from '../models/repo';
import {Upload} from '../helpers/upload';


@Injectable({
  providedIn: 'root',
})
export class RepoService {

  constructor() {
  }

  private static load(): Repo[] {
    return JSON.parse(localStorage.getItem('ls_repo')) as Repo[];
  }

  private static store(apps: Repo[]): void {
    localStorage.setItem('ls_repo', JSON.stringify(apps));
  }

  all(): Observable<Repo[]> {
    return new Observable<Repo[]>(obs => {
      obs.next(RepoService.load());
    });
    // return this.http.get<Repo[]>(`${environment.apiUrl}/repo/all`);
  }

  byId(id: string): Observable<Repo> {
    return new Observable<Repo>(obs => {
      const apps = RepoService.load();
      for (const app of apps) {
        if(app.id === id) {
          obs.next(app);
        }
      }
      obs.error();
    });
    // return this.http.get<Repo>(`${environment.apiUrl}/repo/byId/` + id);
  }

  update(id: string, repo:  Repo): Observable<Repo> {
    return new Observable<Repo>(obs => {
      const apps = RepoService.load();
      for (let i = 0; i < apps.length; i++){
        const app = apps[i];
        if(app.id === id) {
          app[i] = repo;
          RepoService.store(apps);
          obs.next(repo);
        }
      }
      obs.error();
    });
    // return this.http.post<Repo>(`${environment.apiUrl}/repo/update`, repo);
  }

  delete(id: string): Observable<void> {
    return new Observable<void>(obs => {
      let apps = RepoService.load();
      for (let i = 0; i < apps.length; i++){
        const app = apps[i];
        if(app.id === id) {
          apps = apps.splice(i, 1);
          RepoService.store(apps);
          obs.next();
        }
      }
      obs.error();
    });
    // return this.http.get<void>(`${environment.apiUrl}/repo/delete/` + repoId);
  }

  copy(repoId: string, nameOfCopy: string): Observable<Repo> {
    // TODO
    return null;
    // return this.http.post<Repo>(`${environment.apiUrl}/repo/copy/` + repoId, nameOfCopy);
  }

  downloadAsJson(repoId: string): Observable<Blob> {
    // TODO
    return null;
    // @ts-ignore
    // return this.http.get<Blob>(`${environment.apiUrl}/repo/download/` + repoId + `.json`,  { responseType: 'blob' });
  }

  uploadJson(repoId, document: File): Observable<Upload> {
    // TODO
    return null;
    //   const formData: FormData = new FormData();
    //   formData.append('Document', document, document.name);
    //   return this.http.post(`${environment.apiUrl}/repo/upload/${repoId}`, formData, {
    //   reportProgress: true,
    //   observe: 'events',
    // }).pipe(upload());
  }
}
