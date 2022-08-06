import {Component, Input, OnInit} from '@angular/core';
import {AppService} from '../services/app.service';
import {BusinessFunction} from "../models/business-function";
import {BusinessService} from "../models/business-service";
import {InformationSystemService} from "../models/information-system-service";


@Component({
  selector: 'app-business-function',
  templateUrl: './business-function.component.html',
  styleUrls: ['./business-function.component.scss']
})
export class BusinessFunctionComponent implements OnInit {


  @Input() businessFunction: BusinessFunction;

  businessServices: BusinessService[] = [];
  informationSystemServices: InformationSystemService[] = [];

  constructor(private appService: AppService) { }
  
  ngOnInit() {
    this.appService.getBusinessServices().subscribe(result => result.forEach(item => {
      if(this.businessFunction.businessServices.some(x => x === item.id)) {
        this.businessServices.push(item);
        return;
      }
    }));

    this.appService.getInformationSystemServices().subscribe(result => result.forEach(item => {
      if(this.businessFunction.informationSystemServices.some(x => x === item.id)) {
        this.informationSystemServices.push(item);
        return;
      }
    }));
  }
}
