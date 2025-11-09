import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { first } from 'rxjs/operators';
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
  private static readonly STORAGE_SELECTED_FILE = 'repositories.selectedFilePath';
  private static readonly STORAGE_LAST_SYNC_SHA = 'repositories.lastSyncedSha';
  private static readonly STORAGE_LAST_SYNC_LOCAL_HASH = 'repositories.lastSyncedLocalHash';

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

    const localData = this.repoService.getCurrentData();
    const localHash = this.hash(JSON.stringify(localData));

    const lastSha = localStorage.getItem(SyncStatusService.STORAGE_LAST_SYNC_SHA) || undefined;
    const lastLocalHash = localStorage.getItem(SyncStatusService.STORAGE_LAST_SYNC_LOCAL_HASH) || undefined;

    const token = this.githubService.getPersonalAccessToken();
    if (!token) {
      // Cannot determine without GitHub access
      this.statusSubject.next({ state: 'UNKNOWN', repoName, filePath, lastChecked: Date.now() });
      return;
    }

    // Get owner from API
    this.githubService.getUser().pipe(first()).subscribe(user => {
      const owner = user.login;
      this.githubService.getFileContent(owner, repoName, filePath).pipe(first()).subscribe(file => {
        const remoteSha: string | undefined = file && file.sha ? file.sha : undefined;
        let remoteData: any = {};
        try {
          remoteData = JSON.parse(atob(file.content));
        } catch { remoteData = {}; }
        const remoteHash = this.hash(JSON.stringify(remoteData));

        let state: SyncState = 'IN_SYNC';
        if (lastSha && lastLocalHash) {
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
      this.statusSubject.next({ state: 'UNKNOWN', repoName, filePath, lastChecked: Date.now(), lastError: 'Failed to fetch user' });
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

    const localData = this.repoService.getCurrentData();

    this.githubService.getFileContent(owner, repoName, filePath).pipe(first()).subscribe(file => {
      const sha = file && file.sha ? file.sha : undefined;
      let remoteData: any = {};
      try { remoteData = JSON.parse(atob(file.content)); } catch { remoteData = {}; }

      if (this.mergeService.different(remoteData, localData)) {
        const modalRef = this.modalService.show(MergeResolverComponent, {
          class: 'modal-xl',
          initialState: { repoData: remoteData, localData }
        });
        const content: any = modalRef.content;
        if (content && content.onClose) {
          content.onClose.pipe(first()).subscribe((merged: any) => {
            if (merged) {
              const mergedText = JSON.stringify(merged, null, 2);
              this.githubService.createOrUpdateFile(owner, repoName, filePath, mergedText, sha).pipe(first()).subscribe(() => {
                this.toastr.success('File saved successfully');
                this.updateSyncSnapshot((file && file.sha) || sha || '', this.hash(mergedText));
                this.refresh();
              }, _ => this.toastr.error('Failed to save file to GitHub'));
            }
          });
        }
      } else {
        // No difference, push local as is
        const contentText = JSON.stringify(localData, null, 2);
        this.githubService.createOrUpdateFile(owner, repoName, filePath, contentText, sha).pipe(first()).subscribe(() => {
          this.toastr.success('File saved successfully');
          this.updateSyncSnapshot((file && file.sha) || sha || '', this.hash(contentText));
          this.refresh();
        }, _ => this.toastr.error('Failed to save file to GitHub'));
      }
    }, _ => {
      // File does not exist -> create new
      const contentText = JSON.stringify(localData, null, 2);
      this.githubService.createOrUpdateFile(owner, repoName, filePath, contentText).pipe(first()).subscribe(() => {
        this.toastr.success('File created successfully');
        this.updateSyncSnapshot('new', this.hash(contentText));
        this.refresh();
      }, _ => this.toastr.error('Failed to create file on GitHub'));
    });
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
