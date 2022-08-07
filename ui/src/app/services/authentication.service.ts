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

    login(username: string, password: string) {
      return this.http.post<any>(`${environment.apiUrl}/authenticate`, { username, password })
        .pipe(map(user => {
          // login successful if there's a jwt token in the response
          if (user && user.token) {
            // store user details and jwt token in local storage to keep user logged in between page refreshes
            localStorage.setItem('currentUser', JSON.stringify(user));
            this.currentUserSubject.next(user);
          }

          return user;
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
