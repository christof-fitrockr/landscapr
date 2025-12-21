import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { ProcessService } from '../services/process.service';
import { Process } from '../models/process';
import { first } from 'rxjs/operators';

@Component({
  selector: 'app-process-flow-view',
  templateUrl: './process-flow-view.component.html',
  styleUrls: ['./process-flow-view.component.scss']
})
export class ProcessFlowViewComponent implements OnChanges {
  @Input() processId: string;
  rootProcess: Process;

  constructor(private processService: ProcessService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['processId'] && this.processId) {
      this.loadProcess();
    }
  }

  private loadProcess() {
    this.processService.byId(this.processId).pipe(first()).subscribe(p => {
      this.rootProcess = p;
    });
  }
}
