import {Component, Input, OnInit} from '@angular/core';
import {InformationObject} from "../models/information-object";
import {NgForm} from "@angular/forms";
import {InformationObjectService} from "../services/information-object.service";

declare var UIkit: any;

@Component({
  selector: 'app-information-object',
  templateUrl: './information-object.component.html',
  styleUrls: ['./information-object.component.scss']
})
export class InformationObjectComponent implements OnInit {


  @Input() informationObject: InformationObject;
  @Input() editMode = false;

  constructor(private informationObjectService: InformationObjectService) { }

  ngOnInit() {
    this.resetForm();
  }

  onSubmit(informationObjectForm: NgForm) {
    if (informationObjectForm.value.$key == null) {
      this.informationObjectService.create(informationObjectForm.value);
    } else {
      this.informationObjectService.update(informationObjectForm.value);
    }
    this.resetForm(informationObjectForm);
    //TODO this.tostr.success('Submitted Succcessfully', 'Employee Register');
  }

  resetForm(informationObjectForm?: NgForm) {
    if (informationObjectForm != null) {
      informationObjectForm.reset();
    }
    this.informationObject = new InformationObject();
  }
}
