import {Component, EventEmitter, Input, Output} from '@angular/core';
import {Process, ProcessWithStep, StepSuccessor} from '../models/process';


@Component({
  selector: 'app-process-overview',
  templateUrl: './process-overview.component.html'
})
export class ProcessOverviewComponent  {


  @Input() processWithStep: ProcessWithStep;
  @Input() processes: Process[];
  @Output() updateEmitter = new EventEmitter<ProcessWithStep>();
  @Output() deleteEmitter = new EventEmitter<string>();


  constructor() { }


  delete() {
    this.deleteEmitter.emit(this.processWithStep.process.id);
  }

  addSuccessor() {
    if(!this.processWithStep.stepDetails.successors) {
      this.processWithStep.stepDetails.successors = [];
    }
    this.processWithStep.stepDetails.successors.push(new StepSuccessor());
    this.updateEmitter.emit(this.processWithStep);
  }

  deleteSuccessor(idx: number) {
    this.processWithStep.stepDetails.successors.splice(idx, 1);
    this.updateEmitter.emit(this.processWithStep);
  }

  onUpdate() {
    this.updateEmitter.emit(this.processWithStep);
  }
}
