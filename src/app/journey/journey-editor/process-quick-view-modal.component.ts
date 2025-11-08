import { Component, Input } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { Router } from '@angular/router';

@Component({
  selector: 'app-process-quick-view-modal',
  templateUrl: './process-quick-view-modal.component.html',
})
export class ProcessQuickViewModalComponent {
  @Input() processId: string | null = null;

  constructor(public bsModalRef: BsModalRef, private router: Router) {}

  openDetails(): void {
    if (!this.processId) { return; }
    this.router.navigate(['/process/edit', this.processId, 'base']).then(() => this.close());
  }

  openFullView(): void {
    if (!this.processId) { return; }
    this.router.navigate(['/process/view', this.processId]).then(() => this.close());
  }

  close(): void {
    this.bsModalRef.hide();
  }
}
