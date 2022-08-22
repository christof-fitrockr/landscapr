import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {Upload} from '../helpers/upload';
import {CapabilityService} from './capability.service';


@Injectable({
  providedIn: 'root',
})
export class RepoService {

  dataAvailable(): boolean {
    return localStorage.getItem(CapabilityService.STORAGE_KEY) != undefined;
  }

  downloadAsJson(): Observable<Blob> {

    return new Observable<Blob>(obs => {
      let res = '{'
      res += '"capabilities": ' + localStorage.getItem(CapabilityService.STORAGE_KEY);
      res += '}';
      const blob = new Blob([res], {type: 'application/json'});
      obs.next(blob);
    });
  }

  uploadJson(document: File): Observable<Upload> {

    let fileReader = new FileReader();
    fileReader.onload = (e) => {
      let parsedData = JSON.parse(fileReader.result as string);
      localStorage.setItem(CapabilityService.STORAGE_KEY, JSON.stringify(parsedData.capabilities))
    }
    fileReader.readAsText(document);

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
