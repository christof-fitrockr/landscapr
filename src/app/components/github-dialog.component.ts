import { Component, OnInit } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { GithubService } from '../services/github.service';
import { Observable, Subject } from 'rxjs';

@Component({
  selector: 'app-github-dialog',
  templateUrl: './github-dialog.component.html',
  styleUrls: ['./github-dialog.component.scss']
})
export class GithubDialogComponent implements OnInit {

  pat: string;
  repos$: Observable<any[]>;
  files$: Observable<any[]>;
  selectedRepo: any;
  owner: string;
  onClose: Subject<any>;

  constructor(
    public bsModalRef: BsModalRef,
    private githubService: GithubService
  ) { }

  ngOnInit(): void {
    this.onClose = new Subject<any>();
    this.pat = this.githubService.getPersonalAccessToken();
  }

  connect(): void {
    this.githubService.setPersonalAccessToken(this.pat);
    this.githubService.getUser().subscribe(user => {
      this.owner = user.login;
      this.repos$ = this.githubService.getRepos();
    });
  }

  selectRepo(repo: any): void {
    this.selectedRepo = repo;
    this.files$ = this.githubService.getRepoContents(this.owner, repo.name, '');
  }

  selectFile(file: any): void {
    if (this.onClose) {
      this.onClose.next({
        owner: { login: this.owner },
        repo: this.selectedRepo,
        path: file.path
      });
      this.onClose.complete();
    }
    this.bsModalRef.hide();
  }

  close(): void {
    if (this.onClose) {
      this.onClose.next(null);
      this.onClose.complete();
    }
    this.bsModalRef.hide();
  }
}
