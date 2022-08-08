import {Component, OnInit} from '@angular/core';
import {AppService} from './services/app.service';
import {AuthenticationService} from "./services/authentication.service";
import {ActivatedRoute, Router} from '@angular/router';
import {Observable} from 'rxjs';
import {Repo} from './models/repo';
import {RepoService} from './services/repo.service';
import {ToastrService} from 'ngx-toastr';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  loggedIn: boolean;
  repos$: Observable<Repo[]>;
  selectedRepoId: string;

  constructor(private appService: AppService, private authenticationService: AuthenticationService,
              private router: Router, private repoService: RepoService, private toastr: ToastrService) { }

  ngOnInit() {
    this.selectedRepoId = localStorage.getItem('selectedRepoId');
    this.loggedIn = this.authenticationService.isAuthorized();
    this.repos$ = this.repoService.all();
  }

  logout() {
    this.authenticationService.logout().subscribe(item => {
      if(item) {
        this.loggedIn = false;
        this.router.navigate(['/']).then(() => {
          location.reload()
        });
      }
    })
  }

  isAdmin() {
    return this.authenticationService.isAdmin();
  }

  changeRepo(repo: Repo) {
    if(repo) {
      this.router.navigateByUrl(this.router.url.replace(this.selectedRepoId, repo.id)).then(() => {
        this.toastr.info('Repository ' + repo.name + ' selected.')
      });
      localStorage.setItem('selectedRepoId', repo.id);
      this.selectedRepoId = repo.id;
    } else {
      localStorage.removeItem('selectedRepoId');
      this.selectedRepoId = undefined;
      this.router.navigateByUrl('/dashboard').then(() => {
      });
    }
  }
}
