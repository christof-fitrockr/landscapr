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
import {Process, Role, Status} from '../models/process';
import {CanvasService} from '../services/canvas.service';
import {ApiCallService} from '../services/api-call.service';
import {ApiCall, ApiImplementationStatus} from '../models/api-call';
import {Application} from '../models/application';
import {ApplicationService} from '../services/application.service';
import {Subscription} from 'rxjs';
// import pptxgen from "pptxgenjs";
import { jsPDF } from "jspdf";

@Component({
  selector: 'app-swimlane-view',
  templateUrl: './swimlane-view.component.html',
  styleUrls: ['./swimlane-view.component.scss']
})
export class SwimlaneViewComponent implements OnInit, AfterViewInit, OnChanges {

  @ViewChild('canvas') public canvas: ElementRef<HTMLCanvasElement>;
  @ViewChild('hiddenCanvas') public hiddenCanvas: ElementRef<HTMLCanvasElement>;

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
  selectedItem: ProcessBox | null = null;
  selectedProcess: Process | null = null;
  selectedApiCall: ApiCall | null = null;
  Role = Role;
  Status = Status;
  ApiImplementationStatus = ApiImplementationStatus;


  constructor(private activatedRoute: ActivatedRoute,private processService: ProcessService, private systemService: ApplicationService,
              private canvasService: CanvasService, private apiCallService: ApiCallService) {
  }

  ngOnChanges(changes: SimpleChanges) {
    if(this.canvas && this.processMap.size > 0) {
      this.resize(this.canvas);
      this.drawGraph(this.canvas);
    }
  }

  ngOnInit() {
    console.log("Repo: " + this.repoId);
    if (!this.processId) {
      this.processId = this.activatedRoute.snapshot.paramMap.get('id');
    }

    // this.subscription = this.activatedRoute.parent.paramMap.subscribe(obs => {
    //   this.repoId = obs.get('repoId');
    // });
  }

  // ngOnDestroy() {
  //   this.subscription.unsubscribe();
  // }


  ngAfterViewInit() {

    this.processService.all().pipe(first()).subscribe((processes) => {
      this.apiCallService.all().pipe(first()).subscribe(apiCalls => {
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
          this.draw(this.canvas);
        });
      });
    })
  }

  private draw(canvas: ElementRef<HTMLCanvasElement>, clipX?: number, clipY?: number, clipW?: number, clipH?: number) {
    this.createGraph(canvas, this.processId, 50, 0);
    this.resize(canvas, clipX, clipY, clipW, clipH);
    this.drawGraph(canvas, clipX, clipY, clipW, clipH);
  }

  private createGraph(canvas: ElementRef<HTMLCanvasElement>, id: string, x = 0, layer = 0): ProcessBox {
    const cx = canvas.nativeElement.getContext('2d');
    const mainProcess = new ProcessWithChildren();
    const process = this.processMap.get(id)

    if(!process) {
      console.error('Process with id ' + id + ' not found.');
      let processBox = new ProcessBox();
      processBox.processId = id;
      processBox.title = '!! MISSING !!';
      processBox.x = x;
      processBox.depth = layer;
      processBox.roleLayer = -1;
      processBox.w = this.canvasService.calcFunctionWidth(cx, 0, processBox.title, '');

      // Fix: Ensure we push the missing box so resize/draw works
      this.processBoxMap.set(processBox.id, processBox);
      this.processOrder.push(processBox);

      return processBox;
    }

    mainProcess.process = process;
    mainProcess.children = [];

    let processBox = new ProcessBox();
    processBox.title = process.name;
    processBox.processId = id;
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
          console.debug('Childs of id ' + id + ' with name ' + process.name + ' not found.');
          const childBox = this.createGraph(canvas, step.processReference, x + processBox.w, layer + 1);
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
    processBox.processId = apiCall.id;
    processBox.x = x;
    processBox.depth = layer;
    processBox.w = this.canvasService.calcFunctionWidth(cx, 0, apiCall.name, '');
    processBox.roleLayer = -1;
    processBox.id = this.functionOrder.length + 100000;
    this.functionBoxMap.set(processBox.id, processBox);
    this.functionOrder.push(processBox);
    return processBox;
  }

  public onCanvasClick(event: MouseEvent) {
    const rect = this.canvas.nativeElement.getBoundingClientRect();
    const x = (event.clientX - rect.left) / this.zoomFactor;
    const y = (event.clientY - rect.top) / this.zoomFactor;

    this.selectedItem = null;
    this.selectedProcess = null;
    this.selectedApiCall = null;

    let maxDepth = 0;
    for(let box of this.processBoxMap.values()) {
      maxDepth = Math.max(maxDepth, box.depth);
    }

    // Check process boxes
    for (let box of this.processOrder) {
      const boxY = SwimlaneViewComponent.getYForBox(box, maxDepth);
      if (x >= box.x && x <= box.x + box.w && y >= boxY && y <= boxY + 50) {
        this.selectedItem = box;
        this.selectedProcess = this.processMap.get(box.processId);
        return;
      }
    }

    // Check api boxes
    let apiLaneIdx = maxDepth + 6; // Based on drawGraph logic: idx = maxDepth + 6
    for (let box of this.functionBoxMap.values()) {
      const boxY = (apiLaneIdx) * 100 + 25;
      if (x >= box.x && x <= box.x + box.w && y >= boxY && y <= boxY + 50) { // Height is 50 for functions (BOX_HEIGHT)
        this.selectedItem = box;
        this.selectedApiCall = this.apiCallMap.get(box.processId); // processId holds apiCallId for these
        return;
      }
    }
  }

  private drawGraph(elem: ElementRef<HTMLCanvasElement>, clipX = -1, clipY = -1, clipW = -1, clipH = -1) {
    const cx = elem.nativeElement.getContext('2d');
      let maxDepth = 0;
    for(let box of this.processBoxMap.values()) {
      maxDepth = Math.max(maxDepth, box.depth);
    }

    if (this.processOrder.length === 0) {
        // Nothing to draw
        return;
    }

    const lastElement = this.processOrder[this.processOrder.length - 1];
    const width = (lastElement.x + lastElement.w);
    cx.save();
    cx.clearRect(0, 0, elem.nativeElement.width, elem.nativeElement.height);

    if(clipX >= 0 && clipY >= 0 && clipW >= 0 && clipH >= 0) {
      cx.translate(-clipX, 0);
      cx.beginPath();
      cx.rect(clipX, clipY, clipW, clipH);
      cx.clip();


    }
    cx.scale(this.zoomFactor, this.zoomFactor);


      let idx = 0;
      while(idx < maxDepth) {
        this.canvasService.drawSwimlane(cx, 0, idx*100, width, 90, 'P' + idx, idx)
        idx++;
      }

      this.canvasService.drawSwimlane(cx, 0, idx * 100, width, 90, 'Customer', idx++);
      this.canvasService.drawSwimlane(cx, 0, idx * 100, width, 90, 'Vehicle', idx++);
      this.canvasService.drawSwimlane(cx, 0, idx * 100, width, 90, 'Service w/ customer', idx++);
      this.canvasService.drawSwimlane(cx, 0, idx * 100, width, 90, 'Service w/o customer', idx++);
      this.canvasService.drawSwimlane(cx, 0, idx * 100, width, 90, 'Workshop', idx++);
      this.canvasService.drawSwimlane(cx, 0, idx * 100, width, 90, 'Parts', idx++);
      this.canvasService.drawSwimlane(cx, 0, idx * 100, width, 140, 'API', idx);

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

  private resize(canvas: ElementRef<HTMLCanvasElement>, clipX?: number, clipY?: number, clipW?: number, clipH?: number) {

    if (this.processOrder.length === 0) {
      return;
    }

    const lastElement = this.processOrder[this.processOrder.length - 1];

    let maxDepth = 0;
    for(let box of this.processBoxMap.values()) {
      maxDepth = Math.max(maxDepth, box.depth);
    }

    const fullWidth = (lastElement.x + lastElement.w) * this.zoomFactor + 100;
    const fullHeight = (maxDepth * 100 + 8*90 + 0 + 50) * this.zoomFactor;

    this.width = fullWidth;
    this.height = fullHeight;


    if(clipX >= 0 && clipW >= 0 && clipW - clipX < fullWidth) {
      canvas.nativeElement.width = clipW - clipX;
      canvas.nativeElement.height = fullHeight;
    } else {
      canvas.nativeElement.width = fullWidth;
      canvas.nativeElement.height = fullHeight;
    }

  }



  downloadPdf() {
    const process = this.processMap.get(this.processId)

    this.createGraph(this.hiddenCanvas, this.processId, 50, 0);
    this.resize(this.hiddenCanvas);
    this.draw(this.hiddenCanvas);

    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "px",
      format: [this.hiddenCanvas.nativeElement.width, this.hiddenCanvas.nativeElement.height]
    });
    pdf.addImage(this.hiddenCanvas.nativeElement.toDataURL("image/png"), 'png', 0, 0, this.hiddenCanvas.nativeElement.width, this.hiddenCanvas.nativeElement.height);
    pdf.save(process.name + ".pdf");
  }

  downloadPpt() {
    const process = this.processMap.get(this.processId)

    // let pres = new pptxgen();
    // pres.layout = 'LAYOUT_WIDE';
    // pres.title = process.name;
    // pres.defineSlideMaster({
    //   title: "MASTER_SLIDE",
    //   background: { color: "FFFFFF" },
    //   slideNumber: { x: 12.3, y: 7.0 },
    // });
    //
    //
    // this.createGraph(this.hiddenCanvas, this.processId, 50, 0);
    // this.resize(this.hiddenCanvas);
    //
    //
    //
    // pres.addSection({ title: "Title" });
    // let slide = pres.addSlide({sectionTitle: 'Title'});
    // slide.addShape(pres.ShapeType.rect, { fill: { color: "#2596be" }, x: 0, y: 3, w: 13.35, h: 3.5  });
    // slide.addText(process.name, {
    //   paraSpaceBefore: 0,
    //   paraSpaceAfter: 0,
    //   margin: 2,
    //   x: 0.4, y: 3.5, h: 0.3, w: 12.7, color: "000000", fontSize: 24, fit: 'shrink', valign: 'top', bold: true,
    // });
    // slide.addText('Process Description', {
    //   paraSpaceBefore: 0,
    //   paraSpaceAfter: 0,
    //   margin: 2,
    //   x: 0.4, y: 4.0, h: 0.3, w: 12.7, color: "000000", fontSize: 18, fit: 'shrink', valign: 'top', bold: true,
    // });
    //
    // slide.addText(new Date().toUTCString(), {
    //   paraSpaceBefore: 0,
    //   paraSpaceAfter: 0,
    //   margin: 2,
    //   x: 0.4, y: 6.0, h: 0.3, w: 12.7, color: "000000", fontSize: 12, fit: 'shrink', valign: 'top', bold: true,
    // });
    //
    //
    // pres.addSection({ title: "Process" });
    //
    // const processSlides = Math.ceil(this.width / 1500);
    // let slideNumber = 1;
    //
    // let currX = 0;
    // do {
    //
    //
    //   let slide = pres.addSlide({sectionTitle: 'Process', masterName: 'MASTER_SLIDE'});
    //   this.draw(this.hiddenCanvas, currX, 0, currX + 1500, this.hiddenCanvas.nativeElement.height);
    //   currX += 1500;
    //
    //   slide.addText(process.name + ' (' + slideNumber + '/' + processSlides + ')', {x: 0.4, y: 0.3, w: 12.3, h: 0.5, color: "000000"})
    //   slide.addImage({ data:this.hiddenCanvas.nativeElement.toDataURL("image/png"), x: 0.5, y: 1.3, w: 12.3, h: 5.5 });
    //
    //   slideNumber++;
    //
    // } while(currX < this.width);
    //
    //
    // pres.addSection({ title: "Steps" });
    //
    // this.processOrder.forEach(processStep => {
    //   const process = this.processMap.get(processStep.processId);
    //   let slide = pres.addSlide({sectionTitle: 'Steps',masterName: 'MASTER_SLIDE'});
    //   slide.addText(process.name, { x: 0.4, y: 0.3, w: 12.3, h: 0.5, color: "000000", margin: 0, inset: 0, valign: 'middle'});
    //
    //   slide.addText('Role', {
    //     shape: pres.ShapeType.rect,
    //     fill: { color: "#2596be" },
    //     line: { color: "#2596be" },
    //     paraSpaceBefore: 0,
    //     paraSpaceAfter: 0,
    //     margin: 2,
    //     x: 0.4, y: 1, h: 0.3, w: 1.0, color: "000000", fontSize: 12, fit: 'shrink', valign: 'top', bold: true,
    //   });
    //
    //   slide.addText(Role[process.role], {
    //     shape: pres.ShapeType.rect,
    //     fill: { color: "ffffff" },
    //     line: { color: "#2596be" },
    //     paraSpaceBefore: 0,
    //     paraSpaceAfter: 0,
    //     margin: 2,
    //     x: 1.1, y: 1, h: 0.3, w: 1.8, color: "000000", fontSize: 12, fit: 'shrink', valign: 'top', bold: true,
    //   });
    //
    //   slide.addText('Tags', {
    //     shape: pres.ShapeType.rect,
    //     fill: { color: "#2596be" },
    //     line: { color: "#2596be" },
    //     paraSpaceBefore: 0,
    //     paraSpaceAfter: 0,
    //     margin: 2,
    //     x: 3.0, y: 1, h: 0.3, w: 1.0, color: "000000", fontSize: 12, fit: 'shrink', valign: 'top', bold: true,
    //   });
    //
    //   slide.addText(process.tags?.toString(), {
    //     shape: pres.ShapeType.rect,
    //     fill: { color: "ffffff" },
    //     line: { color: "#2596be" },
    //     paraSpaceBefore: 0,
    //     paraSpaceAfter: 0,
    //     margin: 2,
    //     x: 4.0, y: 1, h: 0.3, w: 8.7, color: "000000", fontSize: 12, fit: 'shrink', valign: 'top', bold: true,
    //   });
    //
    //
    //   slide.addText('Description', {
    //     shape: pres.ShapeType.rect,
    //     fill: { color: "#2596be" },
    //     line: { color: "#2596be" },
    //     paraSpaceBefore: 0,
    //     paraSpaceAfter: 0,
    //     margin: 2,
    //     x: 0.4, y: 1.4, h: 0.3, w: 12.3, color: "000000", fontSize: 12, fit: 'shrink', valign: 'top', bold: true,
    //   });
    //
    //   slide.addText(process.description, {
    //     shape: pres.ShapeType.rect,
    //     fill: { color: "ffffff" },
    //     line: { color: "#2596be" },
    //     margin: 2,
    //     x: 0.4, y: 1.7, h: 3.0, w: 12.3, color: "000000", fontSize: 12, fit: 'shrink', valign: 'top'
    //   });
    //
    //
    //   slide.addText('API Calls', {
    //     shape: pres.ShapeType.rect,
    //     fill: { color: "#2596be" },
    //     line: { color: "#2596be" },
    //     paraSpaceBefore: 0,
    //     paraSpaceAfter: 0,
    //     margin: 2,
    //     x: 0.4, y: 4.8, h: 0.3, w: 12.3, color: "000000", fontSize: 12, fit: 'shrink', valign: 'top', bold: true,
    //   });
    //
    //   let apiCallText = '';
    //   for (const apiCallId of process.apiCallIds) {
    //     const apiCall = this.apiCallMap.get(apiCallId);
    //     apiCallText += apiCall.name + ': ' + apiCall.input + ' -> ' + apiCall.output + '\n';
    //   }
    //
    //   slide.addText(apiCallText, {
    //     shape: pres.ShapeType.rect,
    //     fill: { color: "ffffff" },
    //     line: { color: "#2596be" },
    //     margin: 2,
    //     x: 0.4, y: 5.1, h: 1.5, w: 12.3, color: "000000", fontSize: 12, fit: 'shrink', valign: 'top'
    //   });
    //
    //
    // });
    //
    //
    //
    // pres.writeFile({fileName: process.name + '.pptx'});

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
  processId: string;
  title: string;
  subTitle: string;
  x: number;
  w: number;
  depth: number;
  childBoxes: ProcessBox[];
  roleLayer: number;
}

class Edge {
  startId: number;
  endId: number;
  title: string;
}

