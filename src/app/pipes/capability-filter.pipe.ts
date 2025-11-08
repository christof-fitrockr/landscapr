import { Pipe, PipeTransform } from '@angular/core';
import {FunctionalCluster} from "../models/functional-cluster";
import {ApiCall} from '../models/api-call';
import {Process} from '../models/process';
import {Capability} from '../models/capability';
@Pipe({
  name: 'capabilityFilter'
})
export class CapabilityFilterPipe implements PipeTransform {
  transform(items: Capability[], searchText: string): any[] {
    if(!items) {
      return [];
    }
    if(!searchText) {
      return items;
    }
    return items.filter(el=> el.name?.toLowerCase().includes(searchText.toLowerCase()));

   }
}
