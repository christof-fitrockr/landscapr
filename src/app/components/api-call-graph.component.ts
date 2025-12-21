import {AfterViewChecked, AfterViewInit, Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild} from '@angular/core';
import {FunctionCall, ModelledProcess, Process, ProcessModel, ProcessStep, Swimlane} from '../models/process';
import * as shape from 'd3-shape';
import {ProcessService} from '../services/process.service';
import {first} from 'rxjs/operators';
import {Subject} from 'rxjs';
import {ProcessDrawingService} from '../services/process-drawing.service';
import {CanvasService} from '../services/canvas.service';
import {ApiCallService} from '../services/api-call.service';
import {CapabilityService} from '../services/capability.service';
import {ApplicationService} from '../services/application.service';
import {ApiCall} from '../models/api-call';
import {Capability} from '../models/capability';
import {Application} from '../models/application';


@Component({
  selector: 'app-api-call-graph', styleUrls: ['./api-call-graph.component.scss'],
  templateUrl: './api-call-graph.component.html'
})
export class ApiCallGraphComponent implements OnInit, AfterViewInit, AfterViewChecked {

  @ViewChild('canvas') public canvas: ElementRef;

  modelledProcess: ModelledProcess = new ModelledProcess();
  showCode =  false;

  @Input() processId: string;
  @Output() processClicked = new EventEmitter<string>();


  process: Process;
  subProcesses: Process[];
  centerGraph$ = new Subject<boolean>();


  constructor(private processService: ProcessService,
              private apiCallService: ApiCallService,
              private processDrawingService: ProcessDrawingService,
              private canvasService: CanvasService,
              private capabilityService: CapabilityService,
              private applicationService: ApplicationService) {
  }

  ngOnInit() {
    this.refresh();
  }

  ngAfterViewChecked() {
    this.centerGraph$.next(true);
  }

  refresh() {
    this.processService.byId(this.processId).pipe(first()).subscribe(process => {
      this.process = process;


      const functions = [];
      const processSwimlane = new Swimlane();
      processSwimlane.id='aswp';
      processSwimlane.name='Process';
      const functionSwimlane = new Swimlane();
      functionSwimlane.id='api';
      functionSwimlane.name='API';

      this.modelledProcess = new ModelledProcess();
      this.modelledProcess.process = new ProcessModel();
      this.modelledProcess.process.swimlanes = [processSwimlane, functionSwimlane ];

      const processStep = new ProcessStep();
      processStep.id = process.id;
      processStep.name = process.name;
      processStep.calls = [];




      const chunkSize = 10;
      for (let i = 0; i < this.process.apiCallIds.length; i += chunkSize) {
        const idChunk = this.process.apiCallIds.slice(i, i + chunkSize);
        this.apiCallService.byIds(idChunk).pipe(first()).subscribe(result => {

          const capIds = result.map(a => a.capabilityId).filter(id => !!id);

          if (capIds.length === 0) {
            this.processApiCalls(result, [], [], processStep);
          } else {
            this.capabilityService.byIds(capIds).pipe(first()).subscribe(capabilities => {
              const sysIds: string[] = [];
              capabilities.forEach(c => {
                if (c.implementedBy) {
                  sysIds.push(...c.implementedBy);
                }
              });

              if (sysIds.length === 0) {
                this.processApiCalls(result, capabilities, [], processStep);
              } else {
                this.applicationService.byIds(sysIds).pipe(first()).subscribe(systems => {
                  this.processApiCalls(result, capabilities, systems, processStep);
                });
              }
            });
          }
        });
      }



    });
  }



  processApiCalls(apiCalls: ApiCall[], capabilities: Capability[], systems: Application[], processStep: ProcessStep) {
    const sysMap = new Map(systems.map(s => [s.id, s]));
    const capMap = new Map(capabilities.map(c => [c.id, c]));

    for (const item of apiCalls) {

      const call = new FunctionCall();
      call.laneId = 'api';
      call.fct = item.name;

      if (item.capabilityId && capMap.has(item.capabilityId)) {
        const cap = capMap.get(item.capabilityId);
        if (cap.implementedBy && cap.implementedBy.length > 0) {
          const systemNames = cap.implementedBy
            .map(sysId => sysMap.get(sysId)?.name)
            .filter(name => !!name)
            .join(', ');
          call.sys = systemNames;
        }
      }

      processStep.calls.push(call);


    }

    this.modelledProcess.process.processSteps = [processStep];


    this.processDrawingService.drawProcess(this.canvas.nativeElement, this.modelledProcess.process);
  }

  onClick(node: any) {
    this.processClicked.emit(node.id);
  }



  ngAfterViewInit() {
    this.refresh();
  }

  private drawProcess() {
//    this.modelledProcess.process = yaml.load(this.modelledProcess.rawProcess);
  }

  codeChanged() {
    setTimeout(() => { this.drawProcess(); }, 500)
  }

  save() {
    // this.processService.deleteAll();
    // this.processService.create(this.modelledProcess);
  }

  //refresh() {
    // this.processService.list().snapshotChanges().subscribe(results => {
    //
    //     if(results.length >= 1) {
    //         this.modelledProcess = JSON.parse(JSON.stringify(results[0].payload));
    //         this.drawProcess();
    //     }
    // })
  //}

  zoomIn() {
    this.processDrawingService.zoom(0.1);
    this.drawProcess();
  }

  zoomOut() {
    this.processDrawingService.zoom(-0.1);
    this.drawProcess();
  }
}
