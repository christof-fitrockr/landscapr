import {Pipe, PipeTransform} from '@angular/core';
import {ApiCall} from '../models/api-call';

@Pipe({
  name: 'functionCapabilityFilter'
})
export class ApiCallCapabilityFilterPipe implements PipeTransform {
  transform(items: ApiCall[], capabilityId: string): any[] {
    if(!items) {
      return [];
    }
    if(!capabilityId) {
      return items;
    }
    return items.filter(el=> el.capabilityId === capabilityId);

   }
}
