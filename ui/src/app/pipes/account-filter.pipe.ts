import { Pipe, PipeTransform } from '@angular/core';
import {FunctionalCluster} from "../models/functional-cluster";
import {ApiCall} from '../models/api-call';
import {Process} from '../models/process';
import {Capability} from '../models/capability';
import {System} from '../models/system';
import {Account} from '../models/account';
@Pipe({
  name: 'accountFilter'
})
export class AccountFilterPipe implements PipeTransform {
  transform(items: Account[], searchText: string): any[] {
    if(!items) {
      return [];
    }
    if(!searchText) {
      return items;
    }
    return items.filter(el=> (el.email?.toLowerCase().includes(searchText.toLowerCase())
      || el.firstname?.toLowerCase().includes(searchText.toLowerCase())
      || el.lastname?.toLowerCase().includes(searchText.toLowerCase())));

   }
}
