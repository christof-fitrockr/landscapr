import {Component, OnInit} from '@angular/core';
import {AppService} from './services/app.service';
import {AuthenticationService} from "./services/authentication.service";
import {Router} from "@angular/router";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  loggedIn: boolean;

  constructor(private appService: AppService, private authenticationService: AuthenticationService, private router: Router) { }

  ngOnInit() {
    this.loggedIn = this.authenticationService.isAuthorized();
  }

  logout() {
    this.authenticationService.logout().subscribe(item => {
      if(item) {
        this.loggedIn = false;
        this.router.navigate(['/']).then(() => {
          location.reload()
        });;
      }
    })
  }
}
