import {Component, OnInit} from '@angular/core';
import {AuthenticationService} from './services/authentication.service';
import {RepoService} from './services/repo.service';
import {FileSaverService} from 'ngx-filesaver';
import {first} from 'rxjs/operators';
import {EMPTY, Observable} from 'rxjs';
import {Upload} from './helpers/upload';
import {ThemeService} from './services/theme.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  dataAvailable: boolean;

  upload$: Observable<Upload> = EMPTY;

  constructor(private authenticationService: AuthenticationService,
              private repoService: RepoService, private fileSaverService: FileSaverService, public themeService: ThemeService) { }

  ngOnInit() {
    this.dataAvailable = this.repoService.dataAvailable();
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
}
