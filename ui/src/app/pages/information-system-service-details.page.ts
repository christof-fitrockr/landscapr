import { Component, OnInit } from '@angular/core';
import {BusinessService} from "../models/business-service";
import {AppService} from "../services/app.service";
import {ActivatedRoute, RouterModule} from "@angular/router";
import {InformationSystemService} from "../models/information-system-service";

@Component({
  selector: 'app-root',
  templateUrl: './information-system-service-details.page.html',
  styleUrls: ['./information-system-service-details.page.scss']
})
export class InformationSystemServiceDetailsPage implements OnInit {

  informationSystemService: InformationSystemService;

  constructor(private appService: AppService, private route: ActivatedRoute) { }
  
  ngOnInit() {
    this.route.paramMap.subscribe(item => {
      if(item.get('id')) {
        this.appService.getInformationSystemServiceById(item.get('id')).subscribe(result => this.informationSystemService = result);
      }
    })
  }
}
