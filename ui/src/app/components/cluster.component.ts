import { Component, Input } from '@angular/core';
import {FunctionalCluster} from "../models/functional-cluster";
import {BusinessFunction} from "../models/business-function";


@Component({
  selector: 'app-cluster',
  templateUrl: './cluster.component.html',
  styleUrls: ['./cluster.component.scss']
})
export class ClusterComponent {


  @Input() cluster: FunctionalCluster;

  showModal: boolean = false;
  functionToShow: BusinessFunction;

  showFunction(businessFunction: BusinessFunction) {
    this.functionToShow = businessFunction;
    this.showModal = true;
  }

  hideModal() {
    this.showModal = false;
  }
}
