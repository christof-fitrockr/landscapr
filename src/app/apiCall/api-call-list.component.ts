import {Component, OnDestroy, OnInit} from '@angular/core';
import {first} from 'rxjs/operators';
import {ApiCallService} from '../services/api-call.service';
import {ApiCall, ApiType} from '../models/api-call';
import {Subscription, forkJoin} from 'rxjs';
import {ActivatedRoute} from '@angular/router';
import {ProcessService} from '../services/process.service';
import {BsModalService} from 'ngx-bootstrap/modal';
import {ToastrService} from 'ngx-toastr';
import {DeleteConfirmationDialogComponent} from '../components/delete-confirmation-dialog.component';
import {ApiCallDescriptionModalComponent} from '../components/api-call-description-modal.component';

@Component({selector: 'app-api-call-list', templateUrl: './api-call-list.component.html', styleUrls: ['./api-call-list.component.scss']})
export class ApiCallListComponent implements OnInit, OnDestroy {

  constructor(
    private apiCallService: ApiCallService,
    private processService: ProcessService,
    private activatedRoute: ActivatedRoute,
    private modalService: BsModalService,
    private toastr: ToastrService
  ) {
  }

  repoId: string;
  apiCalls: ApiCall[];
  searchText: string;
  showOrphansOnly: boolean = false;
  filterStatus: number = null;
  orphanIds: string[] = [];
  apiCallToDelete: ApiCall;
  filterType: ApiType = null;
  ApiType = ApiType;
  private subscription: Subscription;

  ngOnInit() {
    this.subscription = this.activatedRoute.parent.paramMap.subscribe(obs => {
      this.repoId = obs.get('repoId');
      this.refresh()
    });
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  refresh() {
    forkJoin([
      this.apiCallService.all().pipe(first()),
      this.processService.all().pipe(first())
    ]).subscribe(([apiCalls, processes]) => {
      this.apiCalls = apiCalls.map(api => {
        return {
          ...api,
          usedByCount: processes.filter(p => p.apiCallIds && p.apiCallIds.includes(api.id)).length,
          implementedInCount: api.implementedBy ? api.implementedBy.length : 0
        };
      });
      this.calculateOrphans(processes);
    });
  }

  private calculateOrphans(processes: any[]) {
    const referencedApiIds = new Set<string>();
    processes.forEach(p => {
      if (p.apiCallIds) {
        p.apiCallIds.forEach(id => referencedApiIds.add(id));
      }
    });
    this.orphanIds = this.apiCalls
      .filter(api => !referencedApiIds.has(api.id))
      .map(api => api.id);
  }

  onDelete(apiCall: ApiCall) {
    const modalRef = this.modalService.show(DeleteConfirmationDialogComponent, { class: 'modal-md' });
    modalRef.content.itemName = apiCall.name;
    modalRef.content.onClose.subscribe(result => {
      if (result) {
        this.apiCallService.delete(apiCall.id).subscribe(() => {
          this.toastr.success('API Call deleted');
          this.refresh();
        }, error => {
          this.toastr.error('Error deleting API Call');
        });
      }
    });
  }

  onShowDescription(apiCall: ApiCall) {
    this.modalService.show(ApiCallDescriptionModalComponent, {
      initialState: { apiCall },
      class: 'modal-dialog-centered'
    });
  }
}
