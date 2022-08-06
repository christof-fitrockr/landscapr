import {Component, OnInit} from '@angular/core';
import {BusinessService} from '../models/business-service';
import {AppService} from '../services/app.service';
import {BusinessServiceService} from '../services/business-service.service';

@Component({
  selector: 'app-root',
  templateUrl: './business-service.page.html',
  styleUrls: ['./business-service.page.scss']
})
export class BusinessServicePage implements OnInit {

  businessServices: BusinessService[];
  selectedBusinessService: BusinessService = null;
  searchText: string;
  editMode: boolean;

  constructor(private appService: AppService, private bsService: BusinessServiceService) { }

  ngOnInit() {
    // this.appService.getBusinessServices().subscribe(result => this.businessServices = result);
    this.bsService.list().snapshotChanges().subscribe(item => {
      this.businessServices = [];
      item.forEach(element => {
        const key = element.payload.toJSON();
        key['$key'] = element.key;

        if (!this.selectedBusinessService) {
          this.selectedBusinessService = key as BusinessService;
        }

        this.businessServices.push(key as BusinessService);
      });
    });
  }


  onEdit(businessService: BusinessService, editMode: boolean) {
    this.editMode = editMode;
    this.selectedBusinessService = Object.assign({}, businessService);
  }

  onDelete(key: string) {
    if (confirm('Are you sure to delete this record ?') === true) {
      this.bsService.delete(key);
      // TODO this.tostr.warning("Deleted Successfully", "Employee register");
    }
  }

  createNew() {
    this.editMode = true;
    this.selectedBusinessService = Object.assign(new BusinessService());
  }
}
