import { Pipe, PipeTransform } from '@angular/core';
import { Process } from '../models/process';

@Pipe({
  name: 'processFilter'
})
export class ProcessFilterPipe implements PipeTransform {
  // Filters processes. By default it only returns processes that have subprocesses (steps.length > 0),
  // and optionally applies a text search on the process name or tags.
  transform(items: Process[], searchText?: string, onlyWithSubprocesses: boolean = true): Process[] {
    if (!Array.isArray(items)) {
      return [];
    }

    let result = items;

    // Default: show only processes that have subprocesses (steps)
    if (onlyWithSubprocesses) {
      result = result.filter(p => Array.isArray(p?.steps) && p.steps.length > 0);
    }

    // Optional: apply text filter
    if (searchText && searchText.trim().length > 0) {
      const q = searchText.toLowerCase();
      result = result.filter(el =>
        el?.name?.toLowerCase().includes(q) ||
        (Array.isArray(el?.tags) && el.tags.join(' ').toLowerCase().includes(q))
      );
    }

    return result;
  }
}
