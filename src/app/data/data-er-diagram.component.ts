import {Component, ElementRef, HostListener, OnInit, ViewChild} from '@angular/core';
import {DataService} from '../services/data.service';
import {ErDiagramService} from '../services/er-diagram.service';
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
  private draggingId: string | null = null;
  private dragOffset: {x: number, y: number} = {x: 0, y: 0};

  constructor(private dataService: DataService, private erService: ErDiagramService) {}

  ngOnInit() {
    this.dataService.all().pipe(first()).subscribe(data => {
      this.dataList = data;
      setTimeout(() => this.draw(), 100);
    });
  }

  draw() {
    if (this.canvasRef && this.dataList) {
      this.entityPositions = this.erService.drawErDiagram(this.canvasRef.nativeElement, this.dataList);
    }
  }

  onMouseDown(event: MouseEvent) {
    if (!this.entityPositions) return;

    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    for (const [id, pos] of this.entityPositions) {
      if (mouseX >= pos.x && mouseX <= pos.x + pos.w &&
          mouseY >= pos.y && mouseY <= pos.y + pos.h) {
        this.draggingId = id;
        this.dragOffset = {
          x: mouseX - pos.x,
          y: mouseY - pos.y
        };
        break;
      }
    }
  }

  @HostListener('window:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    if (this.draggingId && this.dataList) {
      const rect = this.canvasRef.nativeElement.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;

      const newX = mouseX - this.dragOffset.x;
      const newY = mouseY - this.dragOffset.y;

      const data = this.dataList.find(d => d.id === this.draggingId);
      if (data) {
        data.x = newX;
        data.y = newY;
        this.draw();
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
  }
}
