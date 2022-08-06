import {Component, OnInit} from '@angular/core';
import {AppService} from "../services/app.service";
import {InformationObject} from "../models/information-object";
import {BusinessService} from "../models/business-service";
import {ActivatedRoute} from "@angular/router";

@Component({
  selector: 'app-root',
  templateUrl: './information-object-details.page.html',
  styleUrls: ['./information-object-details.page.scss']
})
export class InformationObjectDetailsPage implements OnInit {

  informationObject: InformationObject;

  constructor(private appService: AppService, private route: ActivatedRoute) { }

  ngOnInit() {
    this.route.paramMap.subscribe(item => {
      if(item.get('id')) {
        this.appService.getInformationObjectById(item.get('id')).subscribe(result => this.informationObject = result);
      }
    })
  }
}
