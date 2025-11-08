import { Component, Input, OnInit } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { Process } from '../../models/process';
import { ProcessService } from '../../services/process.service';

@Component({
  selector: 'app-process-quick-view-modal',
  templateUrl: './process-quick-view-modal.component.html',
})
export class ProcessQuickViewModalComponent implements OnInit {
  @Input() processId: string;
  process: Process | null = null;

  constructor(public bsModalRef: BsModalRef, private processService: ProcessService) {}

  ngOnInit(): void {
    if (this.processId) {
      this.processService.byId(this.processId).subscribe(p => this.process = p);
    }
  }

  close(): void {
    this.bsModalRef.hide();
  }
}
