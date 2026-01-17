import {Component, OnInit} from '@angular/core';
import {BsModalRef} from 'ngx-bootstrap/modal';
import {Subject} from 'rxjs';
import {CapabilityService} from '../../services/capability.service';
import {Capability} from '../../models/capability';

@Component({
  selector: 'app-capability-selector-dialog',
  templateUrl: './capability-selector-dialog.component.html'
})
export class CapabilitySelectorDialogComponent implements OnInit {
  repoId: string;
  initialSelectedIds: string[] = [];
  selectedIds: Set<string>;

  onClose: Subject<Set<string>> = new Subject<Set<string>>();

  capabilityTree: any[] = [];
  searchText = '';
  loading = true;

  constructor(public bsModalRef: BsModalRef, private capabilityService: CapabilityService) {}

  ngOnInit() {
    this.selectedIds = new Set(this.initialSelectedIds);
    this.loadCapabilities();
  }

  loadCapabilities() {
    this.capabilityService.all(this.repoId).subscribe(capabilities => {
      this.buildTree(capabilities);
      this.loading = false;
    });
  }

  private buildTree(capabilities: Capability[]) {
    const map = new Map<string, any>();
    capabilities.forEach(cap => {
      map.set(cap.id, {
        ...cap,
        children: []
      });
    });

    this.capabilityTree = [];
    map.forEach(cap => {
      if (cap.parentId && map.has(cap.parentId)) {
        map.get(cap.parentId).children.push(cap);
      } else {
        this.capabilityTree.push(cap);
      }
    });
  }

  confirm() {
    this.onClose.next(this.selectedIds);
    this.bsModalRef.hide();
  }

  decline() {
    this.bsModalRef.hide();
  }
}
