import {Component, OnInit} from '@angular/core';
import {first} from 'rxjs/operators';
import {SystemService} from '../services/system.service';
import {System} from '../models/system';

@Component({selector: 'app-system-list', templateUrl: './system-list.component.html'})
export class SystemListComponent implements OnInit {

  constructor(private systemService: SystemService) {
  }

  systems: System[];
  searchText: string;

  ngOnInit() {
    this.refresh();
  }

  refresh() {
    this.systemService.allSystems().pipe(first()).subscribe(systems => {
      console.log('Query');
      this.systems = systems;
    });
  }
}
