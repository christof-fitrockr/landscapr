import {Component, OnDestroy, OnInit} from '@angular/core';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {ActivatedRoute, Router} from '@angular/router';
import {first} from 'rxjs/operators';
import {ToastrService} from 'ngx-toastr';
import {CapabilityService} from '../services/capability.service';
import {Capability} from '../models/capability';
import {Subscription} from 'rxjs';
import {BsModalService} from 'ngx-bootstrap/modal';
import {CapabilitySelectorDialogComponent} from '../components/capability-selector-dialog/capability-selector-dialog.component';

@Component({selector: 'app-capability-edit', templateUrl: './capability-edit-base.component.html', styleUrls: ['./capability-edit-base.component.scss']})
export class CapabilityEditBaseComponent implements OnInit, OnDestroy {

  capabilityForm: FormGroup;
  capability: Capability;
  repoId: string;
  capabilityId: string;
  private subscription: Subscription;

  // Parent selector sources
  allCaps: Capability[] = [];
  parentOptions: Capability[] = [];

  constructor(private capabilityService: CapabilityService, private formBuilder: FormBuilder,
              private route: ActivatedRoute, private router: Router, private toastr: ToastrService,
              private modalService: BsModalService) {
  }

  ngOnInit() {
    this.capabilityForm = this.formBuilder.group({
      name: ['', Validators.required],
      status: [0],
      description: [''],
      tags: [],
      parentId: [null]
    });

    this.subscription = this.route.parent.paramMap.subscribe(obs => {
      if(this.repoId && this.repoId !== obs.get('repoId')) {
        this.router.navigateByUrl('/r/' + obs.get('repoId') + '/capability').then(() => {
        });
      } else {
        this.repoId = obs.get('repoId');
        this.refresh();
      }
    });
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  private buildParentOptions() {
    if (!this.capability) { this.parentOptions = this.allCaps; return; }
    const excludeIds = new Set<string>();
    // exclude self and descendants
    const byId = new Map<string, Capability>();
    for (const c of this.allCaps) { byId.set(c.id, c); }
    const visit = (id: string) => {
      excludeIds.add(id);
      const node = byId.get(id);
      if (!node) return;
      let children: Capability[] = [];
      if (node.childrenIds && node.childrenIds.length) {
        children = node.childrenIds.map(cid => byId.get(cid)).filter(Boolean) as Capability[];
      } else {
        children = this.allCaps.filter(a => a.parentId === id);
      }
      for (const ch of children) visit(ch.id);
    };
    if (this.capability && this.capability.id) {
      visit(this.capability.id);
    }
    this.parentOptions = this.allCaps.filter(c => !excludeIds.has(c.id));
  }

  private refresh() {
    this.capabilityId = this.route.parent.snapshot.paramMap.get('id');

    // Load all for parent selector first
    this.capabilityService.all(this.repoId).pipe(first()).subscribe(all => {
      this.allCaps = all || [];

      if (this.capabilityId != null) {
        this.capabilityService.byId(this.capabilityId).pipe(first()).subscribe(capability => {
          this.capability = capability;
          this.capabilityForm.patchValue(this.capability);
          this.buildParentOptions();
        });
      } else {
        this.capability = new Capability();
        this.buildParentOptions();
      }
    });
  }

  getParentName(): string {
    const parentId = this.capabilityForm.get('parentId').value;
    if (!parentId) return '(root)';
    const parent = this.allCaps.find(c => c.id === parentId);
    return parent ? parent.name : '(root)';
  }

  selectParent() {
    const modalRef = this.modalService.show(CapabilitySelectorDialogComponent, {
      initialState: {
        repoId: this.repoId,
        initialSelectedIds: this.capabilityForm.get('parentId').value ? [this.capabilityForm.get('parentId').value] : []
      },
      class: 'modal-lg'
    });
    modalRef.content.onClose.pipe(first()).subscribe((result: Set<string>) => {
      if (result && result.size > 0) {
        const id = Array.from(result)[0];
        if (id === this.capabilityId) {
          this.toastr.warning('A capability cannot be its own parent.');
          return;
        }
        this.capabilityForm.get('parentId').setValue(id);
      } else {
        this.capabilityForm.get('parentId').setValue(null);
      }
    });
  }

  onUpdate() {
    Object.keys(this.capabilityForm.controls).forEach(field => {
      const control = this.capabilityForm.get(field);
      control.markAsTouched({ onlySelf: true });
    });

    if (this.capabilityForm.valid) {
      this.capability = Object.assign(this.capability, this.capabilityForm.value);
      this.capability.repoId = this.repoId;
      if(!this.capabilityId) {
        this.capabilityService.create(this.capability).pipe(first()).subscribe(doc => {
          this.router.navigateByUrl('/capability/edit/' + doc.id).then(() => {
            this.toastr.info('Capability created successfully');
            this.refresh()
          });
        }, err => {
          this.toastr.error(err?.message || 'Error creating capability');
        });
      } else {
        this.capabilityService.update(this.capabilityId, this.capability).pipe(first()).subscribe(() => {
          this.toastr.info('Capability updated successfully');
          this.refresh();
        }, err => {
          this.toastr.error(err?.message || 'Error updating capability');
        });
      }
    }
  }

  delete() {
    this.capabilityService.delete(this.capabilityId).pipe(first()).subscribe(() => {
      this.router.navigate(['/capability']).then(() => {
        this.toastr.info('Capability deleted successfully');
      });
    })
  }
}
