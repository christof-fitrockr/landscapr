import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { GithubService } from '../services/github.service';
import { Observable } from 'rxjs';

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

  constructor(
    public dialogRef: MatDialogRef<SaveGithubDialogComponent>,
    private githubService: GithubService,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) { }

  ngOnInit(): void {
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
    this.dialogRef.close({
      repo: this.selectedRepo,
      fileName: this.fileName,
      owner: this.owner
    });
  }

  close(): void {
    this.dialogRef.close();
  }
}
