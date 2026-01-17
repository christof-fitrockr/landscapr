import {Component, OnDestroy, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {first, switchMap} from 'rxjs/operators';
import {ApplicationService} from '../services/application.service';
import {Application} from '../models/application';
import {Capability} from '../models/capability';
import {CapabilityService} from '../services/capability.service';
import {forkJoin, Observable, of, Subscription} from 'rxjs';
import {BsModalService} from 'ngx-bootstrap/modal';
import {CapabilitySelectorDialogComponent} from '../components/capability-selector-dialog/capability-selector-dialog.component';

@Component({templateUrl: './system-edit-implements.component.html'})
export class SystemEditImplementsComponent implements OnInit, OnDestroy {

  systemId: string;
  system: Application;
  implementedCapabilities: Capability[];
  repoId: string;
  private subscription: Subscription;

  constructor(
    private systemService: ApplicationService,
    private capabilityService: CapabilityService,
    private route: ActivatedRoute,
    private router: Router,
    private modalService: BsModalService
  ) {}

  ngOnInit() {
    this.subscription = this.route.parent.paramMap.subscribe(obs => {
      this.systemId = obs.get('id');
      if(this.repoId && this.repoId !== obs.get('repoId')) {
        this.router.navigateByUrl('/r/' + obs.get('repoId') + '/system').then(() => {
        });
      } else {
        this.repoId = obs.get('repoId');
        this.refresh();
      }
    });
  }

  private refresh() {
    if (this.systemId) {
      this.systemService.byId(this.systemId).pipe(first()).subscribe(system => {
        this.system = system;
      });
      this.capabilityService.byImplementation(this.systemId).pipe(first()).subscribe(capabilities => {
        this.implementedCapabilities = capabilities;
      });
    }
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  openAddModal() {
    const initialState = {
      repoId: this.repoId,
      initialSelectedIds: this.implementedCapabilities.map(c => c.id)
    };
    const modalRef = this.modalService.show(CapabilitySelectorDialogComponent, {initialState, class: 'modal-lg'});
    modalRef.content.onClose.subscribe((result: Set<string>) => {
      this.handleSelectionChange(result);
    });
  }

  handleSelectionChange(newSelectedIds: Set<string>) {
    const currentIds = new Set(this.implementedCapabilities.map(c => c.id));
    const toAdd = [...newSelectedIds].filter(id => !currentIds.has(id));
    const toRemove = [...currentIds].filter(id => !newSelectedIds.has(id));

    if (toAdd.length === 0 && toRemove.length === 0) return;

    const tasks: Observable<any>[] = [];

    // Remove logic
    toRemove.forEach(id => {
      const cap = this.implementedCapabilities.find(c => c.id === id);
      if (cap && cap.implementedBy) {
        cap.implementedBy = cap.implementedBy.filter(sysId => sysId !== this.systemId);
        tasks.push(this.capabilityService.update(cap.id, cap));
      }
    });

    // Add logic
    if (toAdd.length > 0) {
      const addObs = this.capabilityService.byIds(toAdd).pipe(
        first(),
        switchMap(caps => {
          const updateTasks = caps.map(cap => {
            if (!cap.implementedBy) cap.implementedBy = [];
            if (!cap.implementedBy.includes(this.systemId)) {
              cap.implementedBy.push(this.systemId);
              return this.capabilityService.update(cap.id, cap);
            }
            return of(cap);
          });
          return forkJoin(updateTasks);
        })
      );
      tasks.push(addObs);
    }

    forkJoin(tasks).subscribe(() => {
      this.refresh();
    });
  }

  removeCapability(capabilityId: string) {
    const cap = this.implementedCapabilities.find(c => c.id === capabilityId);
    if (cap && cap.implementedBy) {
      cap.implementedBy = cap.implementedBy.filter(sysId => sysId !== this.systemId);
      this.capabilityService.update(cap.id, cap).pipe(first()).subscribe(() => {
        this.refresh();
      });
    }
  }
}
