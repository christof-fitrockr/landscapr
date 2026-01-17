import { Component, OnInit } from '@angular/core';
import { GithubService } from '../services/github.service';
import { RepoService } from '../services/repo.service';
import { ToastrService } from 'ngx-toastr';
import { Observable, EMPTY, of, throwError } from 'rxjs';
import { first, switchMap, catchError } from 'rxjs/operators';
import { FileSaverService } from 'ngx-filesaver';
import { BsModalService } from 'ngx-bootstrap/modal';
import { MergeService } from '../services/merge.service';
import { AuthenticationService } from '../services/authentication.service';
import { MergeResolverComponent } from '../components/merge-resolver.component';
import { CommitOptionsDialogComponent } from '../components/commit-options-dialog.component';
import { PrDialogComponent } from '../components/pr-dialog.component';
import { ConfirmationDialogComponent } from '../components/confirmation-dialog.component';

@Component({
  selector: 'app-repositories',
  templateUrl: './repositories.component.html',
  styleUrls: ['./repositories.component.scss']
})
export class RepositoriesComponent implements OnInit {

  private static readonly STORAGE_SELECTED_REPO = 'repositories.selectedRepo';
  private static readonly STORAGE_SELECTED_FILE = 'repositories.selectedFilePath';
  private static readonly STORAGE_PREFIX_BRANCH = 'repositories.currentBranch.';

  pat: string = '';
  connectedUser: string = ''; // Authenticated user

  repos$: Observable<any[]> = EMPTY;
  files$: Observable<any[]> = EMPTY;
  pullRequests$: Observable<any[]> = EMPTY;
  branches: any[] = [];

  selectedRepo: any = null;
  selectedFilePath: string | null = null;
  currentBranch: string = 'main';
  isRepoCollapsed: boolean = false;

  connecting = false;
  loadingFiles = false;
  saving = false;

  constructor(
    private githubService: GithubService,
    private repoService: RepoService,
    private fileSaverService: FileSaverService,
    private toastr: ToastrService,
    private modalService: BsModalService,
    private mergeService: MergeService,
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
    this.selectedFilePath = null;
    this.branches = [];
    this.isRepoCollapsed = false;

    // Load persisted branch or default
    const savedBranch = localStorage.getItem(RepositoriesComponent.STORAGE_PREFIX_BRANCH + repo.name);
    this.currentBranch = savedBranch || repo.default_branch || 'main';

    this.loadingFiles = true;
    this.files$ = this.githubService.getRepoContents(repo.owner.login, repo.name, '');
    this.pullRequests$ = this.githubService.getPullRequests(repo.owner.login, repo.name);

    this.githubService.getBranches(repo.owner.login, repo.name).subscribe(branches => {
      this.branches = branches;
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

  createNewBranch(): void {
      if (!this.selectedRepo) return;
      const repoOwner = this.selectedRepo.owner.login;

      const modalRef = this.modalService.show(CommitOptionsDialogComponent, {
          class: 'modal-lg',
          initialState: {
              branches: this.branches,
              currentBranch: this.currentBranch,
              fileName: this.selectedFilePath || 'repository',
              isNewBranch: true // Force new branch mode initially
          }
      });
      // We reuse CommitOptionsDialog but we treat it as "Create Branch" dialog
      const content: any = modalRef.content;
      if (content && content.onClose) {
          content.onClose.pipe(first()).subscribe((config: any) => {
              if (config && config.branchMode === 'new') {
                  // Create the branch immediately
                  const { branchName, baseBranch } = config;
                  this.githubService.getRef(repoOwner, this.selectedRepo.name, `heads/${baseBranch}`).pipe(
                      switchMap((ref: any) => {
                          const sha = ref.object.sha;
                          return this.githubService.createBranch(repoOwner, this.selectedRepo.name, branchName, sha);
                      })
                  ).subscribe(() => {
                      this.toastr.success(`Branch ${branchName} created`);
                      // Update branch list and switch
                      this.branches.push({ name: branchName });
                      this.switchBranch(branchName);
                  }, err => this.toastr.error('Failed to create branch'));
              }
          });
      }
  }

  loadFromGithub(): void {
    if (!this.selectedRepo || !this.selectedFilePath) { return; }
    const repoOwner = this.selectedRepo.owner.login;
    // Fetch from CURRENT branch
    this.githubService.getFileContent(repoOwner, this.selectedRepo.name, this.selectedFilePath, this.currentBranch)
      .pipe(first())
      .subscribe(fileContent => {
        try {
          const contentStr = atob(fileContent.content);
          const repoData = JSON.parse(contentStr);
          const localData = this.repoService.getCurrentData();
          if (this.mergeService.different(repoData, localData)) {
            const modalRef = this.modalService.show(MergeResolverComponent, {
              class: 'modal-xl',
              initialState: { repoData, localData }
            });
            const content: any = modalRef.content;
            if (content && content.onClose) {
              content.onClose.pipe(first()).subscribe((merged: any) => {
                if (merged) {
                  this.repoService.applyData(merged);
                  this.toastr.success('Merged data applied to local storage');
                }
              });
            }
          } else {
            this.repoService.uploadJsonContent(contentStr).pipe(first()).subscribe(() => {
              this.toastr.success(`Loaded content from ${this.currentBranch}`);
            });
          }
        } catch (e) {
          this.toastr.error('Failed to parse GitHub file content');
        }
      }, _ => this.toastr.error('Failed to load file from GitHub (does it exist on this branch?)'));
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
                                    this.createNewBranch();
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
        this.toastr.warning('You cannot save directly to the main branch. Please create a new branch.');
        this.createNewBranch();
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
        let remoteData: any = {};
        try {
            if (file && file.content) {
                remoteData = JSON.parse(atob(file.content));
            }
        } catch { remoteData = {}; }

        // Open Merge Resolver (It handles Simple Mode if no conflicts)
        const modalRef = this.modalService.show(MergeResolverComponent, {
            class: 'modal-xl',
            initialState: { repoData: remoteData, localData, requireCommitMessage: true }
        });
        const content: any = modalRef.content;
        if (content && content.onClose) {
             content.onClose.pipe(first()).subscribe((result: any) => {
                  if (!result) { this.saving = false; return; }
                  const merged = result.data ? result.data : result;
                  const commitMessage: string | undefined = result.commitMessage;
                  const mergedText = JSON.stringify(merged, null, 2);

                  this.githubService.createOrUpdateFile(owner, repo, path, mergedText, sha, commitMessage, branchName)
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
