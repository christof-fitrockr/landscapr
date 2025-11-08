import { Component } from '@angular/core';
import { BsModalRef, BsModalService } from 'ngx-bootstrap/modal';
import { GithubDialogComponent } from './github-dialog.component';
import { SaveGithubDialogComponent } from './save-github-dialog.component';
import { GithubService } from '../services/github.service';
import { RepoService } from '../services/repo.service';
import { ToastrService } from 'ngx-toastr';
import { first } from 'rxjs/operators';

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
    // Close this chooser modal and open the Save dialog
    this.bsModalRef.hide();
    const modalRef = this.modalService.show(SaveGithubDialogComponent, { class: 'modal-lg' });
    const content: any = modalRef.content;
    if (content && content.onClose) {
      content.onClose.subscribe((result: any) => {
        if (result) {
          this.githubService.getFileContent(result.owner, result.repo.name, result.fileName).subscribe(
            (file) => {
              const sha = file && file.sha ? file.sha : undefined;
              this.repoService.downloadAsJson().pipe(first()).subscribe(blob => {
                (blob as Blob).text().then(contentText => {
                  this.githubService.createOrUpdateFile(result.owner, result.repo.name, result.fileName, contentText, sha).subscribe(() => {
                    this.toastr.success('File saved successfully');
                  }, () => {
                    this.toastr.error('Failed to save file to GitHub');
                  });
                }).catch(() => {
                  this.toastr.error('Failed to prepare JSON content for GitHub');
                });
              });
            },
            () => {
              // File does not exist -> create new
              this.repoService.downloadAsJson().pipe(first()).subscribe(blob => {
                (blob as Blob).text().then(contentText => {
                  this.githubService.createOrUpdateFile(result.owner, result.repo.name, result.fileName, contentText).subscribe(() => {
                    this.toastr.success('File saved successfully');
                  }, () => {
                    this.toastr.error('Failed to save file to GitHub');
                  });
                }).catch(() => {
                  this.toastr.error('Failed to prepare JSON content for GitHub');
                });
              });
            }
          );
        }
      });
    }
  }

  close(): void {
    this.bsModalRef.hide();
  }
}
