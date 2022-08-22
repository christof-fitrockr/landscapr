import {Component, OnInit} from '@angular/core';
import {AuthenticationService} from './services/authentication.service';
import {RepoService} from './services/repo.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  dataAvailable: boolean;

  constructor(private authenticationService: AuthenticationService,
              private repoService: RepoService) { }

  ngOnInit() {
    this.dataAvailable = this.repoService.dataAvailable();
  }

  download() {
    this.repoService.downloadAsJson()
  }

  upload() {

  }
}
