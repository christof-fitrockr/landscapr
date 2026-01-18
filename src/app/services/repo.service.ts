import {Injectable} from '@angular/core';
import {Observable, Subject, from, forkJoin} from 'rxjs';
import { map } from 'rxjs/operators';
import { LandscaprDb } from '../db/landscapr-db';

@Injectable({
  providedIn: 'root',
})
export class RepoService {

  public dataChanges = new Subject<void>();

  constructor(private db: LandscaprDb) {
    this.migrateFromLocalStorage();
  }

  getCurrentData(): Observable<{ processes: any[]; apiCalls: any[]; capabilities: any[]; applications: any[]; journeys: any[]; data: any[] }> {
    return forkJoin({
        processes: from(this.db.processes.toArray()),
        apiCalls: from(this.db.apiCalls.toArray()),
        capabilities: from(this.db.capabilities.toArray()),
        applications: from(this.db.applications.toArray()),
        journeys: from(this.db.journeys.toArray()),
        data: from(this.db.data.toArray())
    });
  }

  dataAvailable(): Observable<boolean> {
     return from(this.db.processes.count()).pipe(
         map(count => count > 0)
     );
  }

  downloadAsJson(): Observable<Blob> {
      return this.getCurrentData().pipe(
          map(data => {
              const payload = {
                  processes: data.processes || [],
                  apiCalls: data.apiCalls || [],
                  capabilities: data.capabilities || [],
                  applications: data.applications || [],
                  journeys: data.journeys || [],
                  data: data.data || []
              };
              return new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
          })
      );
  }

  uploadJson(document: File): Observable<void> {
    return new Observable(obs => {
      let fileReader = new FileReader();
      fileReader.onload = (e) => {
        const content = fileReader.result as string;
        try {
          const parsedData = JSON.parse(content);
          this.applyParsedData(parsedData).then(() => {
              obs.next();
              obs.complete();
          }).catch(err => obs.error(err));
        } catch (err) {
          obs.error(err);
        }
      }
      fileReader.onerror = (err) => {
        obs.error(err);
      };
      fileReader.readAsText(document);
    });
  }

  uploadJsonContent(content: string | object): Observable<void> {
    return new Observable<void>(obs => {
      try {
        if (!content) {
          throw new Error('No content provided');
        }
        const parsedData = typeof content === 'string' ? JSON.parse(content) : content;
        this.applyParsedData(parsedData as any).then(() => {
            obs.next();
            obs.complete();
        }).catch(err => obs.error(err));
      } catch (err) {
        console.error('Error parsing JSON content:', err, 'Content:', content);
        obs.error(err);
      }
    });
  }

  applyData(parsedData: { applications?: any; capabilities?: any; apiCalls?: any; processes?: any; journeys?: any; data?: any; }): void {
     this.applyParsedData(parsedData).catch(err => console.error(err));
  }

  private async applyParsedData(parsedData: { applications?: any; capabilities?: any; apiCalls?: any; processes?: any; journeys?: any; data?: any; }): Promise<void> {
    await this.db.transaction('rw', [this.db.processes, this.db.apiCalls, this.db.capabilities, this.db.applications, this.db.journeys as any, this.db.data], async () => {
        await this.db.processes.clear();
        await this.db.apiCalls.clear();
        await this.db.capabilities.clear();
        await this.db.applications.clear();
        await this.db.journeys.clear();
        await this.db.data.clear();

        if (parsedData.processes) await this.db.processes.bulkAdd(parsedData.processes);
        if (parsedData.apiCalls) await this.db.apiCalls.bulkAdd(parsedData.apiCalls);
        if (parsedData.capabilities) await this.db.capabilities.bulkAdd(parsedData.capabilities);
        if (parsedData.applications) await this.db.applications.bulkAdd(parsedData.applications);
        if (parsedData.journeys) await this.db.journeys.bulkAdd(parsedData.journeys);
        if (parsedData.data) await this.db.data.bulkAdd(parsedData.data);
    });
    this.dataChanges.next();
  }

  private async migrateFromLocalStorage() {
      try {
          // Check if DB is empty
          const count = await this.db.processes.count();
          if (count === 0) {
              // Check if LS has data
              const processesRaw = localStorage.getItem('ls_process');
              // Only migrate if we have processes (or check others)
              if (processesRaw) {
                 console.log('Migrating data from localStorage to IndexedDB...');
                 const apiCallsRaw = localStorage.getItem('ls_api');
                 const capabilitiesRaw = localStorage.getItem('ls_capability');
                 const applicationsRaw = localStorage.getItem('ls_app');
                 const journeysRaw = localStorage.getItem('ls_journey');

                 const parsedData = {
                     processes: processesRaw ? JSON.parse(processesRaw) : [],
                     apiCalls: apiCallsRaw ? JSON.parse(apiCallsRaw) : [],
                     capabilities: capabilitiesRaw ? JSON.parse(capabilitiesRaw) : [],
                     applications: applicationsRaw ? JSON.parse(applicationsRaw) : [],
                     journeys: journeysRaw ? JSON.parse(journeysRaw) : []
                 };

                 await this.applyParsedData(parsedData);

                 // Clear LocalStorage
                 localStorage.removeItem('ls_process');
                 localStorage.removeItem('ls_api');
                 localStorage.removeItem('ls_capability');
                 localStorage.removeItem('ls_app');
                 localStorage.removeItem('ls_journey');
                 console.log('Migration complete.');
              }
          }
      } catch (e) {
          console.error('Migration failed', e);
      }
  }
}
