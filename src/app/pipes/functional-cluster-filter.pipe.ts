import { Pipe, PipeTransform } from '@angular/core';
import {FunctionalCluster} from "../models/functional-cluster";
@Pipe({
  name: 'clusterFilter'
})
export class FunctionalClusterFilterPipe implements PipeTransform {
  transform(items: FunctionalCluster[], searchText: string): any[] {
    if(!items) {
      return [];
    }
    if(!searchText) {
      return items;
    }

    searchText = searchText.toLowerCase();

    return items.filter(el=> {
      return el.name.toLowerCase().includes(searchText) || el.functions.some(e => {
        return e.name.toLowerCase().includes(searchText) || e.id.toLowerCase().includes(searchText);
      });
    });
   }
}
