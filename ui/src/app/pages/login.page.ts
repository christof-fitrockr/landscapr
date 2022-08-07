import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { first } from 'rxjs/operators';



import {AppService} from "../services/app.service";
import {AuthenticationService} from "../services/authentication.service";
import {AlertService} from "../services/alert.service";
@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss']
})
export class LoginPage implements OnInit {

  loginForm: FormGroup;
  loading = false;
  submitted = false;
  returnUrl: string;

  constructor(
    private formBuilder: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authenticationService: AuthenticationService,
    private alertService: AlertService
  ) {
    // redirect to home if already logged in
    if (this.authenticationService.isAuthorized()) {
      this.router.navigate(['/']);
    }
  }

  ngOnInit() {
    this.loginForm = this.formBuilder.group({
      email: ['', Validators.required],
      password: ['', Validators.required]
    });

    // get return url from route parameters or default to '/'
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
  }

  // convenience getter for easy access to form fields
  errorMessage: string;
  get f() { return this.loginForm.controls; }

  onSubmit() {
    this.submitted = true;

    // stop here if form is invalid
    if (this.loginForm.invalid) {
      return;
    }

    this.errorMessage = undefined;
    this.loading = true;
    this.authenticationService.login(this.f.email.value, this.f.password.value)
      .pipe(first())
      .subscribe(
        data => {
          if(data.success) {
            this.router.navigate([this.returnUrl]).then(() => location.reload());
          } else {
            switch(data.code) {
              case 'login-failed':
                this.errorMessage = "Email/Password does not match.";
                break;
              default:
                this.errorMessage = "Unknown error";
                break;
            }
            this.loading = false;
            this.alertService.error(this.errorMessage);
          }

        },
        error => {
          this.errorMessage = "Communication error";
          this.loading = false;
          this.alertService.error(error);
        });
  }
}
