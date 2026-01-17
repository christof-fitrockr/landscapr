import { Component, OnInit } from '@angular/core';
import { GithubService } from '../services/github.service';
import { RepoService } from '../services/repo.service';
import { ToastrService } from 'ngx-toastr';
import { Observable, EMPTY, of } from 'rxjs';
import { first, switchMap, catchError } from 'rxjs/operators';
import { FileSaverService } from 'ngx-filesaver';
import { BsModalService } from 'ngx-bootstrap/modal';
import { AuthenticationService } from '../services/authentication.service';
import { CommitMessageDialogComponent } from '../components/commit-message-dialog.component';
import { PrDialogComponent } from '../components/pr-dialog.component';
import { ConfirmationDialogComponent } from '../components/confirmation-dialog.component';

@Component({
  selector: 'app-repositories',
  templateUrl: './repositories.component.html',
  styleUrls: ['./repositories.component.scss']
})
export class RepositoriesComponent implements OnInit {

  private static readonly STORAGE_SELECTED_REPO = 'repositories.selectedRepo';
  private static readonly STORAGE_SELECTED_REPO_OWNER = 'repositories.selectedRepoOwner';
  private static readonly STORAGE_SELECTED_FILE = 'repositories.selectedFilePath';
  private static readonly STORAGE_PREFIX_BRANCH = 'repositories.currentBranch.';

  pat: string = '';
  connectedUser: string = ''; // Authenticated user

  repos$: Observable<any[]> = EMPTY;
  files$: Observable<any[]> = EMPTY;
  pullRequests$: Observable<any[]> = EMPTY;

  selectedRepo: any = null;
  selectedFilePath: string | null = null;
  currentBranch: string = 'main';
  isRepoCollapsed: boolean = false;

  connecting = false;
  loadingFiles = false;
  loadingPRs = false;
  loadingFileContent = false;
  saving = false;
  submitting = false;
  startingEditMode = false;

  constructor(
    private githubService: GithubService,
    private repoService: RepoService,
    private fileSaverService: FileSaverService,
    private toastr: ToastrService,
    private modalService: BsModalService,
    private authService: AuthenticationService,
  ) {}

  ngOnInit(): void {
    const savedPat = this.githubService.getPersonalAccessToken();
    if (savedPat) {
      this.pat = savedPat;
      this.connect();
    }
  }

  connect(): void {
    if (!this.pat) { this.toastr.info('Enter your GitHub Personal Access Token'); return; }
    this.connecting = true;
    this.githubService.setPersonalAccessToken(this.pat);
    this.githubService.getUser().pipe(first()).subscribe(user => {
      this.connectedUser = user.login;
      this.authService.updateUserFromGithub(user);
      this.repos$ = this.githubService.getRepos();

      // Try to preselect previously selected repo when repos arrive
      const savedRepoName = localStorage.getItem(RepositoriesComponent.STORAGE_SELECTED_REPO);
      if (savedRepoName) {
        this.repos$.pipe(first()).subscribe(repos => {
          const found = repos?.find((r: any) => r?.name === savedRepoName);
          if (found) {
            this.selectRepo(found);
          }
        });
      }

      this.connecting = false;
      this.toastr.success('Connected to GitHub');
    }, _ => {
      this.connecting = false;
      this.toastr.error('Failed to connect to GitHub. Check your PAT.');
    });
  }

  selectRepo(repo: any): void {
    this.selectedRepo = repo;
    localStorage.setItem(RepositoriesComponent.STORAGE_SELECTED_REPO, repo?.name ?? '');
    localStorage.setItem(RepositoriesComponent.STORAGE_SELECTED_REPO_OWNER, repo?.owner?.login ?? '');
    this.selectedFilePath = null;
    this.isRepoCollapsed = false;

    // Load persisted branch or default
    const savedBranch = localStorage.getItem(RepositoriesComponent.STORAGE_PREFIX_BRANCH + repo.name);
    this.currentBranch = savedBranch || repo.default_branch || 'main';

    this.loadingFiles = true;
    this.loadingPRs = true;

    this.files$ = this.githubService.getRepoContents(repo.owner.login, repo.name, '');
    this.pullRequests$ = this.githubService.getPullRequests(repo.owner.login, repo.name);

    this.pullRequests$.pipe(first()).subscribe(_ => {
      this.loadingPRs = false;
    }, _ => {
      this.loadingPRs = false;
    });

    this.files$.pipe(first()).subscribe(files => {
      this.loadingFiles = false;
      const savedFilePath = localStorage.getItem(RepositoriesComponent.STORAGE_SELECTED_FILE);
      if (savedFilePath) {
        const found = (files || []).find((f: any) => f?.path === savedFilePath);
        if (found) {
          this.selectFile(found);
          this.isRepoCollapsed = true;
        }
      }
    }, _ => this.loadingFiles = false);
  }

  selectFile(file: any): void {
    this.selectedFilePath = file.path;
    if (this.selectedFilePath) {
      localStorage.setItem(RepositoriesComponent.STORAGE_SELECTED_FILE, this.selectedFilePath);
    }
  }

  switchBranch(branchName: string): void {
    this.currentBranch = branchName;
    if (this.selectedRepo) {
      localStorage.setItem(RepositoriesComponent.STORAGE_PREFIX_BRANCH + this.selectedRepo.name, branchName);
      // Reload file if selected
      if (this.selectedFilePath) {
          this.loadFromGithub();
      }
    }
  }

  loadFromGithub(): void {
    if (!this.selectedRepo || !this.selectedFilePath) { return; }
    const repoOwner = this.selectedRepo.owner.login;
    this.loadingFileContent = true;
    // Fetch from CURRENT branch
    this.githubService.getFileContent(repoOwner, this.selectedRepo.name, this.selectedFilePath, this.currentBranch)
      .pipe(first())
      .subscribe(fileContent => {
        try {
          const contentStr = atob(fileContent.content);
          this.repoService.uploadJsonContent(contentStr).pipe(first()).subscribe(() => {
            this.toastr.success(`Loaded content from ${this.currentBranch}`);
            this.loadingFileContent = false;
          }, _ => {
            this.loadingFileContent = false;
          });
        } catch (e) {
          this.toastr.error('Failed to parse GitHub file content');
          this.loadingFileContent = false;
        }
      }, _ => {
        this.toastr.error('Failed to load file from GitHub (does it exist on this branch?)');
        this.loadingFileContent = false;
      });
  }

  generateBranchName(): string {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = `${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
    return `${this.connectedUser}-${dateStr}-${timeStr}`;
  }

  startEditMode(): void {
    if (!this.selectedRepo) return;
    const branchName = this.generateBranchName();
    const repoOwner = this.selectedRepo.owner.login;
    const repoName = this.selectedRepo.name;
    const baseBranch = this.selectedRepo.default_branch || 'main';

    this.startingEditMode = true;
    this.toastr.info('Starting edit mode...');

    this.githubService.getRef(repoOwner, repoName, `heads/${baseBranch}`).pipe(
      switchMap((ref: any) => {
        const sha = ref.object.sha;
        return this.githubService.createBranch(repoOwner, repoName, branchName, sha);
      })
    ).subscribe(() => {
      this.startingEditMode = false;
      this.toastr.success(`Created branch ${branchName}`);
      this.switchBranch(branchName);
    }, err => {
      this.startingEditMode = false;
      this.toastr.error('Failed to create branch. Try again later.');
    });
  }

  submitChanges(): void {
    if (!this.selectedRepo) return;

    const confirmRef = this.modalService.show(ConfirmationDialogComponent, {
      initialState: {
        title: 'Submit Changes',
        message: 'Are you ready to submit your changes to the main repository? This will create a Pull Request for review.',
        btnYesText: 'Yes, Submit',
        btnNoText: 'Cancel'
      }
    });

    const content: any = confirmRef.content;
    if (content && content.onClose) {
      content.onClose.pipe(first()).subscribe((result: boolean) => {
        if (result) {
          this.executeSubmission();
        }
      });
    }
  }

  executeSubmission(): void {
    const repoOwner = this.selectedRepo.owner.login;
    const repoName = this.selectedRepo.name;
    const title = `Update by ${this.connectedUser} - ${new Date().toLocaleDateString()}`;
    const body = `Automated submission from Landscapr by ${this.connectedUser}.`;

    this.submitting = true;
    this.githubService.createPullRequest(repoOwner, repoName, title, body, this.currentBranch, this.selectedRepo.default_branch || 'main')
      .subscribe(() => {
        this.submitting = false;
        this.toastr.success('Changes submitted successfully!');

        // Ask to return to main
        const returnRef = this.modalService.show(ConfirmationDialogComponent, {
          initialState: {
            title: 'Submission Complete',
            message: 'Your changes have been submitted. Would you like to return to the main view?',
            btnYesText: 'Yes, Return to Main',
            btnNoText: 'Stay Here'
          }
        });
        const returnContent: any = returnRef.content;
        if (returnContent && returnContent.onClose) {
          returnContent.onClose.pipe(first()).subscribe((res: boolean) => {
            if (res) this.switchToMain();
          });
        }
      }, err => {
        this.submitting = false;
        this.toastr.error('Failed to submit changes (Pull Request creation failed).');
      });
  }

  createPr(): void {
      if (!this.selectedRepo || this.currentBranch === this.selectedRepo.default_branch) return;
      const repoOwner = this.selectedRepo.owner.login;
      const modalRef = this.modalService.show(PrDialogComponent);
      if (modalRef.content) {
          (modalRef.content as any).onClose.pipe(first()).subscribe((res: any) => {
              if (res) {
                  this.githubService.createPullRequest(repoOwner, this.selectedRepo.name, res.title, res.body, this.currentBranch, this.selectedRepo.default_branch)
                    .subscribe(() => {
                        this.toastr.success('Pull Request Created');

                        // Offer to create a new branch immediately
                        const confirmRef = this.modalService.show(ConfirmationDialogComponent, {
                            initialState: {
                                title: 'New Branch?',
                                message: 'Pull Request created successfully. Would you like to create a new branch for your next task?',
                                btnYesText: 'Yes, Create Branch',
                                btnNoText: 'No, Stay Here'
                            }
                        });
                        const confirmContent: any = confirmRef.content;
                        if (confirmContent && confirmContent.onClose) {
                            confirmContent.onClose.pipe(first()).subscribe((result: boolean) => {
                                if (result) {
                                    this.startEditMode();
                                }
                            });
                        }
                    }, err => this.toastr.error('Failed to create PR'));
              }
          });
      }
  }

  switchToMain(): void {
    if (this.selectedRepo) {
      const defaultBranch = this.selectedRepo.default_branch || 'main';
      if (this.currentBranch !== defaultBranch) {
        this.switchBranch(defaultBranch);
      }
    }
  }

  saveToGithub(): void {
    if (!this.selectedRepo || !this.selectedFilePath) { return; }

    // GUARD: If on main, forbid
    if (this.currentBranch === this.selectedRepo.default_branch) {
        this.toastr.warning('You cannot save directly to the main branch. Please start edit mode.');
        this.startEditMode();
        return;
    }

    this.saving = true;
    const owner = this.selectedRepo.owner.login;
    const repo = this.selectedRepo.name;
    const path = this.selectedFilePath;
    const localData = this.repoService.getCurrentData();

    // Direct Save Flow (Fetch -> Compare -> Commit)
    this.executeSave(owner, repo, path, localData);
  }

  executeSave(owner: string, repo: string, path: string, localData: any) {
    const branchName = this.currentBranch;

    // Get file content from CURRENT branch
    this.githubService.getFileContent(owner, repo, path, branchName).pipe(
        catchError(() => of(null))
    ).subscribe(file => {
        const sha = file && file.sha ? file.sha : undefined;

        // Open Commit Message Dialog
        const modalRef = this.modalService.show(CommitMessageDialogComponent);
        const content: any = modalRef.content;
        if (content && content.onClose) {
             content.onClose.pipe(first()).subscribe((commitMessage: string | null) => {
                  if (!commitMessage) { this.saving = false; return; }

                  const fileContent = JSON.stringify(localData, null, 2);

                  this.githubService.createOrUpdateFile(owner, repo, path, fileContent, sha, commitMessage, branchName)
                    .pipe(first())
                    .subscribe(() => {
                        this.toastr.success(`Saved to ${branchName}`);
                        this.saving = false;
                    }, err => {
                        this.toastr.error('Failed to save to GitHub');
                        this.saving = false;
                    });
             });
        } else {
            this.saving = false;
        }
    }, err => {
        this.toastr.error('Failed to prepare save');
        this.saving = false;
    });
  }

  download(): void {
    this.repoService.downloadAsJson().pipe(first()).subscribe(blob => {
      this.fileSaverService.save(blob, 'landscapr.json');
    });
  }

  uploadDocument(files: any): void {
    const file = files[0];
    this.repoService.uploadJson(file).pipe(first()).subscribe(() => {
      this.toastr.success('Upload completed');
    }, _ => this.toastr.error('Upload failed'));
  }
}
