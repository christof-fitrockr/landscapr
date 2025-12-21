import {Component, OnInit} from '@angular/core';
import {ApplicationService} from '../services/application.service';
import {ActivatedRoute, Router} from '@angular/router';
import {Application} from '../models/application';
import {first} from 'rxjs/operators';
import {BsModalService} from 'ngx-bootstrap/modal';
import {ToastrService} from 'ngx-toastr';
import {DeleteConfirmationDialogComponent} from '../components/delete-confirmation-dialog.component';

@Component({selector: 'app-system-view', templateUrl: './system-view.component.html'})
export class SystemViewComponent implements OnInit {

  system: Application;

  constructor(
    private applicationService: ApplicationService,
    private route: ActivatedRoute,
    private router: Router,
    private modalService: BsModalService,
    private toastr: ToastrService
  ) {
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.applicationService.byId(id).pipe(first()).subscribe(sys => {
        this.system = sys;
      });
    }
  }

  delete() {
    const modalRef = this.modalService.show(DeleteConfirmationDialogComponent, { class: 'modal-md' });
    modalRef.content.itemName = this.system.name;
    modalRef.content.onClose.subscribe(result => {
      if (result) {
        this.applicationService.delete(this.system.id).subscribe(() => {
          this.toastr.success('System deleted');
          this.router.navigate(['/system/list']);
        }, error => {
          this.toastr.error('Error deleting System');
        });
      }
    });
  }
}
