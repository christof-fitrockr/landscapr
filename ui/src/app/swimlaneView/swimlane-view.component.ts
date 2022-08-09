import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import {ProcessService} from '../services/process.service';
import {ActivatedRoute} from '@angular/router';
import {first} from 'rxjs/operators';
import {Process} from '../models/process';
import {CanvasService} from '../services/canvas.service';
import {ApiCallService} from '../services/api-call.service';
import {ApiCall} from '../models/api-call';
import {Application} from '../models/application';
import {ApplicationService} from '../services/application.service';
import {Subscription} from 'rxjs';


@Component({selector: 'app-swimlane-view', templateUrl: './swimlane-view.component.html'})
export class SwimlaneViewComponent implements OnInit, AfterViewInit, OnChanges {

  @ViewChild('canvas') public canvas: ElementRef;

  @Input() repoId: string;
  @Input() processId: string;

  private processMap = new Map<string, Process>();
  private apiCallMap = new Map<string, ApiCall>();
  private systemMap = new Map<string, Application>();
  processOrder: ProcessBox[] = [];
  functionOrder: ProcessBox[] = [];
  processBoxMap = new Map<number, ProcessBox>();
  functionBoxMap = new Map<number, ProcessBox>();
  edges: Edge[] = [];
  @Input() zoomFactor = 0.6;
  width: number;
  height: number;
  private subscription: Subscription;

  constructor(private activatedRoute: ActivatedRoute,private processService: ProcessService, private systemService: ApplicationService,
              private canvasService: CanvasService, private apiCallService: ApiCallService) {
  }

  ngOnChanges(changes: SimpleChanges) {
    if(this.canvas) {
      this.resize();
      this.drawGraph(this.canvas.nativeElement.getContext('2d'));
    }
  }

  ngOnInit() {
    console.log("Repo: " + this.repoId);
    // this.processId = this.activatedRoute.snapshot.paramMap.get('id');

    // this.subscription = this.activatedRoute.parent.paramMap.subscribe(obs => {
    //   this.repoId = obs.get('repoId');
    // });
  }

  // ngOnDestroy() {
  //   this.subscription.unsubscribe();
  // }


  ngAfterViewInit() {
    const cx = this.canvas.nativeElement.getContext('2d');

    this.processService.all(this.repoId).pipe(first()).subscribe((processes) => {
      this.apiCallService.all(this.repoId).pipe(first()).subscribe(apiCalls => {
        this.systemService.all(this.repoId).pipe(first()).subscribe(systems => {
          for (let process of processes) {
            this.processMap.set(process.id, process);
          }
          for (let apiCall of apiCalls) {
            this.apiCallMap.set(apiCall.id, apiCall);
          }
          for (let system of systems) {
            this.systemMap.set(system.id, system);
          }

          this.createGraph(cx, this.processId, 50, 0);

          this.resize();


          this.drawGraph(cx);
        });
      });
    })
  }

  private createGraph(cx: CanvasRenderingContext2D, id: string, x = 0, layer = 0): ProcessBox {
    const mainProcess = new ProcessWithChildren();
    const process = this.processMap.get(id)


    mainProcess.process = process;
    mainProcess.children = [];

    let processBox = new ProcessBox();
    processBox.title = process.name;
    processBox.x = x;
    processBox.depth = layer;
    processBox.roleLayer = -1;
    if(!process.steps || process.steps.length === 0) {
      processBox.roleLayer = process.role;
      processBox.w = this.canvasService.calcFunctionWidth(cx, 0, process.name, '');
    }

    if(process.steps && process.steps.length > 0) {
      processBox.w = 0;

      const childBoxes = new Map<string, ProcessBox>();
      for (let step of process.steps) {
        if(step.processReference) {
          const childBox = this.createGraph(cx, step.processReference, x + processBox.w, layer + 1);
          childBoxes.set(step.processReference, childBox);
          processBox.w += childBox.w;
          processBox.w += 60; // Gap
        }
      }

      for (let step of process.steps) {
        if (step.successors) {
          for (let successor of step.successors) {
            const edge = new Edge();
            edge.startId = childBoxes.get(step.processReference).id;
            if(childBoxes.has(successor.processReference)) {
              edge.endId = childBoxes.get(successor.processReference).id;
              edge.title = successor.edgeTitle;
              this.edges.push(edge)
            } else {
              console.error('Step "' + process.name + '": Could not found reference to "' + successor.processReference + '"');
            }
          }
        }
      }
        processBox.w -= 60;
    }


    processBox.id = this.processOrder.length;

    let functionW = 0;
    if(process.apiCallIds && (!process.steps || process.steps.length === 0)) {



      for(let apiCallId of process.apiCallIds) {
        let apiCall = this.apiCallMap.get(apiCallId)


        functionW += this.canvasService.calcFunctionWidth(cx, 0, apiCall.name, this.getSubTitle(apiCall));
        functionW += 60;
      }
      functionW -= 60;

      if((functionW + processBox.w) > processBox.w) {
        processBox.w = functionW + processBox.w;
        let currentX = x;
        for(let apiCallId of process.apiCallIds) {
          let apiCall = this.apiCallMap.get(apiCallId)
          const subTitle = this.getSubTitle(apiCall);
          const w = this.canvasService.calcFunctionWidth(cx, 0, apiCall.name, subTitle)
          const childBox = this.createFunctionGraph(cx, apiCall, currentX + (processBox.w/2) - functionW/2, layer + 1);
          childBox.subTitle = subTitle;
          currentX += childBox.w;
          currentX += 60;

          const inEdge = new Edge();
          inEdge.startId = processBox.id;
          inEdge.endId = childBox.id;
          inEdge.title = apiCall.input;

          const outEdge = new Edge();
          outEdge.startId = childBox.id;
          outEdge.endId = processBox.id;
          outEdge.title = apiCall.output;

          this.edges.push(inEdge, outEdge);

        }
      } else {
        let startX = (processBox.w - functionW) / 2
        for(let apiCallId of process.apiCallIds) {
          this.createFunctionGraph(cx, this.apiCallMap.get(apiCallId), startX + functionW, layer + 1);
        }
      }
    }


    this.processBoxMap.set(processBox.id, processBox);
    this.processOrder.push(processBox);

    return processBox;

  }

  private getSubTitle(apiCall: ApiCall): string {
    let subTitle = '';
    if (apiCall.implementedBy && apiCall.implementedBy.length > 0) {
      subTitle = this.systemMap.get(apiCall.implementedBy[0]).name;
      if (apiCall.implementedBy.length > 1) {
        subTitle += ', ...';
      }
    }
    return subTitle;
  }

  private createFunctionGraph(cx: CanvasRenderingContext2D, apiCall: ApiCall, x: number, layer: number): ProcessBox {
    let processBox = new ProcessBox();
    processBox.title = apiCall.name;
    processBox.x = x;
    processBox.depth = layer;
    processBox.w = this.canvasService.calcFunctionWidth(cx, 0, apiCall.name, '');
    processBox.roleLayer = -1;
    processBox.id = this.functionOrder.length + 100000;
    this.functionBoxMap.set(processBox.id, processBox);
    this.functionOrder.push(processBox);
    return processBox;
  }

  private drawGraph(cx: any) {
      let maxDepth = 0;
    for(let box of this.processBoxMap.values()) {
      maxDepth = Math.max(maxDepth, box.depth);
    }

    const lastElement = this.processOrder[this.processOrder.length - 1];
    const width = (lastElement.x + lastElement.w);
    cx.save();
    cx.clearRect(0, 0, this.canvas.nativeElement.width, this.canvas.nativeElement.height);
    cx.scale(this.zoomFactor, this.zoomFactor);

      let idx = 0;
      while(idx < maxDepth) {
        this.canvasService.drawSwimlane(cx, 0, idx*100, width, 90, 'P' + idx )
        idx++;
      }

      this.canvasService.drawSwimlane(cx, 0, (idx++)*100, width, 90, 'Customer' )
      this.canvasService.drawSwimlane(cx, 0, (idx++)*100, width, 90, 'Vehicle' )
      this.canvasService.drawSwimlane(cx, 0, (idx++)*100, width, 90, 'Service w/ customer' );
      this.canvasService.drawSwimlane(cx, 0, (idx++)*100, width, 90, 'Service w/o customer' );
      this.canvasService.drawSwimlane(cx, 0, (idx++)*100, width, 90, 'Workshop');
      this.canvasService.drawSwimlane(cx, 0, (idx++)*100, width, 90, 'Parts');
      this.canvasService.drawSwimlane(cx, 0, (idx)*100, width, 140, 'API');

      for(let box of this.processOrder) {
        if (box.roleLayer >= 0) {
          this.canvasService.drawProcessStep(cx, box.x, (maxDepth * 100) + box.roleLayer * 100, box.w, 50, box.title, '#a0f0f0')
        } else {
          this.canvasService.drawProcessStep(cx, box.x, box.depth * 100, box.w, 50, box.title, '#e0e0e0')
        }
      }

      for(let box of this.functionBoxMap.values()) {
          this.canvasService.drawFunction(cx, box.x, (idx)*100 + 25, box.title, box.subTitle, '#e0e050', box.w)
      }


      let yCorrArray = new Array<number>(this.processOrder.length);
      for(let edge of this.edges) {
        if(this.processBoxMap.has(edge.startId) && this.processBoxMap.has(edge.endId)) {
          // Process Edge
          let startBox = this.processBoxMap.get(edge.startId);
          let endBox = this.processBoxMap.get(edge.endId);

          const startIdx = this.processOrder.indexOf(startBox);
          const endIdx = this.processOrder.indexOf(endBox);

          if(endIdx === startIdx + 1) {
            // this.canvasService.drawArrow(cx,
            //   startBox.x + startBox.w + 12,
            //   SwimlaneViewComponent.getYForBox(startBox, maxDepth) + 25,
            //   endBox.x + 12,
            //   SwimlaneViewComponent.getYForBox(endBox, maxDepth) + 25, '');
          } else {
            let idx = Math.min(startIdx, endIdx);
            let end = Math.max(startIdx, endIdx);
            let yCorr = 0;
            while (idx <= end) {
              yCorrArray[idx] = !yCorrArray[idx] ? 1 : yCorrArray[idx] + 1;
              yCorr = Math.max(yCorrArray[idx], yCorr);
              idx++;
            }

            if(startBox.roleLayer > 0 && endBox.roleLayer > 0) {

              this.canvasService.drawArrowWithHeight(cx,
                startBox.x + startBox.w / 2 + 12,
                SwimlaneViewComponent.getYForBox(startBox, maxDepth),
                endBox.x + endBox.w / 2 + 12,
                SwimlaneViewComponent.getYForBox(endBox, maxDepth),
                yCorr * 10, edge.title);
            }

          }


        } else if(this.processBoxMap.has(edge.startId) && this.functionBoxMap.has(edge.endId)) {
          // Function In
          let startBox = this.processBoxMap.get(edge.startId);
          let endBox = this.functionBoxMap.get(edge.endId);
          this.canvasService.drawArrow(cx, endBox.x + endBox.w/4, SwimlaneViewComponent.getYForBox(startBox, maxDepth) + 50,
            endBox.x + endBox.w/4, (idx)*100 + 25, edge.title);
        } else if(this.functionBoxMap.has(edge.startId) && this.processBoxMap.has(edge.endId)) {
          // Function Out
          let startBox = this.functionBoxMap.get(edge.startId);
          let endBox = this.processBoxMap.get(edge.endId);
          this.canvasService.drawArrow(cx, startBox.x + 3*startBox.w/4, (idx)*100 + 25,
            startBox.x + 3*startBox.w/4, SwimlaneViewComponent.getYForBox(endBox, maxDepth) + 50, edge.title);
        }
      }

      cx.restore();
  }

  private static getYForBox(box: ProcessBox, maxDepth: number) {
      if (box.roleLayer >= 0) {
        return (maxDepth * 100) + box.roleLayer * 100;
      }
    return box.depth * 100;
  }

  private resize() {
    const lastElement = this.processOrder[this.processOrder.length - 1];

    this.canvas.nativeElement.width = (lastElement.x + lastElement.w) * this.zoomFactor + 100;

    let maxDepth = 0;
    for(let box of this.processBoxMap.values()) {
      maxDepth = Math.max(maxDepth, box.depth);
    }
    this.canvas.nativeElement.height = (maxDepth * 100 + 8*90 + 140 + 50) * this.zoomFactor;
    // this.height =(maxDepth * 100 + 8*90 + 140 + 50) * this.zoomFactor;

  }
}



class ProcessWithChildren {
  process: Process;
  children: ProcessWithChildren[];
}

class ProcessWithParent {
  process: Process;
  parent: string;
}

class ProcessBox {
  id: number;
  title: string;
  subTitle: string;
  x: number;
  w: number;
  depth: number;
  childBoxes: ProcessBox[];
  roleLayer: number;
}

class Edge {
  startId; number;
  endId: number;
  title: string;
}

