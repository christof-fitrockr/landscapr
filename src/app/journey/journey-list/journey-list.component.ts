import { Component, OnInit } from '@angular/core';
import { Journey } from 'src/app/models/journey.model';
import { JourneyService } from 'src/app/services/journey.service';
import { BsModalService } from 'ngx-bootstrap/modal';
import { DeleteConfirmationDialogComponent } from 'src/app/components/delete-confirmation-dialog.component';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-journey-list',
  templateUrl: './journey-list.component.html',
  styleUrls: ['./journey-list.component.scss']
})
export class JourneyListComponent implements OnInit {

  journeys: Journey[];

  constructor(
    private journeyService: JourneyService,
    private modalService: BsModalService,
    private toastr: ToastrService
  ) { }

  ngOnInit(): void {
    this.journeyService.all().subscribe(journeys => {
      this.journeys = journeys;
    });
  }

  deleteJourney(journey: Journey): void {
    const modalRef = this.modalService.show(DeleteConfirmationDialogComponent, { class: 'modal-md' });
    modalRef.content.itemName = journey.name;
    modalRef.content.onClose.subscribe(result => {
      if (result) {
        this.journeyService.delete(journey.id).subscribe(() => {
          this.journeys = this.journeys.filter(j => j.id !== journey.id);
          this.toastr.success('Journey deleted');
        }, error => {
          this.toastr.error('Error deleting journey');
        });
      }
    });
  }
}
