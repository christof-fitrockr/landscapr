import { Pipe, PipeTransform } from '@angular/core';
import {ApiCall} from '../models/api-call';
import {Process} from '../models/process';
import {Capability} from '../models/capability';
@Pipe({
  name: 'capabilityFilter'
})
export class CapabilityFilterPipe implements PipeTransform {
  transform(items: Capability[], searchText: string, showOrphansOnly: boolean = false, orphanIds: string[] = []): any[] {
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
