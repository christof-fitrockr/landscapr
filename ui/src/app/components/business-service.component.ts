import {Component, Input, OnChanges} from '@angular/core';
import {AppService} from '../services/app.service';
import {BusinessService} from '../models/business-service';
import {BusinessFunction} from '../models/business-function';
import {NgForm} from '@angular/forms';
import {BusinessServiceService} from '../services/business-service.service';


@Component({
  selector: 'app-business-service',
  templateUrl: './business-service.component.html',
  styleUrls: ['./business-service.component.scss']
})
export class BusinessServiceComponent implements OnChanges {


  @Input() service: BusinessService;
  @Input() editMode = false;

  functions: BusinessFunction[];
  showModal: boolean = false;
  functionToShow: BusinessFunction;

  constructor(private appService: AppService, private bsService: BusinessServiceService) { }

  ngOnChanges() {
    this.appService.getBusinessFunctionsByBS(this.service).subscribe(result => this.functions = result);
  }


  showFunction(businessFunction: BusinessFunction) {
    this.functionToShow = businessFunction;
    this.showModal = true;
  }

  hideModal() {
    this.showModal = false;
  }


  onSubmit(businessServiceForm: NgForm) {
    if (businessServiceForm.value.$key == null) {
      this.bsService.create(businessServiceForm.value);
    } else {
      this.bsService.update(businessServiceForm.value);
    }
    this.resetForm(businessServiceForm);
    //TODO this.tostr.success('Submitted Succcessfully', 'Employee Register');
  }

  resetForm(businessServiceForm?: NgForm) {
    if (businessServiceForm != null) {
      businessServiceForm.reset();
    }
    this.service = new BusinessService();
  }
}
