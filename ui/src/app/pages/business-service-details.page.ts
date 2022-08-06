import { Component, OnInit } from '@angular/core';
import {BusinessService} from "../models/business-service";
import {AppService} from "../services/app.service";
import {ActivatedRoute, RouterModule} from "@angular/router";

@Component({
  selector: 'app-root',
  templateUrl: './business-service-details.page.html',
  styleUrls: ['./business-service-details.page.scss']
})
export class BusinessServiceDetailsPage implements OnInit {

  businessService: BusinessService;

  constructor(private appService: AppService, private route: ActivatedRoute) { }
  
  ngOnInit() {
    this.route.paramMap.subscribe(item => {
      if(item.get('id')) {
        this.appService.getBusinessServiceById(item.get('id')).subscribe(result => this.businessService = result);
      }
    })
  }
}
