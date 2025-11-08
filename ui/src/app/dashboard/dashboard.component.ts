import {Component, OnInit} from '@angular/core';
import {ProcessService} from '../services/process.service';
import {Process} from '../models/process';
import {first} from 'rxjs/operators';
import {Subscription} from 'rxjs';
import {ActivatedRoute} from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { GithubDialogComponent } from '../components/github-dialog.component';
import { SaveGithubDialogComponent } from '../components/save-github-dialog.component';
import { GithubService } from '../services/github.service';
import { ToastrService } from 'ngx-toastr';
import { RepoService } from '../services/repo.service';

@Component({selector: 'app-dashboard', templateUrl: './dashboard.component.html'})
export class DashboardComponent implements OnInit {
  private subscription: Subscription;
  private repoId: string;
  constructor(
    private processService: ProcessService,
    private route: ActivatedRoute,
    public dialog: MatDialog,
    private githubService: GithubService,
    private toastr: ToastrService,
    private repoService: RepoService
  ) {
  }

  processes: Process[];

  ngOnInit() {

    this.subscription = this.route.parent.paramMap.subscribe(obs => {
      this.repoId = obs.get('repoId');
      this.refresh()
    });
  }

  private refresh() {
    this.processService.allFavorites(this.repoId).pipe(first()).subscribe(items => {
      this.processes = items;
    });
  }

  openGitHubDialog(): void {
    const dialogRef = this.dialog.open(GithubDialogComponent);

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.githubService.getFileContent(result.owner, result.repo.name, result.file.path).subscribe(fileContent => {
          const content = atob(fileContent.content);
          const blob = new Blob([content], { type: 'application/json' });
          const file = new File([blob], result.file.name);
          this.repoService.uploadJson(file).subscribe(() => {
            this.toastr.success('File loaded successfully');
            this.refresh();
          });
        });
      }
    });
  }

  openSaveGitHubDialog(): void {
    const dialogRef = this.dialog.open(SaveGithubDialogComponent, {
      data: { processes: this.processes }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.repoService.downloadAsJson().subscribe(blob => {
          const reader = new FileReader();
          reader.onload = () => {
            const content = reader.result as string;
            this.githubService.getRepoContents(result.owner, result.repo.name, result.fileName).subscribe(
              (fileArray) => {
                const existingFile = fileArray.find(file => file.name === result.fileName);
                this.githubService.createOrUpdateFile(result.owner, result.repo.name, result.fileName, content, existingFile?.sha).subscribe(() => {
                  this.toastr.success('File saved successfully');
                });
              },
              () => {
                this.githubService.createOrUpdateFile(result.owner, result.repo.name, result.fileName, content).subscribe(() => {
                  this.toastr.success('File saved successfully');
                });
              }
            );
          };
          reader.readAsText(blob);
        });
      }
    });
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
}
