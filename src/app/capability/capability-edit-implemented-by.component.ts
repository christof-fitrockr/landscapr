import {Component, OnDestroy, OnInit} from '@angular/core';
import {CapabilityService} from '../services/capability.service';
import {Capability} from '../models/capability';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {ActivatedRoute, Router} from '@angular/router';
import {first, map, switchMap, tap} from 'rxjs/operators';
import {ToastrService} from 'ngx-toastr';
import {forkJoin, noop, Observable, Observer, of, Subscription} from 'rxjs';
import {TypeaheadMatch} from 'ngx-bootstrap/typeahead';
import {ApplicationService} from '../services/application.service';
import {Application} from '../models/application';
import {ApiCallService} from '../services/api-call.service';

@Component({templateUrl: './capability-edit-implemented-by.component.html'})
export class CapabilityEditImplementedByComponent implements OnInit, OnDestroy {

  private capabilityId: string;
  capability: Capability;
  search?: string;
  suggestions$?: Observable<Application[]>;
  systemForm: FormGroup;
  systems: Application[];
  private repoId: string;

  systemTree: any[] = [];
  searchText = '';
  showOrphansOnly = false;
  orphanIds: string[] = [];
  private subscription: Subscription;

  constructor(private capabilityService: CapabilityService, private systemService: ApplicationService, private formBuilder: FormBuilder,
              private route: ActivatedRoute, private router: Router, private toastr: ToastrService, private apiCallService: ApiCallService) {
  }

  typeaheadOnSelect(e: TypeaheadMatch): void {
    this.addImplementedBySystem(e.item.id);
  }

  ngOnInit() {

    this.systemForm = this.formBuilder.group({
      name: ['', Validators.required],
      description: [''],
    });

    this.subscription = this.route.parent.paramMap.subscribe(obs => {
      this.repoId = obs.get('repoId');
      this.refresh();
      this.refreshTree();
    });

    this.suggestions$ = new Observable((observer: Observer<string | undefined>) => observer.next(this.search)).pipe(
      switchMap((query: string) => {
        if (query) {
          return this.systemService.byName(this.repoId, query).pipe(
            map((data: Application[]) => data || []),
            tap(() => noop, err => this.toastr.error(err && err.message || 'Something went wrong'))
          );
        }
        return of([]);
      })
    );
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  private refresh() {
    this.capabilityId = this.route.parent.snapshot.paramMap.get('id');
    if (this.capabilityId) {
      this.capabilityService.byId(this.capabilityId).pipe(first()).subscribe(capability => {
        this.capability = capability;

        // todo seqquential
        if(this.capability.implementedBy) {
          this.systems = [];
          this.capability.implementedBy.forEach(item => {
            if(item) {
              this.systemService.byId(item).pipe(first()).subscribe(result => {
                this.systems.push(result);
              })
            }
          });
        }

      });
    }
  }

  onUpdate() {
    this.capabilityService.update(this.capabilityId, this.capability).pipe(first()).subscribe(() => {
      this.toastr.info('Capability updated successfully');
      this.refresh();
    });
  }

  createApiCall() {
    Object.keys(this.systemForm.controls).forEach(field => {
      const control = this.systemForm.get(field);
      control.markAsTouched({ onlySelf: true });
    });

    if (this.systemForm.valid) {
      let system = new Application();
      system = Object.assign(system, this.systemForm.value);
      this.systemService.create(system).pipe(first()).subscribe(system => {
        this.addImplementedBySystem(system.id);
      });
    }
  }

  private addImplementedBySystem(id: string) {
    if(!this.capability.implementedBy) {
      this.capability.implementedBy = [];
    }
    this.capability.implementedBy.push(id);
    this.onUpdate();
  }

  delete(capabilityId: string) {
    if (this.capability.implementedBy !== null) {
      const index = this.capability.implementedBy.findIndex(item => item === capabilityId);
      if (index >= 0) {
        this.capability.implementedBy.splice(index, 1);
        this.onUpdate();
      }
    }
  }

  refreshTree() {
    forkJoin([
      this.systemService.all(this.repoId).pipe(first()),
      this.capabilityService.all(this.repoId).pipe(first()),
      this.apiCallService.all().pipe(first())
    ]).subscribe(([systems, capabilities, apiCalls]) => {
      this.calculateOrphans(systems, apiCalls);
      this.buildTree(systems, capabilities, apiCalls);
    });
  }

  private buildTree(systems: Application[], capabilities: any[], apiCalls: any[]) {
    const systemsWithCounts = systems.map(sys => {
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
    groups.forEach((systemsInGroup, clusterName) => {
      this.systemTree.push({
        name: clusterName,
        isCluster: true,
        systems: systemsInGroup.sort((a, b) => a.name.localeCompare(b.name)),
        capabilityCount: systemsInGroup.reduce((acc, sys) => acc + sys.capabilityCount, 0),
        apiCount: systemsInGroup.reduce((acc, sys) => acc + sys.apiCount, 0)
      });
    });

    this.systemTree.sort((a, b) => {
      if (a.name === 'No Cluster') return 1;
      if (b.name === 'No Cluster') return -1;
      return a.name.localeCompare(b.name);
    });
  }

  private calculateOrphans(systems: Application[], apiCalls: any[]) {
    const referencedSystemIds = new Set<string>();
    apiCalls.forEach(api => {
      if (api.implementedBy) {
        api.implementedBy.forEach(id => referencedSystemIds.add(id));
      }
    });
    this.orphanIds = systems
      .filter(sys => !referencedSystemIds.has(sys.id))
      .map(sys => sys.id);
  }

  selectSystem(system: any) {
    this.addImplementedBySystem(system.id);
  }
}
