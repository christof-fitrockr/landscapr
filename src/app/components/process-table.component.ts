import {Component, EventEmitter, Input, Output} from '@angular/core';
import {Process} from '../models/process';
import {ApiCall} from '../models/api-call';


@Component({
  selector: 'app-process-table',
  templateUrl: './process-table.component.html'
})
export class ProcessTableComponent  {


  @Input() repoId: string;
  @Input() filter: string;
  @Input() processes: Process[];
  @Input() showFilter = true


  constructor() { }

}
