import { Pipe, PipeTransform } from '@angular/core';
import {FunctionalCluster} from "../models/functional-cluster";
import {ApiCall} from '../models/api-call';
import {Process} from '../models/process';
import {Capability} from '../models/capability';
import {System} from '../models/system';
@Pipe({
  name: 'systemFilter'
})
export class SystemFilterPipe implements PipeTransform {
  transform(items: System[], searchText: string): any[] {
    if(!items) {
      return [];
    }
    if(!searchText) {
      return items;
    }
    return items.filter(el=> (el.name?.toLowerCase().includes(searchText.toLowerCase()) || el.systemCluster?.toLowerCase().includes(searchText.toLowerCase())) );

   }
}
