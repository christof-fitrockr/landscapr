import { Pipe, PipeTransform } from '@angular/core';
import {FunctionalCluster} from "../models/functional-cluster";
import {ApiCall} from '../models/api-call';
@Pipe({
  name: 'apiCallFilter'
})
export class ApiCallFilterPipe implements PipeTransform {
  transform(items: ApiCall[], searchText: string, showOrphansOnly: boolean = false, orphanIds: string[] = []): any[] {
    if(!items) {
      return [];
    }

    let result = items;

    if (showOrphansOnly) {
      result = result.filter(el => orphanIds.includes(el.id));
    }

    if(searchText) {
      result = result.filter(el=> el.name?.toLowerCase().includes(searchText.toLowerCase()));
    }

    return result;

   }
}
