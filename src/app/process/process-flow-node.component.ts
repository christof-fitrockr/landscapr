import { Component, Input, OnInit } from '@angular/core';
import { ProcessService } from '../services/process.service';
import { ApiCallService } from '../services/api-call.service';
import { FlowViewService } from './flow-view.service';
import { Process, getRoleColor } from '../models/process';
import { ApiCall } from '../models/api-call';
import { first } from 'rxjs/operators';

@Component({
  selector: 'app-process-flow-node',
  templateUrl: './process-flow-node.component.html',
  styleUrls: ['./process-flow-node.component.scss']
})
export class ProcessFlowNodeComponent implements OnInit {
  getRoleColor = getRoleColor;
  @Input() processId: string;
  @Input() process: Process; // Optional, if already loaded

  apiCalls: ApiCall[] = [];
  childProcessIds: string[] = [];
  loading = false;
  isExpanded = true;

  constructor(
    private processService: ProcessService,
    private apiCallService: ApiCallService,
    private flowViewService: FlowViewService
  ) {}

  ngOnInit(): void {
    if (this.process) {
      this.initData(this.process);
    } else if (this.processId) {
      this.loading = true;
      this.processService.byId(this.processId).pipe(first()).subscribe(p => {
        this.process = p;
        this.initData(p);
        this.loading = false;
      });
    }
  }

  private initData(process: Process) {
    // Load API Calls
    if (process.apiCallIds && process.apiCallIds.length > 0) {
      this.apiCallService.byIds(process.apiCallIds).pipe(first()).subscribe(apis => {
        this.apiCalls = apis;
      });
    }

    // Identify Child Processes (Steps)
    if (process.steps && process.steps.length > 0) {
      this.childProcessIds = process.steps.map(step => step.processReference).filter(id => !!id);
    }
  }

  onApiClick(api: ApiCall) {
    this.flowViewService.selectApi(api);
  }

  openProcessEdit(event: MouseEvent, processId: string) {
    event.stopPropagation();
    window.open(`/#/process/edit/${processId}`, '_blank');
  }

  openApiEdit(event: MouseEvent, apiId: string) {
    event.stopPropagation();
    window.open(`/#/apiCall/edit/${apiId}`, '_blank');
  }

  toggleExpand() {
    this.isExpanded = !this.isExpanded;
  }
}
