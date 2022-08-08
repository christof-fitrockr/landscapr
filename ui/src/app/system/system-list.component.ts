import {Component, OnInit} from '@angular/core';
import {first} from 'rxjs/operators';
import {ApplicationService} from '../services/application.service';
import {Application} from '../models/application';

@Component({selector: 'app-system-list', templateUrl: './system-list.component.html'})
export class SystemListComponent implements OnInit {

  constructor(private systemService: ApplicationService) {
  }

  systems: Application[];
  searchText: string;

  ngOnInit() {
    this.refresh();
  }

  refresh() {
    this.systemService.all().pipe(first()).subscribe(systems => {
      console.log('Query');
      this.systems = systems;
    });
  }
}
