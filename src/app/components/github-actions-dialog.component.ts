import { Component } from '@angular/core';
import { BsModalRef, BsModalService } from 'ngx-bootstrap/modal';
import { GithubDialogComponent } from './github-dialog.component';
import { SaveGithubDialogComponent } from './save-github-dialog.component';
import { GithubService } from '../services/github.service';
import { RepoService } from '../services/repo.service';
import { ToastrService } from 'ngx-toastr';
import { first, switchMap, catchError } from 'rxjs/operators';
import { of, throwError } from 'rxjs';

@Component({
  selector: 'app-github-actions-dialog',
  templateUrl: './github-actions-dialog.component.html',
  styleUrls: ['./github-actions-dialog.component.scss']
})
export class GithubActionsDialogComponent {

  constructor(
    public bsModalRef: BsModalRef,
    private modalService: BsModalService,
    private githubService: GithubService,
    private repoService: RepoService,
    private toastr: ToastrService,
  ) {}

  openLoad(): void {
    // Close this chooser modal and open the Load dialog
    this.bsModalRef.hide();
    const modalRef = this.modalService.show(GithubDialogComponent, { class: 'modal-lg' });
    const content: any = modalRef.content;
    if (content && content.onClose) {
      content.onClose.subscribe((result: any) => {
        if (result) {
          this.githubService.getFileContent(result.owner.login, result.repo.name, result.path).subscribe(fileContent => {
            try {
              const contentStr = atob(fileContent.content);
              this.repoService.uploadJsonContent(contentStr).pipe(first()).subscribe(() => {
                this.toastr.success('Repository content updated from GitHub file');
              });
            } catch (e) {
              this.toastr.error('Failed to parse GitHub file content');
            }
          }, () => {
            this.toastr.error('Failed to load file from GitHub');
          });
        }
      });
    }
  }

  openSave(): void {
    this.bsModalRef.hide();
    const modalRef = this.modalService.show(SaveGithubDialogComponent, { class: 'modal-lg' });
    const content: any = modalRef.content;

    if (content && content.onClose) {
      content.onClose.subscribe((result: any) => {
        if (result) {
          this.executeSaveFlow(result);
        }
      });
    }
  }

  private executeSaveFlow(config: any): void {
    const { repo, fileName, owner, branchMode, branchName, baseBranch, createPr, prTitle } = config;

    // Step 1: Handle Branching (if new)
    let branchSetup$ = of(null);
    if (branchMode === 'new') {
        // Need to get SHA of base branch, then create new branch
        branchSetup$ = this.githubService.getRef(owner, repo.name, `heads/${baseBranch}`).pipe(
            switchMap((ref: any) => {
                const sha = ref.object.sha;
                return this.githubService.createBranch(owner, repo.name, branchName, sha);
            }),
            catchError(err => {
                this.toastr.error(`Failed to create branch ${branchName}`);
                return throwError(err);
            })
        );
    }

    branchSetup$.pipe(
        // Step 2: Prepare Content (Download JSON)
        switchMap(() => this.repoService.downloadAsJson().pipe(first())),
        switchMap((blob: Blob) => blob.text()),
        switchMap((contentText: string) => {
            // Step 3: Check if file exists on Target Branch (to get SHA for update)
            return this.githubService.getFileContent(owner, repo.name, fileName, branchName).pipe(
                catchError(() => of(null)), // If 404, returns null (file doesn't exist)
                switchMap((file: any) => {
                    const sha = file && file.sha ? file.sha : undefined;
                    // Step 4: Create or Update File
                    return this.githubService.createOrUpdateFile(owner, repo.name, fileName, contentText, sha, undefined, branchName);
                })
            );
        }),
        switchMap(() => {
             // Step 5: Create PR if requested
             if (createPr && branchMode === 'new') {
                 return this.githubService.createPullRequest(owner, repo.name, prTitle || `Update ${fileName}`, 'Automated update from Landscapr', branchName, baseBranch);
             }
             return of(null);
        })
    ).subscribe(
        (res) => {
            if (createPr && branchMode === 'new') {
                this.toastr.success(`Saved to branch ${branchName} and created PR.`);
            } else {
                this.toastr.success(`File saved successfully to ${branchName}`);
            }
        },
        (err) => {
            console.error(err);
            this.toastr.error('Failed to save to GitHub');
        }
    );
  }

  close(): void {
    this.bsModalRef.hide();
  }
}
