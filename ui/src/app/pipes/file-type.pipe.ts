import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'fileType'
})
export class FileTypePipe implements PipeTransform {

  transform(files: any[], type: string): any[] {
    if (!files) {
      return [];
    }
    return files.filter(file => file.name.endsWith(`.${type}`));
  }

}
