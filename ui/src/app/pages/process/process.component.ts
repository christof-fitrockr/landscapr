import {AfterViewInit, Component, ElementRef, ViewChild} from '@angular/core';
import {CanvasService} from '../../services/canvas.service';
import {ModelledProcess} from '../../models/process';
import {ProcessService} from '../../services/process.service';
import {ProcessDrawingService} from '../../services/process-drawing.service';
import * as yaml from 'js-yaml';



@Component({
  selector: 'app-process',
  templateUrl: './process.component.html',
  styleUrls: ['./process.component.scss']
})
export class ProcessComponent implements AfterViewInit {
    @ViewChild('canvas') public canvas: ElementRef;

    modelledProcess: ModelledProcess = new ModelledProcess();
    editorOptions = {theme: 'vs-dark', language: 'yaml'};
    showCode =  false;

    constructor(private processDrawingService: ProcessDrawingService, private canvasService: CanvasService, private processService: ProcessService) { }

    ngAfterViewInit() {
        this.refresh();
    }

    private drawProcess() {
        this.modelledProcess.process = yaml.load(this.modelledProcess.rawProcess);
        this.processDrawingService.drawProcess(this.canvas.nativeElement, this.modelledProcess.process);
    }

    codeChanged() {
        setTimeout(() => { this.drawProcess(); }, 500)
    }

    save() {
        // this.processService.deleteAll();
        // this.processService.create(this.modelledProcess);
    }

    refresh() {
        // this.processService.list().snapshotChanges().subscribe(results => {
        //
        //     if(results.length >= 1) {
        //         this.modelledProcess = JSON.parse(JSON.stringify(results[0].payload));
        //         this.drawProcess();
        //     }
        // })
    }

    zoomIn() {
        this.processDrawingService.zoom(0.1);
        this.drawProcess();
    }

    zoomOut() {
        this.processDrawingService.zoom(-0.1);
        this.drawProcess();
    }
}
