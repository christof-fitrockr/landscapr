import {Component, OnInit} from '@angular/core';
import {first} from 'rxjs/operators';
import {Repo} from '../models/repo';
import {RepoService} from '../services/repo.service';

@Component({selector: 'app-repo-list', templateUrl: './repo-list.component.html'})
export class RepoListComponent implements OnInit {

  constructor(private repoService: RepoService) {
  }

  repos: Repo[];
  searchText: string;

  ngOnInit() {
    this.refresh();
  }

  refresh() {
    this.repoService.all().pipe(first()).subscribe(repos => {
      this.repos = repos;
    });
  }
}
