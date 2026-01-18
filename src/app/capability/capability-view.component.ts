import {Component, OnDestroy, OnInit} from '@angular/core';
import {CapabilityService} from '../services/capability.service';
import {first} from 'rxjs/operators';
import {Capability} from '../models/capability';
import {Subscription} from 'rxjs';
import {ActivatedRoute, Router} from '@angular/router';
import {BsModalService} from 'ngx-bootstrap/modal';
import {ToastrService} from 'ngx-toastr';
import {DeleteConfirmationDialogComponent} from '../components/delete-confirmation-dialog.component';

@Component({selector: 'app-capability-view', templateUrl: './capability-view.component.html'})
export class CapabilityViewComponent implements OnInit, OnDestroy {

  repoId: string;
  caps: Capability[];
  private subscription: Subscription;

  // For single view logic (if route has root id)
  rootId: string;
  capability: Capability;

  constructor(
    private capabilityService: CapabilityService,
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private modalService: BsModalService,
    private toastr: ToastrService
  ) {
  }

  ngOnInit() {
    this.subscription = this.activatedRoute.parent.paramMap.subscribe(obs => {
      this.repoId = obs.get('repoId');
      this.refresh()
    });

    // Check if we are viewing a specific capability (root)
    this.activatedRoute.paramMap.subscribe(params => {
        this.rootId = params.get('root');
        if (this.rootId) {
            this.capabilityService.byId(this.rootId).pipe(first()).subscribe(cap => {
                this.capability = cap;
            });
        }
    });
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  private refresh() {
    this.capabilityService.all(this.repoId).pipe(first()).subscribe(caps => {
      this.caps = caps;
    });
  }

  delete() {
    if (!this.capability) return;

    const modalRef = this.modalService.show(DeleteConfirmationDialogComponent, { class: 'modal-md' });
    modalRef.content.itemName = this.capability.name;
    modalRef.content.onClose.subscribe(result => {
      if (result) {
        this.capabilityService.delete(this.capability.id).subscribe(() => {
          this.toastr.success('Capability deleted');
          this.router.navigate(['/capability/list']);
        }, error => {
          this.toastr.error('Error deleting Capability');
        });
      }
    });
  }
}
