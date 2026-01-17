import { Component, OnInit } from '@angular/core';
import { GithubService } from '../services/github.service';
import { RepoService } from '../services/repo.service';
import { ToastrService } from 'ngx-toastr';
import { Observable, EMPTY, of, throwError } from 'rxjs';
import { first, switchMap, catchError } from 'rxjs/operators';
import { FileSaverService } from 'ngx-filesaver';
import { BsModalService } from 'ngx-bootstrap/modal';
import { MergeService } from '../services/merge.service';
import { MergeResolverComponent } from '../components/merge-resolver.component';
import { CommitOptionsDialogComponent } from '../components/commit-options-dialog.component';

@Component({
  selector: 'app-repositories',
  templateUrl: './repositories.component.html',
  styleUrls: ['./repositories.component.scss']
})
export class RepositoriesComponent implements OnInit {

  private static readonly STORAGE_SELECTED_REPO = 'repositories.selectedRepo';
  private static readonly STORAGE_SELECTED_FILE = 'repositories.selectedFilePath';

  pat: string = '';
  owner: string = '';

  repos$: Observable<any[]> = EMPTY;
  files$: Observable<any[]> = EMPTY;
  branches: any[] = [];

  selectedRepo: any = null;
  selectedFilePath: string | null = null;

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
      this.owner = user.login;
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
    // Reset file selection in memory; keep stored selection to try to restore if it belongs to this repo
    this.selectedFilePath = null;
    this.branches = [];

    this.loadingFiles = true;
    this.files$ = this.githubService.getRepoContents(repo.owner.login, repo.name, '');

    this.githubService.getBranches(repo.owner.login, repo.name).subscribe(branches => {
      this.branches = branches;
    });

    // When observable resolves, Angular will render. We just turn off spinner shortly after by subscribing once.
    this.files$.pipe(first()).subscribe(files => {
      this.loadingFiles = false;
      // Try to preselect previously selected file if it exists in this repo
      const savedFilePath = localStorage.getItem(RepositoriesComponent.STORAGE_SELECTED_FILE);
      if (savedFilePath) {
        const found = (files || []).find((f: any) => f?.path === savedFilePath);
        if (found) {
          this.selectFile(found);
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

  // Load from selected GitHub file into local app storage
  loadFromGithub(): void {
    if (!this.selectedRepo || !this.selectedFilePath) { return; }
    this.githubService.getFileContent(this.selectedRepo.owner.login, this.selectedRepo.name, this.selectedFilePath)
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
            // identical -> just apply
            this.repoService.uploadJsonContent(contentStr).pipe(first()).subscribe(() => {
              this.toastr.success('Repository content updated from GitHub file');
            });
          }
        } catch (e) {
          this.toastr.error('Failed to parse GitHub file content');
        }
      }, _ => this.toastr.error('Failed to load file from GitHub'));
  }

  // Save current local app JSON into the selected GitHub file (create or update)
  saveToGithub(): void {
    if (!this.selectedRepo || !this.selectedFilePath) { return; }
    this.saving = true;
    const owner = this.selectedRepo.owner.login;
    const repo = this.selectedRepo.name;
    const path = this.selectedFilePath;
    const localData = this.repoService.getCurrentData();

    // 1. Open Commit Options
    const modalRef = this.modalService.show(CommitOptionsDialogComponent, {
        class: 'modal-lg',
        initialState: {
            branches: this.branches,
            currentBranch: this.selectedRepo.default_branch,
            fileName: path
        }
    });

    const content: any = modalRef.content;
    if (content && content.onClose) {
        content.onClose.pipe(first()).subscribe((config: any) => {
            if (!config) { this.saving = false; return; }
            this.executeSave(config, owner, repo, path, localData);
        });
    } else {
        this.saving = false;
    }
  }

  executeSave(config: any, owner: string, repo: string, path: string, localData: any) {
    const { branchMode, branchName, baseBranch, createPr, prTitle } = config;

    let branchSetup$ = of(null);
    if (branchMode === 'new') {
         branchSetup$ = this.githubService.getRef(owner, repo, `heads/${baseBranch}`).pipe(
            switchMap((ref: any) => {
                const sha = ref.object.sha;
                return this.githubService.createBranch(owner, repo, branchName, sha);
            }),
            catchError(err => {
                this.toastr.error(`Failed to create branch ${branchName}`);
                return throwError(err);
            })
        );
    }

    branchSetup$.pipe(
        switchMap(() => {
            // Get file content from TARGET branch
            return this.githubService.getFileContent(owner, repo, path, branchName).pipe(
                catchError(() => of(null))
            );
        })
    ).subscribe(file => {
        const sha = file && file.sha ? file.sha : undefined;
        let remoteData: any = {};
        try {
            if (file && file.content) {
                remoteData = JSON.parse(atob(file.content));
            }
        } catch { remoteData = {}; }

        // Show Merge Resolver
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
                        if (createPr && branchMode === 'new') {
                             this.githubService.createPullRequest(owner, repo, prTitle, commitMessage || 'Automated update', branchName, baseBranch)
                                .subscribe(() => {
                                    this.toastr.success(`Saved to ${branchName} and created PR`);
                                    this.saving = false;
                                }, () => {
                                    this.toastr.success(`Saved to ${branchName} but PR creation failed`);
                                    this.saving = false;
                                });
                        } else {
                            this.toastr.success(`Saved to ${branchName}`);
                            this.saving = false;
                        }
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
