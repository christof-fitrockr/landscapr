import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {BehaviorSubject, Observable} from 'rxjs';
import {User} from '../models/user';

import {environment} from '../../environments/environment';

import {map, first} from 'rxjs/operators';
import {v4 as uuidv4} from 'uuid';
import {GithubService} from './github.service';



@Injectable({ providedIn: 'root' })
export class AuthenticationService {
    private currentUserSubject: BehaviorSubject<User>;
    public currentUser: Observable<User>;

    constructor(private http: HttpClient, private githubService: GithubService) {
        this.currentUserSubject = new BehaviorSubject<User>(JSON.parse(localStorage.getItem('currentUser')));
        this.currentUser = this.currentUserSubject.asObservable();

        if (this.currentUserSubject.value) {
            this.updateUserFromGithub();
        }
    }

    public getCurrentUserValue() {
      return this.currentUserSubject.value;
    }

    public updateUserFromGithub(githubUser?: any) {
        if (githubUser) {
            this.updateUserFields(githubUser);
        } else {
            const pat = this.githubService.getPersonalAccessToken();
            if (pat) {
                this.githubService.getUser().pipe(first()).subscribe(user => {
                    this.updateUserFields(user);
                }, err => console.log('Failed to fetch github user for auth update'));
            }
        }
    }

    private updateUserFields(githubUser: any) {
        const currentUser = this.currentUserSubject.value;
        if (currentUser) {
            currentUser.username = githubUser.login;
            currentUser.displayName = githubUser.name || githubUser.login;

            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            this.currentUserSubject.next(currentUser);
        }
    }

    login(loginCode: string) {

      return new Observable<User>(obs => {
        if(loginCode === "landscapr4adm1n!") {
          const authResponse = new User();
          authResponse.token = '3lkjnvdöcop0' + uuidv4();
          authResponse.admin = true;
          authResponse.success = true;
          authResponse.displayName = "Guest";
          authResponse.username = "Guest";
          // store authResponse details and jwt token in local storage to keep authResponse logged in between page refreshes
          localStorage.setItem('currentUser', JSON.stringify(authResponse));
          this.currentUserSubject.next(authResponse);
          obs.next(authResponse);
          return;
        }

        const failedResponse = new User();
        failedResponse.success = false;
        failedResponse.code = 'login-failed';
        obs.next(failedResponse);
        obs.complete();

      });


      //
      // return this.http.post<any>(`${environment.apiUrl}/authenticate`, { email, password })
      //   .pipe(map(authResponse => {
      //     // login successful if there's a jwt token in the response
      //     console.log(JSON.stringify(authResponse));
      //     if (authResponse && authResponse.token) {
      //       // store authResponse details and jwt token in local storage to keep authResponse logged in between page refreshes
      //       sessionStorage.setItem('currentUser', JSON.stringify(authResponse));
      //       this.currentUserSubject.next(authResponse);
      //     }
      //
      //     return authResponse;
      //   }));
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

  getUser(): User {
      return JSON.parse(localStorage.getItem('currentUser'));
  }

  isAdmin() {
    return this.getUser().admin
  }

  isEditor() {
    return this.getUser().editor
  }
}
