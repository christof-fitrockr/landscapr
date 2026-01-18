import {Component, OnDestroy, OnInit} from '@angular/core';
import {first} from 'rxjs/operators';
import {CapabilityService} from '../services/capability.service';
import {Capability} from '../models/capability';
import {Subscription, forkJoin} from 'rxjs';
import {ActivatedRoute} from '@angular/router';
import {ApiCallService} from '../services/api-call.service';
import {ApiCall} from '../models/api-call';
import {BsModalService} from 'ngx-bootstrap/modal';
import {ToastrService} from 'ngx-toastr';
import {DeleteConfirmationDialogComponent} from '../components/delete-confirmation-dialog.component';
import {CapabilityDescriptionModalComponent} from '../components/capability-description-modal.component';

@Component({selector: 'app-capability-list', templateUrl: './capability-list.component.html', styleUrls: ['./capability-list.component.scss']})
export class CapabilityListComponent implements OnInit, OnDestroy {


  repoId: string;
  capabilities: Capability[];
  capabilityTree: any[] = [];
  searchText = '';
  showOrphansOnly = false;
  filterStatus: number = null;
  orphanIds: string[] = [];
  private subscription: Subscription;

  constructor(
    private capabilityService: CapabilityService,
    private apiCallService: ApiCallService,
    private activatedRoute: ActivatedRoute,
    private modalService: BsModalService,
    private toastr: ToastrService
  ) {
  }

  ngOnInit() {
    this.subscription = this.activatedRoute.parent.paramMap.subscribe(obs => {
      this.repoId = obs.get('repoId');
      this.refresh()
    });
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  refresh() {
    forkJoin([
        this.capabilityService.all(this.repoId).pipe(first()),
        this.apiCallService.all().pipe(first())
    ]).subscribe(([capabilities, apiCalls]) => {
      this.capabilities = capabilities;
      this.buildTree(apiCalls);
      this.calculateOrphans(apiCalls);
    });
  }

  private buildTree(apiCalls: ApiCall[]) {
    const map = new Map<string, any>();
    this.capabilities.forEach(cap => {
      map.set(cap.id, {
          ...cap,
          children: [],
          directSystemCount: cap.implementedBy?.length || 0,
          directFunctionCount: apiCalls.filter(api => api.capabilityId === cap.id).length,
          allSystems: new Set<string>(cap.implementedBy || []),
          recursiveFunctionCount: 0,
          recursiveSystemCount: 0
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

    // Recursive aggregation
    const aggregate = (node: any) => {
        let funcCount = node.directFunctionCount;
        const systems = new Set<string>(node.allSystems);

        node.children.forEach((child: any) => {
            aggregate(child);
            funcCount += child.recursiveFunctionCount;
            child.allSystems.forEach((s: string) => systems.add(s));
        });

        node.recursiveFunctionCount = funcCount;
        node.recursiveSystemCount = systems.size;
        node.allSystems = systems; // Store for parent aggregation
    };

    this.capabilityTree.forEach(root => aggregate(root));
  }

  private calculateOrphans(apiCalls: ApiCall[]) {
    this.orphanIds = [];
    const checkOrphan = (node: any) => {
      if (node.recursiveSystemCount === 0 && node.recursiveFunctionCount === 0) {
        this.orphanIds.push(node.id);
      }
      node.children.forEach(child => checkOrphan(child));
    };
    this.capabilityTree.forEach(root => checkOrphan(root));
  }

  onDelete(capability: Capability) {
    const modalRef = this.modalService.show(DeleteConfirmationDialogComponent, { class: 'modal-md' });
    modalRef.content.itemName = capability.name;
    modalRef.content.onClose.subscribe(result => {
      if (result) {
        this.capabilityService.delete(capability.id).subscribe(() => {
          this.toastr.success('Capability deleted');
          this.refresh();
        }, error => {
          this.toastr.error('Error deleting Capability');
        });
      }
    });
  }

  onShowDescription(capability: Capability) {
    this.modalService.show(CapabilityDescriptionModalComponent, {
      initialState: { capability },
      class: 'modal-dialog-centered'
    });
  }
}
