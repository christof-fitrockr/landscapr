import {Component, OnInit} from '@angular/core';
import {AuthenticationService} from './services/authentication.service';
import {RepoService} from './services/repo.service';
import {FileSaverService} from 'ngx-filesaver';
import {first} from 'rxjs/operators';
import {EMPTY, Observable} from 'rxjs';
import {Upload} from './helpers/upload';
import { BsModalService } from 'ngx-bootstrap/modal';
import { GithubActionsDialogComponent } from './components/github-actions-dialog.component';
import { SyncStatusService, SyncStatus } from './services/sync-status.service';
import { version } from '../environments/version';
import { FileSystemService } from './services/file-system.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  dataAvailable: boolean;
  version = version.date;

  upload$: Observable<Upload> = EMPTY;
  status$: Observable<SyncStatus> = EMPTY;

  constructor(private authenticationService: AuthenticationService,
              private repoService: RepoService, private fileSaverService: FileSaverService,
              private modalService: BsModalService,
              public syncStatusService: SyncStatusService,
              public fileSystemService: FileSystemService,
              private router: Router) { }

  ngOnInit() {
    this.dataAvailable = this.repoService.dataAvailable();
    this.status$ = this.syncStatusService.status$;
    this.repoService.dataChanges.subscribe(() => {
      this.dataAvailable = this.repoService.dataAvailable();
      const currentUrl = this.router.url;
      if (currentUrl.startsWith('/repositories')) {
        return;
      }
      this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
        this.router.navigate([currentUrl]);
      });
    });
  }

  download() {
    this.repoService.downloadAsJson().pipe(first()).subscribe(blob => {
      this.fileSaverService.save(blob, 'landscapr.json');
    });
  }


  uploadDocument(files: any) {
    const file = files[0];
    this.repoService.uploadJson(file).pipe(first()).subscribe(() => {
      location.reload();
    });
  }

  logout() {
    this.authenticationService.logout().pipe(first()).subscribe(() => {
      location.reload();

    });
  }

  openGithubActionsDialog() {
    this.modalService.show(GithubActionsDialogComponent, { class: 'modal-sm' });
  }
}
