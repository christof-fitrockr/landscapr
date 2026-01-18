import {Component, ElementRef, OnInit, ViewChild} from '@angular/core';
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
            <canvas #erCanvas width="2000" height="1500"></canvas>
         </div>
       </div>
    </div>
  `
})
export class DataErDiagramComponent implements OnInit {

  @ViewChild('erCanvas') canvasRef: ElementRef<HTMLCanvasElement>;
  dataList: Data[];

  constructor(private dataService: DataService, private erService: ErDiagramService) {}

  ngOnInit() {
    this.dataService.all().pipe(first()).subscribe(data => {
      this.dataList = data;
      setTimeout(() => this.draw(), 100);
    });
  }

  draw() {
    if (this.canvasRef && this.dataList) {
      this.erService.drawErDiagram(this.canvasRef.nativeElement, this.dataList);
    }
  }
}
