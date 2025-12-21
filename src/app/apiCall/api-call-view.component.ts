import {Component, OnInit} from '@angular/core';
import {ApiCallService} from '../services/api-call.service';
import {ActivatedRoute, Router} from '@angular/router';
import {ApiCall} from '../models/api-call';
import {first} from 'rxjs/operators';
import {BsModalService} from 'ngx-bootstrap/modal';
import {ToastrService} from 'ngx-toastr';
import {DeleteConfirmationDialogComponent} from '../components/delete-confirmation-dialog.component';

@Component({selector: 'app-api-call-view', templateUrl: './api-call-view.component.html'})
export class ApiCallViewComponent implements OnInit {

  apiCall: ApiCall;

  constructor(
    private apiCallService: ApiCallService,
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
