import {Component, Input, OnChanges, OnInit} from '@angular/core';
import {AppService} from '../services/app.service';
import {BusinessFunction} from '../models/business-function';
import {InformationSystemService} from '../models/information-system-service';
import {InformationObject} from '../models/information-object';
import {NgForm} from '@angular/forms';
import {InformationSystemServiceService} from '../services/information-system-service.service';

declare var UIkit: any;

@Component({
  selector: 'app-information-system-service',
  templateUrl: './information-system-service.component.html',
  styleUrls: ['./information-system-service.component.scss']
})
export class InformationSystemServiceComponent implements OnChanges, OnInit {


  @Input() service: InformationSystemService;
  @Input() editMode = false;

  functions: BusinessFunction[];
  showModal = false;
  functionToShow: BusinessFunction;

  constructor(private appService: AppService, private issService: InformationSystemServiceService) { }

  ngOnInit() {
    this.resetForm();
  }

  ngOnChanges() {
    this.appService.getBusinessFunctionsByISS(this.service).subscribe(result => this.functions = result);
  }

  showFunction(businessFunction: BusinessFunction) {
    this.functionToShow = businessFunction;
    this.showModal = true;
  }

  hideModal() {
    this.showModal = false;
  }




  onSubmit(informationObjectForm: NgForm) {
    if (informationObjectForm.value.$key == null) {
      this.issService.create(informationObjectForm.value);
    } else {
      this.issService.update(informationObjectForm.value);
    }
    this.resetForm(informationObjectForm);
    //TODO this.tostr.success('Submitted Succcessfully', 'Employee Register');
  }

  resetForm(informationSystemServiceForm?: NgForm) {
    if (informationSystemServiceForm != null) {
      informationSystemServiceForm.reset();
    }
    this.service = new InformationSystemService();
  }
}
