import {Component, OnInit} from '@angular/core';
import {ProcessService} from '../services/process.service';
import {Process} from '../models/process';
import {first, switchMap, catchError} from 'rxjs/operators';
import {Subscription, of} from 'rxjs';
import {ActivatedRoute} from '@angular/router';
import { BsModalService, BsModalRef } from 'ngx-bootstrap/modal';
import { GithubDialogComponent } from '../components/github-dialog.component';
import { SaveGithubDialogComponent } from '../components/save-github-dialog.component';
import { GithubService } from '../services/github.service';
import { ToastrService } from 'ngx-toastr';
import { RepoService } from '../services/repo.service';
import { GithubActionsDialogComponent } from '../components/github-actions-dialog.component';
import { JourneyService } from '../services/journey.service';
import { Journey } from '../models/journey.model';

@Component({selector: 'app-dashboard', templateUrl: './dashboard.component.html', styleUrls: ['./dashboard.component.scss']})
export class DashboardComponent implements OnInit {
  private subscription: Subscription;
  public repoId: string;
  private modalRef?: BsModalRef;
  constructor(
    private processService: ProcessService,
    private route: ActivatedRoute,
    private modalService: BsModalService,
    private githubService: GithubService,
    private toastr: ToastrService,
    private repoService: RepoService,
    private journeyService: JourneyService
  ) {
  }

  processes: Process[];
  journeys: Journey[];
  commits: any[];
  selectedRepoName: string;

  ngOnInit() {

    this.subscription = this.route.parent.paramMap.subscribe(obs => {
      this.repoId = obs.get('repoId');
      this.refresh()
    });

    this.selectedRepoName = localStorage.getItem('repositories.selectedRepo');
    if (this.selectedRepoName) {
      this.githubService.getUser().pipe(
        switchMap(user => {
          if (user && user.login) {
            return this.githubService.getCommits(user.login, this.selectedRepoName);
          }
          return of([]);
        }),
        catchError(err => {
          console.error(err);
          return of([]);
        })
      ).subscribe(commits => {
        this.commits = commits;
      });
    }
  }

  refresh() {
    this.processService.allFavorites(this.repoId).pipe(first()).subscribe(items => {
      this.processes = items;
    });
    this.journeyService.all().pipe(first()).subscribe(js => {
      this.journeys = js || [];
    });
  }

  openGitHubDialog(): void {
    this.modalRef = this.modalService.show(GithubDialogComponent, { class: 'modal-lg' });
    const content: any = this.modalRef.content;
    if (content && content.onClose) {
      content.onClose.subscribe((result: any) => {
        if (result) {
          this.githubService.getFileContent(result.owner.login, result.repo.name, result.path).subscribe(fileContent => {
            try {
              const content = atob(fileContent.content);
              this.repoService.uploadJsonContent(content).pipe(first()).subscribe(() => {
                this.refresh();
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

  openSaveGitHubDialog(): void {
    this.modalRef = this.modalService.show(SaveGithubDialogComponent, { class: 'modal-lg', initialState: { processes: this.processes } });
    const content: any = this.modalRef.content;
    if (content && content.onClose) {
      content.onClose.subscribe((result: any) => {
        if (result) {
          this.githubService.getFileContent(result.owner, result.repo.name, result.fileName).subscribe(
            (file) => {
              const sha = file && file.sha ? file.sha : undefined;
              this.repoService.downloadAsJson().pipe(first()).subscribe(blob => {
                (blob as Blob).text().then(content => {
                  this.githubService.createOrUpdateFile(result.owner, result.repo.name, result.fileName, content, sha).subscribe(() => {
                    this.toastr.success('File saved successfully');
                  }, (err) => {
                    this.toastr.error('Failed to save file to GitHub');
                  });
                }).catch(() => {
                  this.toastr.error('Failed to prepare JSON content for GitHub');
                });
              });
            },
            () => {
              this.repoService.downloadAsJson().pipe(first()).subscribe(blob => {
                (blob as Blob).text().then(content => {
                  this.githubService.createOrUpdateFile(result.owner, result.repo.name, result.fileName, content).subscribe(() => {
                    this.toastr.success('File saved successfully');
                  }, (err) => {
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

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  openGithubActionsDialog(): void {
    this.modalService.show(GithubActionsDialogComponent, { class: 'modal-sm' });
  }
}
