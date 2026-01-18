import {Component, OnDestroy, OnInit} from '@angular/core';
import {first} from 'rxjs/operators';
import {DataService} from '../services/data.service';
import {Data} from '../models/data';
import {Subscription} from 'rxjs';
import {ActivatedRoute, Router} from '@angular/router';
import {BsModalService} from 'ngx-bootstrap/modal';
import {ToastrService} from 'ngx-toastr';
import {DeleteConfirmationDialogComponent} from '../components/delete-confirmation-dialog.component';

@Component({selector: 'app-data-list', templateUrl: './data-list.component.html', styleUrls: ['./data-list.component.scss']})
export class DataListComponent implements OnInit, OnDestroy {

  constructor(
    private dataService: DataService,
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private modalService: BsModalService,
    private toastr: ToastrService
  ) {
  }

  dataList: Data[];
  searchText: string;
  private subscription: Subscription;

  ngOnInit() {
    this.subscription = this.activatedRoute.parent.paramMap.subscribe(obs => {
      this.refresh();
    });
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  refresh() {
    this.dataService.all().pipe(first()).subscribe(dataList => {
      this.dataList = dataList;
    });
  }

  onDelete(data: Data) {
    const modalRef = this.modalService.show(DeleteConfirmationDialogComponent, { class: 'modal-md' });
    modalRef.content.itemName = data.name;
    modalRef.content.onClose.subscribe(result => {
      if (result) {
        this.dataService.delete(data.id).subscribe(() => {
          this.toastr.success('Data deleted');
          this.refresh();
        }, error => {
          this.toastr.error('Error deleting Data');
        });
      }
    });
  }

  showDiagram() {
    this.router.navigate(['../diagram'], {relativeTo: this.activatedRoute});
  }
}
