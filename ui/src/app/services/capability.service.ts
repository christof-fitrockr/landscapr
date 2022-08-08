import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {Capability} from '../models/capability';
import {HttpClient} from '@angular/common/http';
import {environment} from '../../environments/environment';


@Injectable({
  providedIn: 'root',
})
export class CapabilityService {

  constructor(private http: HttpClient) {
  }

  all(repoId: string): Observable<Capability[]> {
    return this.http.get<Capability[]>(`${environment.apiUrl}/capability/all/` + repoId);
  }

  byId(id: string): Observable<Capability> {
    return this.http.get<Capability>(`${environment.apiUrl}/capability/byId/` + id);
  }

  byIds(ids: string[]): Observable<Capability[]> {
    return this.http.post<Capability[]>(`${environment.apiUrl}/capability/byIds`, ids);
  }

  byName(name: string): Observable<Capability[]> {
    return this.http.get<Capability[]>(`${environment.apiUrl}/capability/byName/` + name);
  }

  byImplementation(systemId: string): Observable<Capability[]> {
    return this.http.get<Capability[]>(`${environment.apiUrl}/cabability/byImplementation/` + systemId);
  }

  create(capability: Capability): Observable<Capability> {
    return this.http.post<Capability>(`${environment.apiUrl}/capability/update`, capability);
  }

  update(id: string, capability:  Capability): Observable<Capability> {
    return this.http.post<Capability>(`${environment.apiUrl}/capability/update`, capability);
  }

  delete(capabilityId: string): Observable<void> {
    return this.http.get<void>(`${environment.apiUrl}/capability/delete/` + capabilityId);
  }
}
