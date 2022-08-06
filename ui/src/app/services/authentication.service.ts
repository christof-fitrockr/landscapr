import {Injectable, NgZone} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {BehaviorSubject, Observable} from 'rxjs';
import {User} from "../models/user";
import {AngularFireAuth} from '@angular/fire/compat/auth';
import {Router} from '@angular/router';
import {AngularFirestore, AngularFirestoreDocument} from '@angular/fire/compat/firestore';


@Injectable({ providedIn: 'root' })
export class AuthenticationService {
    private currentUserSubject: BehaviorSubject<User>;
    public currentUser: Observable<User>;
  userData: any;

    constructor(private http: HttpClient,  public afs: AngularFirestore, public authService: AngularFireAuth, public router: Router, public ngZone: NgZone) {
        this.currentUserSubject = new BehaviorSubject<User>(JSON.parse(localStorage.getItem('currentUser')));
        this.currentUser = this.currentUserSubject.asObservable();
      this.authService.authState.subscribe((user) => {
        if (user) {
          this.userData = user;
          localStorage.setItem('user', JSON.stringify(this.userData));
          JSON.parse(localStorage.getItem('user')!);
        } else {
          localStorage.setItem('user', 'null');
          JSON.parse(localStorage.getItem('user')!);
        }
      });
    }

    public getCurrentUserValue() {
      return this.authService;
    }

    login(username: string, password: string) {
      // return this.authService
      //   .signInWithEmailAndPassword(username, password)
      //   .then((result) => {
      //     this.ngZone.run(() => {
      //       this.router.navigate(['dashboard']);
      //     });
      //     this.setUserData(result.user);
      //   })
      //   .catch((error) => {
      //     window.alert(error.message);
      //   });

      return new Observable(observer => {
        this.authService.signInWithEmailAndPassword(username, password).then(result => {
          this.setUserData(result.user);
          observer.next();
        }).catch(err => {
          observer.error(err);
        })
      });
    }

    logout() {
      return new Observable(observer => {
        this.authService.signOut().then(() => {
          observer.next(true);
          observer.complete();
          localStorage.removeItem('user');
          this.router.navigate(['/login']);
        });
      });
    }

  authorized(): boolean {


    return this.getCurrentUserValue() !== undefined && this.getCurrentUserValue() !== null;
  }

  setUserData(user: any) {
    const userRef: AngularFirestoreDocument<any> = this.afs.doc(
      `users/${user.uid}`
    );
    const userData: User = {
      id: user.uid,
      username: user.email,
      displayName: user.displayName,
    };
    return userRef.set(userData, {
      merge: true,
    });
  }

  isLoggedIn(): boolean {
    const user = JSON.parse(localStorage.getItem('user')!);
    return user !== null;
  }
}
