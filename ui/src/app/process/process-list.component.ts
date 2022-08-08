import {Component, OnInit} from '@angular/core';
import {ProcessService} from '../services/process.service';
import {Process} from '../models/process';
import {first} from 'rxjs/operators';

@Component({selector: 'app-process-list', templateUrl: './process-list.component.html'})
export class ProcessListComponent implements OnInit {

  constructor(private processService: ProcessService) {
  }

  processes: Process[];


  ngOnInit() {
    this.processService.all().pipe(first()).subscribe(items => {
      this.processes = items;
    });
  }
}
