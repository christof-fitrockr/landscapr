import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { first, map, switchMap } from 'rxjs/operators';
import { GithubService } from './github.service';
import { RepoService } from './repo.service';
import { MergeService } from './merge.service';
import { BsModalService } from 'ngx-bootstrap/modal';
import { MergeResolverComponent } from '../components/merge-resolver.component';
import { ToastrService } from 'ngx-toastr';

export type SyncState = 'UNKNOWN' | 'IN_SYNC' | 'LOCAL_NEWER' | 'REMOTE_NEWER' | 'DIVERGED';

export interface SyncStatus {
  state: SyncState;
  repoName?: string;
  filePath?: string;
  owner?: string;
  lastChecked: number;
  lastError?: string;
}

@Injectable({ providedIn: 'root' })
export class SyncStatusService {
  private static readonly STORAGE_SELECTED_REPO = 'repositories.selectedRepo';
  private static readonly STORAGE_SELECTED_REPO_OWNER = 'repositories.selectedRepoOwner';
  private static readonly STORAGE_SELECTED_FILE = 'repositories.selectedFilePath';
  private static readonly STORAGE_LAST_SYNC_SHA = 'repositories.lastSyncedSha';
  private static readonly STORAGE_LAST_SYNC_LOCAL_HASH = 'repositories.lastSyncedLocalHash';
  private static readonly STORAGE_PREFIX_BRANCH = 'repositories.currentBranch.';

  private statusSubject = new BehaviorSubject<SyncStatus>({ state: 'UNKNOWN', lastChecked: Date.now() });
  readonly status$: Observable<SyncStatus> = this.statusSubject.asObservable();

  private refreshTimer: any;

  constructor(
    private githubService: GithubService,
    private repoService: RepoService,
    private mergeService: MergeService,
    private modalService: BsModalService,
    private toastr: ToastrService,
  ) {
    // auto refresh every 60s
    this.refresh();
    this.refreshTimer = setInterval(() => this.refresh(), 60000);
  }

  refresh(): void {
    const repoName = localStorage.getItem(SyncStatusService.STORAGE_SELECTED_REPO) || undefined;
    const filePath = localStorage.getItem(SyncStatusService.STORAGE_SELECTED_FILE) || undefined;

    if (!repoName || !filePath) {
      this.statusSubject.next({ state: 'UNKNOWN', lastChecked: Date.now() });
      return;
    }

    this.repoService.getCurrentData().pipe(first()).subscribe(localData => {
        const localHash = this.hash(JSON.stringify(localData));

        const lastSha = localStorage.getItem(SyncStatusService.STORAGE_LAST_SYNC_SHA) || undefined;
        const lastLocalHash = localStorage.getItem(SyncStatusService.STORAGE_LAST_SYNC_LOCAL_HASH) || undefined;

        const token = this.githubService.getPersonalAccessToken();
        if (!token) {
          // Cannot determine without GitHub access
          this.statusSubject.next({ state: 'UNKNOWN', repoName, filePath, lastChecked: Date.now() });
          return;
        }

        const storedOwner = localStorage.getItem(SyncStatusService.STORAGE_SELECTED_REPO_OWNER);
        const getOwner$ = storedOwner ? of(storedOwner) : this.githubService.getUser().pipe(map(u => u.login));

        getOwner$.pipe(first()).subscribe(owner => {
          this.githubService.getFileContent(owner, repoName, filePath).pipe(first()).subscribe(file => {
            const remoteSha: string | undefined = file && file.sha ? file.sha : undefined;
            let remoteData: any = {};
            try {
              remoteData = JSON.parse(atob(file.content));
            } catch { remoteData = {}; }
            // remoteHash is unused in original? Ah, it is used implicitly? No, wait.
            // Original: const remoteHash = this.hash(JSON.stringify(remoteData));
            // But it only used remoteSha vs lastSha.
            // Ah, wait. "lastLocalHash" logic uses localHash.
            // "lastSha" logic uses remoteSha.
            // remoteData is used for mergeService.different fallback.

            let state: SyncState = 'IN_SYNC';
            if (lastSha !== undefined && lastSha !== '' && lastLocalHash !== undefined && lastLocalHash !== '') {
              const shaChanged = remoteSha !== lastSha;
              const localChanged = localHash !== lastLocalHash;
              if (!shaChanged && !localChanged) state = 'IN_SYNC';
              else if (!shaChanged && localChanged) state = 'LOCAL_NEWER';
              else if (shaChanged && !localChanged) state = 'REMOTE_NEWER';
              else state = 'DIVERGED';
            } else {
              // Fallback: direct compare remote vs local
              const different = this.mergeService.different(remoteData, localData);
              state = different ? 'DIVERGED' : 'IN_SYNC';
            }

            this.statusSubject.next({ state, repoName, filePath, owner, lastChecked: Date.now() });
          }, _ => {
            this.statusSubject.next({ state: 'UNKNOWN', repoName, filePath, lastChecked: Date.now(), lastError: 'Failed to fetch remote file' });
          });
        }, _ => {
          this.statusSubject.next({ state: 'UNKNOWN', repoName, filePath, lastChecked: Date.now(), lastError: 'Failed to determine owner' });
        });
    });
  }

  // Perform a pull (load from GitHub) with merge handling like repositories page
  pull(): void {
    const status = this.statusSubject.getValue();
    const { owner, repoName, filePath } = status;
    if (!owner || !repoName || !filePath) { return; }

    this.githubService.getFileContent(owner, repoName, filePath).pipe(first()).subscribe(fileContent => {
      try {
        const contentStr = atob(fileContent.content);
        const repoData = JSON.parse(contentStr);

        this.repoService.getCurrentData().pipe(first()).subscribe(localData => {
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
                    this.updateSyncSnapshot(fileContent.sha!, this.hash(JSON.stringify(merged)));
                    this.refresh();
                  }
                });
              }
            } else {
              // identical -> just apply
              this.repoService.uploadJsonContent(contentStr).pipe(first()).subscribe(() => {
                this.toastr.success('Repository content updated from GitHub file');
                this.updateSyncSnapshot(fileContent.sha!, this.hash(contentStr));
                this.refresh();
              });
            }
        });
      } catch (e) {
        this.toastr.error('Failed to parse GitHub file content');
      }
    }, _ => this.toastr.error('Failed to load file from GitHub'));
  }

  // Perform a push (save to GitHub) with merge handling like repositories page
  push(): void {
    const status = this.statusSubject.getValue();
    const { owner, repoName, filePath } = status;
    if (!owner || !repoName || !filePath) { return; }

    // 1. Get current branch from LS
    const branchKey = SyncStatusService.STORAGE_PREFIX_BRANCH + repoName;
    let currentBranch = localStorage.getItem(branchKey);

    // 2. Fetch repo details to get default branch
    this.githubService.getRepo(owner, repoName).pipe(first()).subscribe(repo => {
      const defaultBranch = repo.default_branch || 'main';

      // If no current branch is stored, assume default (but we'll check logic below)
      // Actually if it's null, we treat it as defaultBranch for comparison purposes
      const effectiveCurrentBranch = currentBranch || defaultBranch;

      if (effectiveCurrentBranch === defaultBranch) {
        // 3. We are on default branch -> Create new branch
        this.githubService.getUser().pipe(first()).subscribe(user => {
          const newBranchName = this.generateBranchName(user.login);

          this.toastr.info('Saving to main branch is restricted. Creating new branch: ' + newBranchName);

          // Get SHA of default branch head
          this.githubService.getRef(owner, repoName, `heads/${defaultBranch}`).pipe(
            switchMap((ref: any) => {
              const sha = ref.object.sha;
              return this.githubService.createBranch(owner, repoName, newBranchName, sha);
            })
          ).subscribe(() => {
            // Update local storage to point to new branch
            localStorage.setItem(branchKey, newBranchName);
            this.toastr.success(`Switched to branch ${newBranchName}`);

            // Proceed with save on NEW branch
            this.repoService.getCurrentData().pipe(first()).subscribe(localData => {
              this.executePush(owner, repoName, filePath, newBranchName, localData);
            });

          }, err => {
            this.toastr.error('Failed to create new branch. Save aborted.');
          });
        }, _ => this.toastr.error('Failed to get user info for branch creation'));

      } else {
        // 4. We are on a feature branch -> Save directly
        this.repoService.getCurrentData().pipe(first()).subscribe(localData => {
           this.executePush(owner, repoName, filePath, effectiveCurrentBranch, localData);
        });
      }
    }, err => {
      this.toastr.error('Failed to fetch repository details');
    });
  }

  private executePush(owner: string, repoName: string, filePath: string, branchName: string, localData: any) {
    this.githubService.getFileContent(owner, repoName, filePath, branchName).pipe(first()).subscribe(file => {
      const sha = file && file.sha ? file.sha : undefined;
      let remoteData: any = {};
      try { remoteData = JSON.parse(atob(file.content)); } catch { remoteData = {}; }

      // Always show merge resolver to require commit message
      const modalRef = this.modalService.show(MergeResolverComponent, {
        class: 'modal-xl',
        initialState: { repoData: remoteData, localData, requireCommitMessage: true }
      });
      const content: any = modalRef.content;
      if (content && content.onClose) {
        content.onClose.pipe(first()).subscribe((result: any) => {
          if (!result) { return; }
          const merged = result.data ? result.data : result; // backward compatibility
          const commitMessage: string | undefined = result.commitMessage;
          const mergedText = JSON.stringify(merged, null, 2);

          this.githubService.createOrUpdateFile(owner, repoName, filePath, mergedText, sha, commitMessage, branchName).pipe(first()).subscribe(() => {
            this.toastr.success(`File saved successfully to ${branchName}`);
            this.updateSyncSnapshot((file && file.sha) || sha || '', this.hash(mergedText));
            this.refresh();
          }, _ => this.toastr.error('Failed to save file to GitHub'));
        });
      }
    }, _ => {
      // File does not exist -> still open resolver to enforce commit message
      const remoteData: any = {};
      const modalRef = this.modalService.show(MergeResolverComponent, {
        class: 'modal-xl',
        initialState: { repoData: remoteData, localData, requireCommitMessage: true }
      });
      const content: any = modalRef.content;
      if (content && content.onClose) {
        content.onClose.pipe(first()).subscribe((result: any) => {
          if (!result) { return; }
          const merged = result.data ? result.data : result;
          const commitMessage: string | undefined = result.commitMessage;
          const mergedText = JSON.stringify(merged, null, 2);

          this.githubService.createOrUpdateFile(owner, repoName, filePath, mergedText, undefined, commitMessage, branchName).pipe(first()).subscribe(() => {
            this.toastr.success(`File created successfully on ${branchName}`);
            this.updateSyncSnapshot('new', this.hash(mergedText));
            this.refresh();
          }, _ => this.toastr.error('Failed to create file on GitHub'));
        });
      }
    });
  }

  private generateBranchName(username: string): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    const timeStr = `${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
    return `${username}-${dateStr}-${timeStr}`;
  }

  private updateSyncSnapshot(sha: string, localHash: string): void {
    localStorage.setItem(SyncStatusService.STORAGE_LAST_SYNC_SHA, sha || '');
    localStorage.setItem(SyncStatusService.STORAGE_LAST_SYNC_LOCAL_HASH, localHash || '');
  }

  private hash(text: string): string {
    // simple djb2 hash as string
    let h = 5381;
    for (let i = 0; i < text.length; i++) {
      h = ((h << 5) + h) + text.charCodeAt(i);
      h = h & 0xffffffff;
    }
    return (h >>> 0).toString(16);
  }
}
