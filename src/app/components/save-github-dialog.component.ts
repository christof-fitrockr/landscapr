import { Component, OnInit } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { GithubService } from '../services/github.service';
import { Observable, Subject } from 'rxjs';

@Component({
  selector: 'app-save-github-dialog',
  templateUrl: './save-github-dialog.component.html',
  styleUrls: ['./save-github-dialog.component.scss']
})
export class SaveGithubDialogComponent implements OnInit {

  pat: string;
  repos$: Observable<any[]>;
  files$: Observable<any[]>;
  selectedRepo: any;
  owner: string;
  fileName: string;
  onClose: Subject<any>;

  constructor(
    public bsModalRef: BsModalRef,
    private githubService: GithubService,
  ) { }

  ngOnInit(): void {
    this.onClose = new Subject<any>();
    this.pat = this.githubService.getPersonalAccessToken();
    if (this.pat) {
      this.connect();
    }
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
    this.fileName = file.name;
  }

  save(): void {
    if (this.onClose) {
      this.onClose.next({
        repo: this.selectedRepo,
        fileName: this.fileName,
        owner: this.owner
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
