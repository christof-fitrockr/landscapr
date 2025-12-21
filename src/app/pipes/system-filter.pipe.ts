import { Pipe, PipeTransform } from '@angular/core';
import {FunctionalCluster} from "../models/functional-cluster";
import {ApiCall} from '../models/api-call';
import {Process} from '../models/process';
import {Capability} from '../models/capability';
import {Application} from '../models/application';
@Pipe({
  name: 'systemFilter'
})
export class SystemFilterPipe implements PipeTransform {
  transform(items: Application[], searchText: string, showOrphansOnly: boolean = false, orphanIds: string[] = []): any[] {
    if(!items) {
      return [];
    }

    let result = items;

    if (showOrphansOnly) {
      result = result.filter(el => orphanIds.includes(el.id));
    }

    if(searchText) {
      result = result.filter(el=> (el.name?.toLowerCase().includes(searchText.toLowerCase()) || el.systemCluster?.toLowerCase().includes(searchText.toLowerCase())) );
    }

    return result;

   }
}
