import {
  AfterViewInit,
  Component,
  ElementRef, HostListener,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import {ProcessService} from '../services/process.service';
import {ActivatedRoute, Router} from '@angular/router';
import {first} from 'rxjs/operators';
import {Process, Role, Status, ROLE_COLORS, getRoleColor} from '../models/process';
import {CanvasService} from '../services/canvas.service';
import {ApiCallService} from '../services/api-call.service';
import {ApiCall, ApiImplementationStatus} from '../models/api-call';
import {Application} from '../models/application';
import {ApplicationService} from '../services/application.service';
import {Subscription} from 'rxjs';
import { jsPDF } from "jspdf";
import {Comment} from '../models/comment';
import {AuthenticationService} from '../services/authentication.service';
import {v4 as uuidv4} from 'uuid';

@Component({
  selector: 'app-swimlane-view',
  templateUrl: './swimlane-view.component.html',
  styleUrls: ['./swimlane-view.component.scss']
})
export class SwimlaneViewComponent implements OnInit, AfterViewInit, OnChanges {

  @ViewChild('canvas') public canvas: ElementRef<HTMLCanvasElement>;
  @ViewChild('hiddenCanvas') public hiddenCanvas: ElementRef<HTMLCanvasElement>;
  @ViewChild('canvasContainer') public canvasContainer: ElementRef<HTMLDivElement>;

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
  @Input() zoomFactor = 1.0;
  offsetX = 0;
  offsetY = 0;
  private isDragging = false;
  private lastMouseX = 0;
  private lastMouseY = 0;
  width: number;
  height: number;
  private subscription: Subscription;
  selectedItem: ProcessBox | null = null;
  selectedProcess: Process | null = null;
  selectedApiCall: ApiCall | null = null;
  newCommentText = '';
  Role = Role;
  Status = Status;
  ApiImplementationStatus = ApiImplementationStatus;
  dynamicRoles: string[] = [];

  private roleColors = ROLE_COLORS;


  constructor(private activatedRoute: ActivatedRoute, private router: Router, private processService: ProcessService, private systemService: ApplicationService,
              private canvasService: CanvasService, private apiCallService: ApiCallService, private authService: AuthenticationService) {
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.processId && !changes.processId.firstChange) {
      if (this.canvas && this.processMap.size > 0) {
        this.draw(this.canvas);
      }
    } else if (this.canvas && this.processMap.size > 0) {
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

  private nextProcessId = 0;

  private draw(canvas: ElementRef<HTMLCanvasElement>, clipX?: number, clipY?: number, clipW?: number, clipH?: number) {
    this.nextProcessId = 0;
    this.dynamicRoles = [];
    this.processOrder = [];
    this.functionOrder = [];
    this.processBoxMap.clear();
    this.functionBoxMap.clear();
    this.edges = [];
    this.collectRoles(this.processId);
    this.createGraph(canvas, this.processId, 50, 0);
    this.resize(canvas, clipX, clipY, clipW, clipH);
    if (!clipX && !clipY) {
      this.centerGraph(canvas);
    }
    this.drawGraph(canvas, clipX, clipY, clipW, clipH);
  }

  @HostListener('window:resize')
  onResize() {
    if (this.canvas) {
      this.resize(this.canvas);
      this.drawGraph(this.canvas);
    }
  }

  private centerGraph(canvas: ElementRef<HTMLCanvasElement>) {
    if (this.processOrder.length === 0) return;

    let maxDepth = -1;
    for (let box of this.processBoxMap.values()) {
      maxDepth = Math.max(maxDepth, box.depth);
    }

    const lastElement = this.processOrder[this.processOrder.length - 1];
    const graphWidth = (lastElement.x + lastElement.w);
    const graphHeight = (maxDepth + 1) * 100 + 140;

    const canvasWidth = canvas.nativeElement.width;
    const canvasHeight = canvas.nativeElement.height;

    // Center based on current zoom
    this.offsetX = (canvasWidth - graphWidth * this.zoomFactor) / 2;
    this.offsetY = (canvasHeight - graphHeight * this.zoomFactor) / 2;

    // Minimum padding
    if (this.offsetY < 50) this.offsetY = 50;
    if (this.offsetX < 50) this.offsetX = 50;
  }

  private collectRoles(id: string) {
    // Role swimlanes are removed, but we might still keep dynamicRoles empty or remove usage
    this.dynamicRoles = [];
  }

  private createGraph(canvas: ElementRef<HTMLCanvasElement>, id: string, x = 0, layer = 0): ProcessBox {
    const cx = canvas.nativeElement.getContext('2d');
    const mainProcess = new ProcessWithChildren();
    const process = this.processMap.get(id)

    if(!process) {
      console.error('Process with id ' + id + ' not found.');
      let processBox = new ProcessBox();
      processBox.id = this.nextProcessId++;
      processBox.processId = id;
      processBox.title = '!! MISSING !!';
      processBox.x = x;
      processBox.depth = layer;
      processBox.roleLayer = -1;
      processBox.role = '';
      processBox.w = this.canvasService.calcFunctionWidth(cx, 0, processBox.title, '');

      // Fix: Ensure we push the missing box so resize/draw works
      this.processBoxMap.set(processBox.id, processBox);
      this.processOrder.push(processBox);

      return processBox;
    }

    mainProcess.process = process;
    mainProcess.children = [];

    let processBox = new ProcessBox();
    processBox.id = this.nextProcessId++;
    processBox.title = process.name;
    processBox.processId = id;
    processBox.x = x;
    processBox.depth = layer;
    processBox.roleLayer = -1;
    processBox.role = typeof process.role === 'number' ? Role[process.role] : process.role;
    if (!process.steps || process.steps.length === 0) {
      processBox.w = this.canvasService.calcFunctionWidth(cx, 0, process.name, '');
    }

    if(process.steps && process.steps.length > 0) {
      processBox.w = 0;

      const childBoxes = new Map<string, ProcessBox>();
      for (let step of process.steps) {
        if(step.processReference) {
          const childBox = this.createGraph(canvas, step.processReference, x + processBox.w, layer + 1);
          childBoxes.set(step.processReference, childBox);
          processBox.w += childBox.w;
          processBox.w += 60; // Gap
        } else if (step.apiCallReference) {
          const apiCall = this.apiCallMap.get(step.apiCallReference);
          if (apiCall) {
            const subTitle = this.getSubTitle(apiCall);
            const childBox = this.createFunctionGraph(cx, apiCall, x + processBox.w, layer + 1);
            childBox.subTitle = subTitle;
            childBoxes.set(step.apiCallReference, childBox);
            processBox.w += childBox.w;
            processBox.w += 60;

            const inEdge = new Edge();
            inEdge.startId = processBox.id;
            inEdge.endId = childBox.id;

            const outEdge = new Edge();
            outEdge.startId = childBox.id;
            outEdge.endId = processBox.id;

            this.edges.push(inEdge, outEdge);
          }
        }
      }

      for (let step of process.steps) {
        if (step.successors) {
          for (let successor of step.successors) {
            const edge = new Edge();
            const startKey = step.processReference || step.apiCallReference;
            const endKey = successor.processReference || successor.apiCallReference;

            if (childBoxes.has(startKey) && childBoxes.has(endKey)) {
              const startBox = childBoxes.get(startKey);
              const endBox = childBoxes.get(endKey);
              edge.startId = startBox.id;
              edge.endId = endBox.id;
              edge.title = successor.edgeTitle;

              this.edges.push(edge);
            }
          }
        }
      }
      if (processBox.w > 0) {
        processBox.w -= 60;
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
    // We'll use mouseUp for selection to distinguish from drag
  }

  private totalDragDistance = 0;

  public onMouseDown(event: MouseEvent) {
    if (event.button === 0) { // Only left click for dragging
      this.isDragging = true;
      this.lastMouseX = event.clientX;
      this.lastMouseY = event.clientY;
      this.totalDragDistance = 0;
    }
  }

  public onMouseMove(event: MouseEvent) {
    if (this.isDragging) {
      const dx = event.clientX - this.lastMouseX;
      const dy = event.clientY - this.lastMouseY;
      this.totalDragDistance += Math.sqrt(dx * dx + dy * dy);
      this.offsetX += dx;
      this.offsetY += dy;
      this.lastMouseX = event.clientX;
      this.lastMouseY = event.clientY;
      this.drawGraph(this.canvas);
    }
  }

  openSelectedItem() {
    if (this.selectedProcess) {
      this.router.navigate(['process', 'edit', this.selectedProcess.id]);
    } else if (this.selectedApiCall) {
      this.router.navigate(['apiCall', 'edit', this.selectedApiCall.id]);
    }
  }

  openSelectedItemInNewTab() {
    if (this.selectedProcess) {
      window.open(`/#/process/edit/${this.selectedProcess.id}`, '_blank');
    } else if (this.selectedApiCall) {
      window.open(`/#/apiCall/edit/${this.selectedApiCall.id}`, '_blank');
    }
  }

  viewSelectedItem() {
    if (this.selectedProcess) {
      window.open(`/#/process/view/${this.selectedProcess.id}`, '_blank');
    }
  }

  public onMouseUp(event: MouseEvent) {
    if (event.button !== 0) return;
    this.isDragging = false;

    // Only select if it was a click, not a drag
    if (this.totalDragDistance > 5) return;

    // Selection logic
    const rect = this.canvas.nativeElement.getBoundingClientRect();
    const x = (event.clientX - rect.left - this.offsetX) / this.zoomFactor;
    const y = (event.clientY - rect.top - this.offsetY) / this.zoomFactor;

    let maxDepth = -1;
    for (let box of this.processBoxMap.values()) {
      maxDepth = Math.max(maxDepth, box.depth);
    }

    // Check process boxes
    for (let box of this.processOrder) {
      const boxY = box.depth * 100;
      if (x >= box.x && x <= box.x + box.w && y >= boxY && y <= boxY + 50) {
        if (this.selectedItem === box) return; // Already selected
        this.selectedItem = box;
        this.selectedProcess = this.processMap.get(box.processId);
        this.selectedApiCall = null;
        this.newCommentText = '';
        return;
      }
    }

    // Check api boxes
    const apiLaneIdx = maxDepth + 1;
    for (let box of this.functionBoxMap.values()) {
      const boxY = (apiLaneIdx) * 100 + 140 - 50 - 15; // Bottom alignment: laneY + laneHeight - boxHeight - padding
      if (x >= box.x && x <= box.x + box.w && y >= boxY && y <= boxY + 50) { // Height is 50 for functions (BOX_HEIGHT)
        if (this.selectedItem === box) return; // Already selected
        this.selectedItem = box;
        this.selectedApiCall = this.apiCallMap.get(box.processId); // processId holds apiCallId for these
        this.selectedProcess = null;
        this.newCommentText = '';
        return;
      }
    }

    this.selectedItem = null;
    this.selectedProcess = null;
    this.selectedApiCall = null;
    this.newCommentText = '';
  }

  public onWheel(event: WheelEvent) {
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      const zoomSpeed = 0.001;
      const oldZoom = this.zoomFactor;
      this.zoomFactor -= event.deltaY * zoomSpeed;
      this.zoomFactor = Math.min(Math.max(0.1, this.zoomFactor), 3);

      // Zoom towards mouse
      const rect = this.canvas.nativeElement.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;

      this.offsetX -= (mouseX - this.offsetX) * (this.zoomFactor / oldZoom - 1);
      this.offsetY -= (mouseY - this.offsetY) * (this.zoomFactor / oldZoom - 1);

      this.drawGraph(this.canvas);
    } else {
      // Normal scroll
      event.preventDefault(); // Also prevent default on normal scroll to keep it within canvas
      this.offsetY -= event.deltaY;
      this.offsetX -= event.deltaX;
      this.drawGraph(this.canvas);
    }
  }

  addComment() {
    if (!this.newCommentText.trim() || !this.selectedProcess) return;

    const user = this.authService.getCurrentUserValue();
    const username = user ? (user.displayName || user.username) : 'Anonymous';

    const newComment: Comment = {
      id: uuidv4(),
      timestamp: Date.now(),
      username: username,
      text: this.newCommentText.trim()
    };

    if (!this.selectedProcess.comments) {
      this.selectedProcess.comments = [];
    }

    this.selectedProcess.comments.unshift(newComment);
    this.processService.update(this.selectedProcess.id, this.selectedProcess).subscribe(() => {
      this.newCommentText = '';
    });
  }

  deleteComment(comment: Comment) {
    if (confirm('Are you sure you want to delete this comment?') && this.selectedProcess) {
      this.selectedProcess.comments = this.selectedProcess.comments.filter(c => c.id !== comment.id);
      this.processService.update(this.selectedProcess.id, this.selectedProcess).subscribe();
    }
  }

  private drawGraph(elem: ElementRef<HTMLCanvasElement>, clipX = -1, clipY = -1, clipW = -1, clipH = -1) {
    const cx = elem.nativeElement.getContext('2d');
      let maxDepth = -1;
    for (let box of this.processBoxMap.values()) {
      maxDepth = Math.max(maxDepth, box.depth);
    }

    if (this.processOrder.length === 0) {
        // Nothing to draw
        return;
    }

    const lastElement = this.processOrder[this.processOrder.length - 1];
    const width = (lastElement.x + lastElement.w);
    const canvasWidth = elem.nativeElement.width / this.zoomFactor;
    const canvasHeight = elem.nativeElement.height / this.zoomFactor;
    // Only paint until the last element, but at least 50px more
    const swimlaneWidth = width + 50;

    cx.save();
    cx.clearRect(0, 0, elem.nativeElement.width, elem.nativeElement.height);

    if(clipX >= 0 && clipY >= 0 && clipW >= 0 && clipH >= 0) {
      cx.translate(-clipX, 0);
      cx.beginPath();
      cx.rect(clipX, clipY, clipW, clipH);
      cx.clip();
    }
    cx.translate(this.offsetX, this.offsetY);
    cx.scale(this.zoomFactor, this.zoomFactor);


      let idx = 0;
      while(idx <= maxDepth) {
        this.canvasService.drawSwimlane(cx, 0, idx*100, swimlaneWidth, 90, 'P' + idx, idx)
        idx++;
      }

      this.canvasService.drawSwimlane(cx, 0, idx * 100, swimlaneWidth, 140, 'API', idx);

      for(let box of this.processOrder) {
        const boxY = box.depth * 100;
        const process = this.processMap.get(box.processId);
        const boxColor = process ? getRoleColor(process.role) : '#ffffff';
        const isDraft = process ? process.status === Status.Draft : false;

        this.canvasService.drawProcessStep(cx, box.x, boxY, box.w, 50, box.title, boxColor, box.role, isDraft)
      }

      for(let box of this.functionBoxMap.values()) {
          this.canvasService.drawFunction(cx, box.x, (idx)*100 + 140 - 50 - 15, box.title, box.subTitle, '#e0e050', box.w)
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
            //   box.depth * 100 + 25,
            //   endBox.x + 12,
            //   endBox.depth * 100 + 25, '');
          } else {
            let idx = Math.min(startIdx, endIdx);
            let end = Math.max(startIdx, endIdx);
            let yCorr = 0;
            while (idx <= end) {
              yCorrArray[idx] = !yCorrArray[idx] ? 1 : yCorrArray[idx] + 1;
              yCorr = Math.max(yCorrArray[idx], yCorr);
              idx++;
            }


            this.canvasService.drawArrowWithHeight(cx,
              startBox.x + startBox.w / 2 + 12,
              startBox.depth * 100,
              endBox.x + endBox.w / 2 + 12,
              endBox.depth * 100,
              yCorr * 10, edge.title);

          }


        } else if(this.processBoxMap.has(edge.startId) && this.functionBoxMap.has(edge.endId)) {
          // Function In
          let startBox = this.processBoxMap.get(edge.startId);
          let endBox = this.functionBoxMap.get(edge.endId);
          this.canvasService.drawArrow(cx, endBox.x + endBox.w/4, startBox.depth * 100 + 50,
            endBox.x + endBox.w/4, (idx)*100 + 140 - 50 - 15, edge.title);
        } else if(this.functionBoxMap.has(edge.startId) && this.processBoxMap.has(edge.endId)) {
          // Function Out
          let startBox = this.functionBoxMap.get(edge.startId);
          let endBox = this.processBoxMap.get(edge.endId);
          this.canvasService.drawArrow(cx, startBox.x + 3*startBox.w/4, (idx)*100 + 140 - 50 - 15,
            startBox.x + 3*startBox.w/4, endBox.depth * 100 + 50, edge.title);
        }
      }


      cx.restore();
  }

  private static getYForBox(box: ProcessBox, maxDepth: number) {
    return box.depth * 100;
  }

  private resize(canvas: ElementRef<HTMLCanvasElement>, clipX?: number, clipY?: number, clipW?: number, clipH?: number) {

    if (canvas === this.canvas && this.canvasContainer) {
      canvas.nativeElement.width = this.canvasContainer.nativeElement.clientWidth;
      canvas.nativeElement.height = this.canvasContainer.nativeElement.clientHeight;
      this.width = canvas.nativeElement.width;
      this.height = canvas.nativeElement.height;
      return;
    }

    if (this.processOrder.length === 0) {
      return;
    }

    const lastElement = this.processOrder[this.processOrder.length - 1];

    let maxDepth = -1;
    for (let box of this.processBoxMap.values()) {
      maxDepth = Math.max(maxDepth, box.depth);
    }

    const fullWidth = (lastElement.x + lastElement.w) * this.zoomFactor + 100;
    const fullHeight = (maxDepth + 1) * 100 * this.zoomFactor + 140 * this.zoomFactor + 100;

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
  role: string;
}

class Edge {
  startId: number;
  endId: number;
  title: string;
}

