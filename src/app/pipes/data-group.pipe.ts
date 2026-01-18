import { Pipe, PipeTransform } from '@angular/core';
import { Data } from '../models/data';

@Pipe({
  name: 'dataGroup'
})
export class DataGroupPipe implements PipeTransform {
  transform(dataList: Data[]): { groupName: string, items: Data[] }[] {
    if (!dataList) {
      return [];
    }

    const groups: { [key: string]: Data[] } = {};
    const ungrouped: Data[] = [];

    dataList.forEach(data => {
      if (data.group && data.group.trim() !== '') {
        if (!groups[data.group]) {
          groups[data.group] = [];
        }
        groups[data.group].push(data);
      } else {
        ungrouped.push(data);
      }
    });

    const result = Object.keys(groups).sort().map(groupName => {
      return {
        groupName: groupName,
        items: groups[groupName].sort((a, b) => a.name.localeCompare(b.name))
      };
    });

    if (ungrouped.length > 0) {
      result.push({
        groupName: 'Ungrouped',
        items: ungrouped.sort((a, b) => a.name.localeCompare(b.name))
      });
    }

    return result;
  }
}
