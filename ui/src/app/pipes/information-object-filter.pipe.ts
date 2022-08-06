import { Pipe, PipeTransform } from '@angular/core';
import {FunctionalCluster} from "../models/functional-cluster";
import {BusinessService} from "../models/business-service";
import {InformationObject} from "../models/information-object";
@Pipe({
  name: 'informationObjectFilter'
})
export class InformationObjectFilterPipe implements PipeTransform {
  transform(items: InformationObject[], searchText: string): any[] {
    if(!items) {
      return [];
    }
    if(!searchText) {
      return items;
    }

    searchText = searchText.toLowerCase();

    return items.filter(el=> {
      return el.id.toLowerCase().includes(searchText) || el.name.toLowerCase().includes(searchText);
    });
   }
}
