import {Injectable, NgZone} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {BehaviorSubject, Observable} from 'rxjs';
import {User} from '../models/user';
import {Router} from '@angular/router';

import {environment} from '../../environments/environment';

import {map} from 'rxjs/operators';


@Injectable({ providedIn: 'root' })
export class AuthenticationService {
    private currentUserSubject: BehaviorSubject<User>;
    public currentUser: Observable<User>;
  userData: any;

    constructor(private http: HttpClient,  public router: Router, public ngZone: NgZone) {
        this.currentUserSubject = new BehaviorSubject<User>(JSON.parse(localStorage.getItem('currentUser')));
        this.currentUser = this.currentUserSubject.asObservable();
      // this.authService.authState.subscribe((user) => {
      //   if (user) {
      //     this.userData = user;
      //     localStorage.setItem('user', JSON.stringify(this.userData));
      //     JSON.parse(localStorage.getItem('user')!);
      //   } else {
      //     localStorage.setItem('user', 'null');
      //     JSON.parse(localStorage.getItem('user')!);
      //   }
      // });
    }

    public getCurrentUserValue() {
      // return this.authService;
      return null;
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
      return new Observable(observer => {
        // this.authService.signOut().then(() => {
        //   observer.next(true);
        //   observer.complete();
        //   localStorage.removeItem('user');
        //   this.router.navigate(['/login']);
        // });
      });
    }

  authorized(): boolean {


    return this.getCurrentUserValue() !== undefined && this.getCurrentUserValue() !== null;
  }

  setUserData(user: any) {
    // const userRef: AngularFirestoreDocument<any> = this.afs.doc(
    //   `users/${user.uid}`
    // );
    // const userData: User = {
    //   id: user.uid,
    //   username: user.email,
    //   displayName: user.displayName,
    // };
    // return userRef.set(userData, {
    //   merge: true,
    // });
  }

  isLoggedIn(): boolean {
    const user = JSON.parse(localStorage.getItem('user')!);
    return user !== null;
  }
}
