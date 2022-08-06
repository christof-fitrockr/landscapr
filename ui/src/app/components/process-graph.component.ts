import {AfterViewChecked, Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {Process} from '../models/process';
import * as shape from 'd3-shape';
import {Layout} from '@swimlane/ngx-graph';
import {DagreNodesOnlyLayout} from './customDagreNodesOnly';
import {ProcessService} from '../services/process.service';
import {first} from 'rxjs/operators';
import {Subject} from 'rxjs';


@Component({
  selector: 'app-process-graph',
  templateUrl: './process-graph.component.html'
})
export class ProcessGraphComponent implements OnInit, AfterViewChecked {

  @Input() processId: string;
  @Output() processClicked = new EventEmitter<string>();

  public curve: any = shape.curveLinear;
  public layout: Layout = new DagreNodesOnlyLayout();
  hierarchicalGraph = {nodes: [], links: []}

  process: Process;
  subProcesses: Process[];
  centerGraph$ = new Subject<boolean>();


  constructor(private processService: ProcessService) {
  }

  ngOnInit() {
    this.refresh();
  }

  ngAfterViewChecked() {
    // this.centerGraph$.next(true);
  }

  private refresh() {
    this.processService.getProcessById(this.processId).pipe(first()).subscribe(process => {
      this.process = process;

      const ids = [];
      if(this.process.steps) {
        for (let item of this.process.steps) {
          ids.push(item.processReference);
        }
        this.processService.getProcessByIds(ids).pipe(first()).subscribe(results => {
          this.subProcesses = results;
          this.showGraph();
        });
      }
    });
  }

  showGraph() {
    this.hierarchicalGraph.nodes = [];
    for(let subprocess of this.subProcesses) {
      this.hierarchicalGraph.nodes.push({id: subprocess.processId, label: subprocess.name})
    }

    if(this.process.steps) {
      for (let step of this.process.steps) {
        if (step.successor) {
          for (let reference of step.successor) {
            this.hierarchicalGraph.links.push({
              source: step.processReference,
              target: reference.processReference,
              label: reference.edgeTitle
            });
          }
        }
      }
    }

    this.centerGraph$.next(true);
  }

  onClick(node: any) {
    this.processClicked.emit(node.id);
  }
}
