import { Pipe, PipeTransform } from '@angular/core';
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

    if (showOrphansOnly && orphanIds) {
      result = result.filter(el => orphanIds.includes(el.id));
    }

    if(searchText) {
      const st = searchText.toLowerCase();
      result = result.filter(el=> (el.name?.toLowerCase().includes(st) || el.systemCluster?.toLowerCase().includes(st)) );
    }

    return result;

   }
}
