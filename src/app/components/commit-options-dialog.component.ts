import { Component, OnInit } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-commit-options-dialog',
  templateUrl: './commit-options-dialog.component.html'
})
export class CommitOptionsDialogComponent implements OnInit {
  branches: any[] = [];
  currentBranch: string = 'main';
  fileName: string;

  // State
  isNewBranch: boolean = false;
  selectedBranch: string;
  baseBranch: string;
  newBranchName: string;
  createPr: boolean = true;
  prTitle: string;

  onClose: Subject<any>;

  constructor(public bsModalRef: BsModalRef) {}

  ngOnInit() {
    this.onClose = new Subject<any>();
    if (!this.selectedBranch) {
        this.selectedBranch = this.currentBranch;
    }
    if (!this.baseBranch) {
        this.baseBranch = this.currentBranch;
    }
    this.prTitle = `Update ${this.fileName || 'file'}`;
  }

  toggleNewBranch(isNew: boolean) {
    this.isNewBranch = isNew;
    if (isNew) {
      this.generateBranchName();
    }
  }

  generateBranchName() {
    const date = new Date();
    const timestamp = date.toISOString().replace(/[-:T]/g, '').slice(0, 14);
    this.newBranchName = `update-${timestamp}`;
  }

  confirm() {
    this.onClose.next({
        branchMode: this.isNewBranch ? 'new' : 'existing',
        branchName: this.isNewBranch ? this.newBranchName : this.selectedBranch,
        baseBranch: this.baseBranch,
        createPr: this.isNewBranch && this.createPr,
        prTitle: this.prTitle
    });
    this.onClose.complete();
    this.bsModalRef.hide();
  }

  cancel() {
    this.onClose.next(null);
    this.onClose.complete();
    this.bsModalRef.hide();
  }
}
