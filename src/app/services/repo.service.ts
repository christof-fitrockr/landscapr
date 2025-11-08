import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {CapabilityService} from './capability.service';
import {ProcessService} from './process.service';
import {ApiCallService} from './api-call.service';
import {ApplicationService} from './application.service';
import { JourneyService } from './journey.service';


@Injectable({
  providedIn: 'root',
})
export class RepoService {

  dataAvailable(): boolean {
    return localStorage.getItem(ProcessService.STORAGE_KEY) != null
      || localStorage.getItem(ApiCallService.STORAGE_KEY) != null
      || localStorage.getItem(CapabilityService.STORAGE_KEY) != null
      || localStorage.getItem(ApplicationService.STORAGE_KEY) != null
      || localStorage.getItem(JourneyService.STORAGE_KEY) != null;
  }

  downloadAsJson(): Observable<Blob> {
    return new Observable<Blob>(obs => {
      const processesRaw = localStorage.getItem(ProcessService.STORAGE_KEY);
      const apiCallsRaw = localStorage.getItem(ApiCallService.STORAGE_KEY);
      const capabilitiesRaw = localStorage.getItem(CapabilityService.STORAGE_KEY);
      const applicationsRaw = localStorage.getItem(ApplicationService.STORAGE_KEY);
      const journeysRaw = localStorage.getItem(JourneyService.STORAGE_KEY);

      let processes: any = [];
      let apiCalls: any = [];
      let capabilities: any = [];
      let applications: any = [];
      let journeys: any = [];

      try { processes = processesRaw ? JSON.parse(processesRaw) : []; } catch { processes = []; }
      try { apiCalls = apiCallsRaw ? JSON.parse(apiCallsRaw) : []; } catch { apiCalls = []; }
      try { capabilities = capabilitiesRaw ? JSON.parse(capabilitiesRaw) : []; } catch { capabilities = []; }
      try { applications = applicationsRaw ? JSON.parse(applicationsRaw) : []; } catch { applications = []; }
      try { journeys = journeysRaw ? JSON.parse(journeysRaw) : []; } catch { journeys = []; }

      const payload = { processes, apiCalls, capabilities, applications, journeys };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      obs.next(blob);
      obs.complete();
    });
  }

  uploadJson(document: File): Observable<void> {
    return new Observable(obs => {
      let fileReader = new FileReader();
      fileReader.onload = (e) => {
        const content = fileReader.result as string;
        try {
          const parsedData = JSON.parse(content);
          this.applyParsedData(parsedData);
          obs.next();
        } catch (err) {
          throw err;
        }
      }
      fileReader.readAsText(document);
    });

  }

  uploadJsonContent(content: string | object): Observable<void> {
    return new Observable<void>(obs => {
      try {
        const parsedData = typeof content === 'string' ? JSON.parse(content) : content;
        this.applyParsedData(parsedData as any);
        obs.next();
      } catch (err) {
        throw err;
      }
    });
  }

  private applyParsedData(parsedData: { applications?: any; capabilities?: any; apiCalls?: any; processes?: any; journeys?: any; }): void {
    localStorage.setItem(ApplicationService.STORAGE_KEY, JSON.stringify(parsedData.applications))
    localStorage.setItem(CapabilityService.STORAGE_KEY, JSON.stringify(parsedData.capabilities))
    localStorage.setItem(ApiCallService.STORAGE_KEY, JSON.stringify(parsedData.apiCalls))
    localStorage.setItem(ProcessService.STORAGE_KEY, JSON.stringify(parsedData.processes))
    localStorage.setItem(JourneyService.STORAGE_KEY, JSON.stringify(parsedData.journeys))
  }
}
