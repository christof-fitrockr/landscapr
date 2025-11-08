import { Pipe, PipeTransform } from '@angular/core';
import {FunctionalCluster} from "../models/functional-cluster";
import {BusinessService} from "../models/business-service";
@Pipe({
  name: 'businessServiceFilter'
})
export class BusinessServiceFilterPipe implements PipeTransform {
  transform(items: BusinessService[], searchText: string): any[] {
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
