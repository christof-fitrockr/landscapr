import {Component, ElementRef, HostListener, OnInit, ViewChild} from '@angular/core';
import {DataService} from '../services/data.service';
import {ErDiagramService, EdgeMetadata} from '../services/er-diagram.service';
import {Data} from '../models/data';
import {first} from 'rxjs/operators';

@Component({
  selector: 'app-data-er-diagram',
  template: `
    <div class="container-fluid mt-3">
       <div class="d-flex justify-content-between align-items-center mb-3">
          <h2 class="text-gray-400 font-weight-bold text-uppercase">ER Diagram</h2>
          <button class="btn btn-outline-secondary" routerLink="/data/list"><i class="fas fa-arrow-left"></i> Back</button>
       </div>
       <div class="card shadow-sm">
         <div class="card-body overflow-auto p-0">
            <canvas #erCanvas width="2000" height="1500" (mousedown)="onMouseDown($event)"></canvas>
         </div>
       </div>
    </div>
  `
})
export class DataErDiagramComponent implements OnInit {

  @ViewChild('erCanvas') canvasRef: ElementRef<HTMLCanvasElement>;
  dataList: Data[];

  private entityPositions: Map<string, {x: number, y: number, w: number, h: number}>;
  private edges: EdgeMetadata[] = [];
  private draggingId: string | null = null;
  private dragOffset: {x: number, y: number} = {x: 0, y: 0};

  // Edge editing
  selectedEdge: EdgeMetadata | null = null;
  private draggingHandleIndex: number | null = null;

  constructor(private dataService: DataService, private erService: ErDiagramService) {}

  ngOnInit() {
    this.dataService.all().pipe(first()).subscribe(data => {
      this.dataList = data;
      setTimeout(() => this.draw(), 100);
    });
  }

  draw() {
    if (this.canvasRef && this.dataList) {
      const result = this.erService.drawErDiagram(this.canvasRef.nativeElement, this.dataList);
      this.entityPositions = result.entities;
      this.edges = result.edges;

      // Update selected edge reference
      if (this.selectedEdge) {
        const fresh = this.edges.find(e => e.sourceDataId === this.selectedEdge.sourceDataId && e.itemId === this.selectedEdge.itemId);
        if (fresh) {
          this.selectedEdge = fresh;
          this.drawEdgeOverlays(fresh);
        } else {
          this.selectedEdge = null;
        }
      }
    }
  }

  private drawEdgeOverlays(edge: EdgeMetadata) {
    const cx = this.canvasRef.nativeElement.getContext('2d');
    cx.save();

    // Draw handles (waypoints) - skip start/end
    for (let i = 1; i < edge.points.length - 1; i++) {
        const pt = edge.points[i];
        cx.beginPath();
        cx.arc(pt.x, pt.y, 6, 0, 2 * Math.PI);
        cx.fillStyle = '#007bff';
        cx.strokeStyle = '#fff';
        cx.lineWidth = 2;
        cx.fill();
        cx.stroke();
    }

    // Draw Side Toggles
    const startPt = edge.points[0];
    const endPt = edge.points[edge.points.length - 1];

    cx.fillStyle = '#ffc107';
    cx.strokeStyle = '#333';
    cx.lineWidth = 1;
    cx.fillRect(startPt.x - 6, startPt.y - 6, 12, 12);
    cx.strokeRect(startPt.x - 6, startPt.y - 6, 12, 12);

    cx.fillRect(endPt.x - 6, endPt.y - 6, 12, 12);
    cx.strokeRect(endPt.x - 6, endPt.y - 6, 12, 12);

    cx.restore();
  }

  onMouseDown(event: MouseEvent) {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    // 1. Check Edge Interactions (if selected)
    if (this.selectedEdge) {
        // Toggles
        const startPt = this.selectedEdge.points[0];
        if (Math.abs(mouseX - startPt.x) < 10 && Math.abs(mouseY - startPt.y) < 10) {
             this.toggleSide(this.selectedEdge, 'source');
             return;
        }
        const endPt = this.selectedEdge.points[this.selectedEdge.points.length - 1];
        if (Math.abs(mouseX - endPt.x) < 10 && Math.abs(mouseY - endPt.y) < 10) {
             this.toggleSide(this.selectedEdge, 'target');
             return;
        }

        // Handles
        for (let i = 1; i < this.selectedEdge.points.length - 1; i++) {
            const pt = this.selectedEdge.points[i];
             if (Math.abs(mouseX - pt.x) < 10 && Math.abs(mouseY - pt.y) < 10) {
                 this.draggingHandleIndex = i;
                 this.materializeEdgePoints(this.selectedEdge); // Ensure points exist in model
                 return;
             }
        }
    }

    // 2. Check Entities
    if (this.entityPositions) {
      for (const [id, pos] of this.entityPositions) {
        if (mouseX >= pos.x && mouseX <= pos.x + pos.w &&
            mouseY >= pos.y && mouseY <= pos.y + pos.h) {
          this.draggingId = id;
          this.dragOffset = {
            x: mouseX - pos.x,
            y: mouseY - pos.y
          };
          this.selectedEdge = null; // Deselect edge when clicking entity
          this.draw();
          return;
        }
      }
    }

    // 3. Check Edges (Select)
    const clickedEdge = this.findEdgeAt(mouseX, mouseY);
    if (clickedEdge) {
        this.selectedEdge = clickedEdge;
    } else {
        this.selectedEdge = null;
    }
    this.draw();
  }

  onDoubleClick(event: MouseEvent) {
      const rect = this.canvasRef.nativeElement.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;

      if (this.selectedEdge) {
          // Double click handle -> Remove
          for (let i = 1; i < this.selectedEdge.points.length - 1; i++) {
               const pt = this.selectedEdge.points[i];
               if (Math.abs(mouseX - pt.x) < 10 && Math.abs(mouseY - pt.y) < 10) {
                   this.materializeEdgePoints(this.selectedEdge);
                   this.removeWaypoint(this.selectedEdge, i);
                   return;
               }
          }

          // Double click segment -> Add
           for (let i = 0; i < this.selectedEdge.points.length - 1; i++) {
              const p1 = this.selectedEdge.points[i];
              const p2 = this.selectedEdge.points[i+1];
              if (this.distToSegment({x: mouseX, y: mouseY}, p1, p2) < 5) {
                  this.materializeEdgePoints(this.selectedEdge);
                  this.addWaypoint(this.selectedEdge, i, mouseX, mouseY);
                  return;
              }
          }
      }
  }

  @HostListener('window:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    if (this.draggingId && this.dataList) {
      const newX = mouseX - this.dragOffset.x;
      const newY = mouseY - this.dragOffset.y;

      const data = this.dataList.find(d => d.id === this.draggingId);
      if (data) {
        data.x = newX;
        data.y = newY;
        this.draw();
      }
    } else if (this.draggingHandleIndex !== null && this.selectedEdge) {
        const data = this.dataList.find(d => d.id === this.selectedEdge.sourceDataId);
        const item = data?.items.find(i => i.id === this.selectedEdge.itemId);
        if (item && item.edgePoints) {
             // Handle index i corresponds to edgePoints[i-1]
             const ptIndex = this.draggingHandleIndex - 1;
             if (ptIndex >= 0 && ptIndex < item.edgePoints.length) {
                 item.edgePoints[ptIndex] = {x: mouseX, y: mouseY};
                 this.draw();
             }
        }
    }
  }

  @HostListener('window:mouseup', ['$event'])
  onMouseUp(event: MouseEvent) {
    if (this.draggingId) {
      const data = this.dataList.find(d => d.id === this.draggingId);
      if (data) {
        this.dataService.update(data.id, data).subscribe();
      }
      this.draggingId = null;
    }

    if (this.draggingHandleIndex !== null) {
        if (this.selectedEdge) {
             const data = this.dataList.find(d => d.id === this.selectedEdge.sourceDataId);
             if (data) this.dataService.update(data.id, data).subscribe();
        }
        this.draggingHandleIndex = null;
    }
  }

  // Helpers
  private toggleSide(edge: EdgeMetadata, type: 'source' | 'target') {
      const data = this.dataList.find(d => d.id === edge.sourceDataId);
      const item = data?.items.find(i => i.id === edge.itemId);
      if (data && item) {
          if (type === 'source') item.sourceSide = (item.sourceSide === 'left') ? 'right' : 'left';
          else item.targetSide = (item.targetSide === 'left') ? 'right' : 'left';
          this.dataService.update(data.id, data).subscribe(() => this.draw());
      }
  }

  private materializeEdgePoints(edge: EdgeMetadata) {
      const data = this.dataList.find(d => d.id === edge.sourceDataId);
      const item = data?.items.find(i => i.id === edge.itemId);
      if (item && (!item.edgePoints || item.edgePoints.length === 0)) {
          // edge.points includes start and end. edgePoints should be just intermediate.
          item.edgePoints = edge.points.slice(1, -1);
      }
  }

  private addWaypoint(edge: EdgeMetadata, segmentIndex: number, x: number, y: number) {
       const data = this.dataList.find(d => d.id === edge.sourceDataId);
       const item = data?.items.find(i => i.id === edge.itemId);
       if (item && item.edgePoints) {
           item.edgePoints.splice(segmentIndex, 0, {x, y});
           this.dataService.update(data.id, data).subscribe(() => this.draw());
       }
  }

  private removeWaypoint(edge: EdgeMetadata, pointIndex: number) {
       const data = this.dataList.find(d => d.id === edge.sourceDataId);
       const item = data?.items.find(i => i.id === edge.itemId);
       if (item && item.edgePoints) {
           // pointIndex is index in edge.points.
           // maps to pointIndex-1 in edgePoints.
           item.edgePoints.splice(pointIndex - 1, 1);
           // If empty, maybe set to undefined? Or keep empty array?
           // If empty, auto-layout kicks in. If we want straight line, keep empty array?
           // Service logic: if (item.edgePoints && item.edgePoints.length > 0).
           // So if we remove all, it reverts to auto-layout.
           // To support manual straight line, we might need a flag or logic change.
           // But usually users want auto-layout if they delete everything.
           this.dataService.update(data.id, data).subscribe(() => this.draw());
       }
  }

  private findEdgeAt(x: number, y: number): EdgeMetadata | null {
      for (const edge of this.edges) {
          for (let i = 0; i < edge.points.length - 1; i++) {
              const p1 = edge.points[i];
              const p2 = edge.points[i+1];
              if (this.distToSegment({x,y}, p1, p2) < 5) {
                  return edge;
              }
          }
      }
      return null;
  }

  private distToSegment(p: {x: number, y: number}, v: {x: number, y: number}, w: {x: number, y: number}) {
      const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
      if (l2 === 0) return Math.sqrt((p.x - v.x) ** 2 + (p.y - v.y) ** 2);
      let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
      t = Math.max(0, Math.min(1, t));
      return Math.sqrt((p.x - (v.x + t * (w.x - v.x))) ** 2 + (p.y - (v.y + t * (w.y - v.y))) ** 2);
  }
}
