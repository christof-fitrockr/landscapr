import {Component, OnDestroy, OnInit} from '@angular/core';
import {first} from 'rxjs/operators';
import {ApplicationService} from '../services/application.service';
import {Application} from '../models/application';
import {ActivatedRoute} from '@angular/router';
import {Subscription, forkJoin} from 'rxjs';
import {ApiCallService} from '../services/api-call.service';
import {CapabilityService} from '../services/capability.service';
import {BsModalService} from 'ngx-bootstrap/modal';
import {ToastrService} from 'ngx-toastr';
import {DeleteConfirmationDialogComponent} from '../components/delete-confirmation-dialog.component';
import {SystemDescriptionModalComponent} from '../components/system-description-modal.component';

@Component({selector: 'app-system-list', templateUrl: './system-list.component.html', styleUrls: ['./system-list.component.scss']})
export class SystemListComponent implements OnInit, OnDestroy {

  repoId: string;
  systems: Application[];
  systemTree: any[] = [];
  searchText = '';
  showOrphansOnly = false;
  filterStatus: number = null;
  orphanIds: string[] = [];
  private subscription: Subscription;

  constructor(
    private systemService: ApplicationService,
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
      this.systemService.all(this.repoId).pipe(first()),
      this.capabilityService.all(this.repoId).pipe(first()),
      this.apiCallService.all().pipe(first())
    ]).subscribe(([systems, capabilities, apiCalls]) => {
      this.systems = systems;
      this.calculateOrphans(apiCalls);
      this.buildTree(capabilities, apiCalls);
    });
  }

  private buildTree(capabilities: any[], apiCalls: any[]) {
    const systemsWithCounts = this.systems.map(sys => {
      return {
        ...sys,
        capabilityCount: capabilities.filter(cap => cap.implementedBy?.includes(sys.id)).length,
        apiCount: apiCalls.filter(api => api.implementedBy?.includes(sys.id)).length
      };
    });

    const groups = new Map<string, any[]>();
    systemsWithCounts.forEach(sys => {
      const cluster = sys.systemCluster || 'No Cluster';
      if (!groups.has(cluster)) {
        groups.set(cluster, []);
      }
      groups.get(cluster).push(sys);
    });

    this.systemTree = [];
    groups.forEach((systems, clusterName) => {
      this.systemTree.push({
        name: clusterName,
        isCluster: true,
        systems: systems.sort((a, b) => a.name.localeCompare(b.name)),
        capabilityCount: systems.reduce((acc, sys) => acc + sys.capabilityCount, 0),
        apiCount: systems.reduce((acc, sys) => acc + sys.apiCount, 0)
      });
    });

    this.systemTree.sort((a, b) => {
      if (a.name === 'No Cluster') return 1;
      if (b.name === 'No Cluster') return -1;
      return a.name.localeCompare(b.name);
    });
  }

  private calculateOrphans(apiCalls: any[]) {
    const referencedSystemIds = new Set<string>();
    apiCalls.forEach(api => {
      if (api.implementedBy) {
        api.implementedBy.forEach(id => referencedSystemIds.add(id));
      }
    });
    this.orphanIds = this.systems
      .filter(sys => !referencedSystemIds.has(sys.id))
      .map(sys => sys.id);
  }

  onDelete(system: Application) {
    const modalRef = this.modalService.show(DeleteConfirmationDialogComponent, { class: 'modal-md' });
    modalRef.content.itemName = system.name;
    modalRef.content.onClose.subscribe(result => {
      if (result) {
        this.systemService.delete(system.id).subscribe(() => {
          this.toastr.success('System deleted');
          this.refresh();
        }, error => {
          this.toastr.error('Error deleting System');
        });
      }
    });
  }

  onShowDescription(system: Application) {
    this.modalService.show(SystemDescriptionModalComponent, {
      initialState: { system },
      class: 'modal-dialog-centered'
    });
  }
}
