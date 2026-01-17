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
  branches: any[] = [];
  selectedRepo: any;
  owner: string;
  fileName: string;
  onClose: Subject<any>;
  private static readonly STORAGE_PREFIX_BRANCH = 'repositories.currentBranch.';


  // Branching state
  isNewBranch: boolean = false;
  selectedBranch: string;
  baseBranch: string;
  newBranchName: string;
  createPr: boolean = true;
  prTitle: string;

  isMainBranchProtected: boolean = false;

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
    this.githubService.getBranches(this.owner, repo.name).subscribe(branches => {
      this.branches = branches;

      // Load persisted branch logic similar to RepositoriesComponent
      const savedBranch = localStorage.getItem(SaveGithubDialogComponent.STORAGE_PREFIX_BRANCH + repo.name);
      const defaultBranchName = repo.default_branch || 'main';
      const targetBranch = savedBranch || defaultBranchName;

      this.selectedBranch = targetBranch;
      this.baseBranch = targetBranch;

      // If persisted/selected branch is main, force new branch mode
      if (targetBranch === defaultBranchName) {
          this.isMainBranchProtected = true;
          this.toggleNewBranch(true);
      } else {
          this.isMainBranchProtected = false;
          this.toggleNewBranch(false);
      }
    });
  }

  selectFile(file: any): void {
    this.fileName = file.name;
    if (this.createPr && !this.prTitle) {
      this.prTitle = `Update ${this.fileName}`;
    }
  }

  toggleNewBranch(isNew: boolean): void {
    this.isNewBranch = isNew;
    if (isNew) {
      this.generateBranchName();
      if (!this.prTitle) {
        this.prTitle = `Update ${this.fileName || 'file'}`;
      }
    }
  }

  generateBranchName(): void {
    const date = new Date();
    // Simple timestamp format: YYYYMMDD-HHMMSS
    const timestamp = date.toISOString().replace(/[-:T]/g, '').slice(0, 14);
    this.newBranchName = `update-${timestamp}`;
  }

  save(): void {
    // If we are creating a new branch, update the persistence for this repo
    if (this.isNewBranch && this.selectedRepo) {
        localStorage.setItem(SaveGithubDialogComponent.STORAGE_PREFIX_BRANCH + this.selectedRepo.name, this.newBranchName);
    }

    if (this.onClose) {
      const repoOwner = this.selectedRepo && this.selectedRepo.owner ? this.selectedRepo.owner.login : this.owner;
      this.onClose.next({
        repo: this.selectedRepo,
        fileName: this.fileName,
        owner: repoOwner, // Use repo owner instead of authenticated user
        branchMode: this.isNewBranch ? 'new' : 'existing',
        branchName: this.isNewBranch ? this.newBranchName : this.selectedBranch,
        baseBranch: this.baseBranch,
        createPr: this.isNewBranch && this.createPr,
        prTitle: this.prTitle
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
