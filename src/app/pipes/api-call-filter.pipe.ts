import { Pipe, PipeTransform } from '@angular/core';
import {FunctionalCluster} from "../models/functional-cluster";
import {ApiCall} from '../models/api-call';
@Pipe({
  name: 'apiCallFilter'
})
export class ApiCallFilterPipe implements PipeTransform {
  transform(items: ApiCall[], searchText: string): any[] {
    if(!items) {
      return [];
    }
    if(!searchText) {
      return items;
    }
    return items.filter(el=> el.name?.toLowerCase().includes(searchText.toLowerCase()));

   }
}
