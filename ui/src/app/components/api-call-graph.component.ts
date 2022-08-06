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


@Component({
  selector: 'app-api-call-graph', styleUrls: ['./api-call-graph.component.scss'],
  templateUrl: './api-call-graph.component.html'
})
export class ApiCallGraphComponent implements OnInit, AfterViewInit, AfterViewChecked {

  @ViewChild('canvas') public canvas: ElementRef;

  modelledProcess: ModelledProcess = new ModelledProcess();
  editorOptions = {theme: 'vs-dark', language: 'yaml'};
  showCode =  false;

  @Input() processId: string;
  @Output() processClicked = new EventEmitter<string>();

  public curve: any = shape.curveLinear;
  public layout: Layout = new DagreNodesOnlyLayout();
  hierarchicalGraph = {nodes: [], links: []}

  process: Process;
  subProcesses: Process[];
  centerGraph$ = new Subject<boolean>();


  constructor(private processService: ProcessService, private apiCallService: ApiCallService, private processDrawingService: ProcessDrawingService, private canvasService: CanvasService) {
  }

  ngOnInit() {
    this.refresh();
  }

  ngAfterViewChecked() {
    this.centerGraph$.next(true);
  }

  refresh() {
    this.processService.getProcessById(this.processId).pipe(first()).subscribe(process => {
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
      processStep.id = process.processId;
      processStep.name = process.name;
      processStep.calls = [];




      const chunkSize = 10;
      for (let i = 0; i < this.process.apiCallsIds.length; i += chunkSize) {
        const idChunk = this.process.apiCallsIds.slice(i, i + chunkSize);
        this.apiCallService.getApiCallByIds(idChunk).pipe(first()).subscribe(result => {
          for(let item of result) {

            const call = new FunctionCall();
            call.laneId = 'api';
            call.fct = item.name;
            call.in = item.input + ' ';
            call.out = item.output + ' ';

            // TODO System via capability
            //call.

            processStep.calls.push(call);


          }

          this.modelledProcess.process.processSteps = [processStep];


          this.processDrawingService.drawProcess(this.canvas.nativeElement, this.modelledProcess.process);
        });
      }



    });
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
    this.processService.deleteAll();
    this.processService.create(this.modelledProcess);
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
