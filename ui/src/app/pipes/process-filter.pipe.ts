import { Pipe, PipeTransform } from '@angular/core';
import {FunctionalCluster} from "../models/functional-cluster";
import {ApiCall} from '../models/api-call';
import {Process} from '../models/process';
@Pipe({
  name: 'processFilter'
})
export class ProcessFilterPipe implements PipeTransform {
  transform(items: Process[], searchText: string): any[] {
    if(!items) {
      return [];
    }
    if(!searchText) {
      return items;
    }
    return items.filter(el=> el.name?.toLowerCase().includes(searchText.toLowerCase()));

   }
}
