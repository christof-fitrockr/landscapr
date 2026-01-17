import { Pipe, PipeTransform } from '@angular/core';
import { ApiType } from '../models/api-call';

@Pipe({
  name: 'apiType'
})
export class ApiTypePipe implements PipeTransform {
  transform(value: ApiType | number): string {
    switch (value) {
      case ApiType.System: return 'System API';
      case ApiType.Business: return 'Business API';
      case ApiType.ThirdParty: return '3rd-Party';
      case ApiType.Analytics: return 'Analytics';
      default: return '';
    }
  }
}
