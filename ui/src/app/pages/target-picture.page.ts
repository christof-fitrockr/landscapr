import {Component, OnInit} from '@angular/core';
import {FunctionalCluster} from "../models/functional-cluster";
import {BusinessService} from "../models/business-service";
import {InformationSystemService} from "../models/information-system-service";
import {AppService} from "../services/app.service";


@Component({
  selector: 'app-root',
  templateUrl: './target-picture.page.html',
  styleUrls: ['./target-picture.page.scss']
})
export class TargetPicturePage implements OnInit {

  functionalCluster: FunctionalCluster[];
  businessServices: BusinessService[];
  informationSystemServices: InformationSystemService[];
  searchText: string;

  constructor(private appService: AppService) { }
  
  ngOnInit() { 
    this.appService.getClusterList().subscribe(item => {
      this.functionalCluster = item;
    });
    this.appService.getBusinessServices().subscribe(result => this.businessServices = result);
    this.appService.getInformationSystemServices().subscribe(result => this.informationSystemServices = result);
  }
}
