import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {CapabilityService} from './capability.service';
import {ProcessService} from './process.service';
import {ApiCallService} from './api-call.service';
import {ApplicationService} from './application.service';


@Injectable({
  providedIn: 'root',
})
export class RepoService {

  dataAvailable(): boolean {
    return localStorage.getItem(ProcessService.STORAGE_KEY) != null
      || localStorage.getItem(ApiCallService.STORAGE_KEY) != null
      || localStorage.getItem(CapabilityService.STORAGE_KEY) != null
      || localStorage.getItem(ApplicationService.STORAGE_KEY) != null;
  }

  downloadAsJson(): Observable<Blob> {
    return new Observable<Blob>(obs => {
      let res = '{'
      res += '"processes": ' + localStorage.getItem(ProcessService.STORAGE_KEY);
      res += '", apiCalls": ' + localStorage.getItem(ApiCallService.STORAGE_KEY);
      res += '", capabilities": ' + localStorage.getItem(CapabilityService.STORAGE_KEY);
      res += '", applications": ' + localStorage.getItem(ApplicationService.STORAGE_KEY);
      res += '}';
      const blob = new Blob([res], {type: 'application/json'});
      obs.next(blob);
    });
  }

  uploadJson(document: File): Observable<void> {
    return new Observable(obs => {
      let fileReader = new FileReader();
      fileReader.onload = (e) => {
        let parsedData = JSON.parse(fileReader.result as string);
        localStorage.setItem(ApplicationService.STORAGE_KEY, JSON.stringify(parsedData.applications))
        localStorage.setItem(CapabilityService.STORAGE_KEY, JSON.stringify(parsedData.capabilities))
        localStorage.setItem(ApiCallService.STORAGE_KEY, JSON.stringify(parsedData.apiCalls))
        localStorage.setItem(ProcessService.STORAGE_KEY, JSON.stringify(parsedData.processes))
        obs.next();
      }
      fileReader.readAsText(document);
    });

  }
}
