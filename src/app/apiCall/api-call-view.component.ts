import {Component, OnInit} from '@angular/core';
import {ApiCallService} from '../services/api-call.service';
import {ActivatedRoute, Router} from '@angular/router';
import {ApiCall} from '../models/api-call';
import {first} from 'rxjs/operators';
import {BsModalService} from 'ngx-bootstrap/modal';
import {ToastrService} from 'ngx-toastr';
import {DeleteConfirmationDialogComponent} from '../components/delete-confirmation-dialog.component';
import {DataService} from '../services/data.service';
import {Data} from '../models/data';

@Component({selector: 'app-api-call-view', templateUrl: './api-call-view.component.html'})
export class ApiCallViewComponent implements OnInit {

  apiCall: ApiCall;
  dataMap: Map<string, Data> = new Map();

  constructor(
    private apiCallService: ApiCallService,
    private dataService: DataService,
    private route: ActivatedRoute,
    private router: Router,
    private modalService: BsModalService,
    private toastr: ToastrService
  ) {
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.apiCallService.byId(id).pipe(first()).subscribe(apiCall => {
        this.apiCall = apiCall;
      });
    }
    this.dataService.all().pipe(first()).subscribe(dataList => {
      dataList.forEach(d => this.dataMap.set(d.id, d));
    });
  }

  getDataName(id: string): string {
    return this.dataMap.get(id)?.name || 'Unknown Data';
  }

  getDataItemName(dataId: string, itemId: string): string {
    if (!itemId) return 'Entire Object';
    const data = this.dataMap.get(dataId);
    if (!data || !data.items) return 'Unknown Attribute';
    const item = data.items.find(i => i.id === itemId);
    return item ? item.name : 'Unknown Attribute';
  }

  delete() {
    const modalRef = this.modalService.show(DeleteConfirmationDialogComponent, { class: 'modal-md' });
    modalRef.content.itemName = this.apiCall.name;
    modalRef.content.onClose.subscribe(result => {
      if (result) {
        this.apiCallService.delete(this.apiCall.id).subscribe(() => {
          this.toastr.success('API Call deleted');
          this.router.navigate(['/apiCall/list']);
        }, error => {
          this.toastr.error('Error deleting API Call');
        });
      }
    });
  }
}
