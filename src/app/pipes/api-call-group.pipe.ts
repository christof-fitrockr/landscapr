import { Pipe, PipeTransform } from '@angular/core';
import { ApiCall } from '../models/api-call';

@Pipe({
  name: 'apiCallGroup'
})
export class ApiCallGroupPipe implements PipeTransform {

  transform(apiCalls: ApiCall[]): { name: string, items: ApiCall[] }[] {
    if (!apiCalls) {
      return [];
    }

    const groups: { [key: string]: ApiCall[] } = {};

    apiCalls.forEach(apiCall => {
      const groupName = apiCall.apiGroup && apiCall.apiGroup.trim() !== '' ? apiCall.apiGroup : 'Ungrouped';
      if (!groups[groupName]) {
        groups[groupName] = [];
      }
      groups[groupName].push(apiCall);
    });

    const result = Object.keys(groups).map(key => {
      return {
        name: key,
        items: groups[key].sort((a, b) => a.name.localeCompare(b.name))
      };
    });

    return result.sort((a, b) => a.name.localeCompare(b.name));
  }
}
