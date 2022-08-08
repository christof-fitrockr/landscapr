import {Component, OnInit} from '@angular/core';
import {CapabilityService} from '../services/capability.service';
import {Capability} from '../models/capability';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {ActivatedRoute, Router} from '@angular/router';
import {first, map, switchMap, tap} from 'rxjs/operators';
import {ToastrService} from 'ngx-toastr';
import {noop, Observable, Observer, of} from 'rxjs';
import {TypeaheadMatch} from 'ngx-bootstrap/typeahead';
import {ApplicationService} from '../services/application.service';
import {Application} from '../models/application';

@Component({templateUrl: './capability-edit-implemented-by.component.html'})
export class CapabilityEditImplementedByComponent implements OnInit {

  private capabilityId: string;
  capability: Capability;

  search?: string;
  suggestions$?: Observable<Application[]>;

  systemForm: FormGroup;
  systems: Application[];


  constructor(private capabilityService: CapabilityService, private systemService: ApplicationService, private formBuilder: FormBuilder,
              private route: ActivatedRoute, private router: Router, private toastr: ToastrService) {
  }

  typeaheadOnSelect(e: TypeaheadMatch): void {
    this.addImplementedBySystem(e.item.systemId);
  }

  ngOnInit() {

    this.systemForm = this.formBuilder.group({
      name: ['', Validators.required],
      description: [''],
    });

    this.refresh();

    this.suggestions$ = new Observable((observer: Observer<string | undefined>) => observer.next(this.search)).pipe(
      switchMap((query: string) => {
        if (query) {
          return this.systemService.byName(query).pipe(
            map((data: Application[]) => data || []),
            tap(() => noop, err => this.toastr.error(err && err.message || 'Something went wrong'))
          );
        }
        return of([]);
      })
    );
  }

  private refresh() {
    this.capabilityId = this.route.parent.snapshot.paramMap.get('id');
    if (this.capabilityId != null) {
      this.capabilityService.byId(this.capabilityId).pipe(first()).subscribe(capability => {
        this.capability = capability;

        // todo seqquential
        if(this.capability.implementedBy) {
          this.systems = [];
          this.capability.implementedBy.forEach(item => {
            this.systemService.byId(item).pipe(first()).subscribe(result => {
              this.systems.push(result);
            })
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
}
