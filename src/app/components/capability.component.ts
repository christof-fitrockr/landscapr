import {AfterViewChecked, AfterViewInit, Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild} from '@angular/core';
import {FunctionCall, ModelledProcess, Process, ProcessModel, ProcessStep, Swimlane} from '../models/process';
import * as shape from 'd3-shape';
import {Layout} from '@swimlane/ngx-graph';
import {DagreNodesOnlyLayout} from './customDagreNodesOnly';
import {ProcessService} from '../services/process.service';
import {first} from 'rxjs/operators';
import {Subject} from 'rxjs';
import {ProcessDrawingService} from '../services/process-drawing.service';
import {CanvasService} from '../services/canvas.service';
import {ApiCallService} from '../services/api-call.service';
import {Capability} from '../models/capability';
import {ApiCall} from '../models/api-call';


@Component({
  selector: 'app-capability', templateUrl: './capability.component.html'
})
export class CapabilityComponent implements OnInit {



  @Input() repoId: string;
  @Input() capability: Capability;
  apiCalls: ApiCall[]



  constructor(private apiCallService: ApiCallService) {
  }

  ngOnInit() {

    this.apiCallService.byCapability(this.repoId, this.capability.capabilityId).pipe(first()).subscribe(apiCalls => {
      this.apiCalls = apiCalls;
    });
  }






}
