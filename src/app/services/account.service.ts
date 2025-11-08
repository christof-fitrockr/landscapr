import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {HttpClient} from '@angular/common/http';

import {environment} from '../../environments/environment';
import {Account} from '../models/account';


@Injectable({
  providedIn: 'root',
})
export class AccountService {

  constructor(private http: HttpClient) {
  }

  all(): Observable<Account[]> {
    return this.http.get<Account[]>(`${environment.apiUrl}/account/all`);
  }

  byId(id: string): Observable<Account> {
    return this.http.get<Account>(`${environment.apiUrl}/account/byId/` + id);
  }

  invite(account: Account): Observable<Account> {
    return this.http.post<Account>(`${environment.apiUrl}/account/invite`, account);
  }

  update(id: string, account:  Account): Observable<Account> {
    return this.http.post<Account>(`${environment.apiUrl}/account/update`, account);
  }

  delete(accountId: string): Observable<void> {
    return this.http.get<void>(`${environment.apiUrl}/account/delete/` + accountId);
  }
}
