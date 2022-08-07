import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {BehaviorSubject, Observable} from 'rxjs';
import {User} from '../models/user';

import {environment} from '../../environments/environment';

import {map} from 'rxjs/operators';


@Injectable({ providedIn: 'root' })
export class AuthenticationService {
    private currentUserSubject: BehaviorSubject<User>;
    public currentUser: Observable<User>;

    constructor(private http: HttpClient) {
        this.currentUserSubject = new BehaviorSubject<User>(JSON.parse(localStorage.getItem('currentUser')));
        this.currentUser = this.currentUserSubject.asObservable();
    }

    public getCurrentUserValue() {
      return this.currentUserSubject.value;
    }

    login(email: string, password: string) {
      return this.http.post<any>(`${environment.apiUrl}/authenticate`, { email, password })
        .pipe(map(authResponse => {
          // login successful if there's a jwt token in the response
          if (authResponse && authResponse.token) {
            // store authResponse details and jwt token in local storage to keep authResponse logged in between page refreshes
            localStorage.setItem('currentUser', JSON.stringify(authResponse));
            this.currentUserSubject.next(authResponse);
          }

          return authResponse;
        }));
    }

    logout() {
      return new Observable(observable => {
        // remove user from local storage to log user out
        localStorage.removeItem('currentUser');
        this.currentUserSubject.next(null);
        observable.next(true);      });

    }

  isAuthorized(): boolean {
    return this.getCurrentUserValue() !== undefined && this.getCurrentUserValue() !== null;
  }
}
