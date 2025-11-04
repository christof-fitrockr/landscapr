import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { GithubService } from '../services/github.service';
import { Observable } from 'rxjs';

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

  constructor(
    public dialogRef: MatDialogRef<GithubDialogComponent>,
    private githubService: GithubService
  ) { }

  ngOnInit(): void {
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
    this.dialogRef.close(file);
  }

  close(): void {
    this.dialogRef.close();
  }
}
