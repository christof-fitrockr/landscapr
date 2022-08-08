import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {ApiCall} from '../models/api-call';
import {HttpClient} from '@angular/common/http';
import {environment} from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ApiCallService {


  constructor(private http: HttpClient) {
  }

  all(): Observable<ApiCall[]> {
    return this.http.get<ApiCall[]>(`${environment.apiUrl}/apiCall/all`);
  }

  byId(id: string): Observable<ApiCall> {
    return this.http.get<ApiCall>(`${environment.apiUrl}/apiCall/byId/` + id);
  }

  byIds(ids: string[]): Observable<ApiCall[]> {
    return this.http.post<ApiCall[]>(`${environment.apiUrl}/apiCall/byIds`, ids);
  }

  byName(name: string): Observable<ApiCall[]> {
    return this.http.get<ApiCall[]>(`${environment.apiUrl}/apiCall/byName/` + name);
  }

  byCapability(capabilityId: string): Observable<ApiCall[]> {
    return this.http.get<ApiCall[]>(`${environment.apiUrl}/apiCall/byName` + capabilityId);
  }

  create(apiCall: ApiCall): Observable<ApiCall> {
    return this.http.post<ApiCall>(`${environment.apiUrl}/apiCall/update`, apiCall);
  }

  update(id: string, apiCall:  ApiCall): Observable<ApiCall> {
    return this.http.post<ApiCall>(`${environment.apiUrl}/apiCall/update`, apiCall);
  }

  delete(apiCallId: string): Observable<void> {
    return this.http.get<void>(`${environment.apiUrl}/apiCall/delete/` + apiCallId);
  }
}
