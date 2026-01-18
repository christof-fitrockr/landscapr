import { Pipe, PipeTransform } from '@angular/core';
import { Data } from '../models/data';

@Pipe({
  name: 'dataFilter'
})
export class DataFilterPipe implements PipeTransform {

  transform(items: Data[], searchText: string, filterStatus: number = null): Data[] {
    if (!items) {
      return [];
    }

    return items.filter(it => {
      const matchesSearch = !searchText || it.name.toLocaleLowerCase().includes(searchText.toLocaleLowerCase());
      const matchesStatus = filterStatus === null || it.state === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }
}
