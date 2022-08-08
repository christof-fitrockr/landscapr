import { Pipe, PipeTransform } from '@angular/core';
import {FunctionalCluster} from "../models/functional-cluster";
import {ApiCall} from '../models/api-call';
import {Process} from '../models/process';
import {Capability} from '../models/capability';
import {Application} from '../models/application';
import {Repo} from '../models/repo';
@Pipe({
  name: 'repoFilter'
})
export class RepoFilterPipe implements PipeTransform {
  transform(items: Repo[], searchText: string): any[] {
    if(!items) {
      return [];
    }
    if(!searchText) {
      return items;
    }
    return items.filter(el=> (el.name?.toLowerCase().includes(searchText.toLowerCase()) ));
   }
}
