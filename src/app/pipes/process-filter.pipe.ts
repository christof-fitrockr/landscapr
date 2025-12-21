import { Pipe, PipeTransform } from '@angular/core';
import { Process } from '../models/process';

@Pipe({
  name: 'processFilter'
})
export class ProcessFilterPipe implements PipeTransform {
  // Filters processes. By default it only returns processes that have subprocesses (steps.length > 0),
  // and optionally applies a text search on the process name or tags.
  transform(items: Process[], searchText?: string, onlyWithSubprocesses: boolean = true, showOrphansOnly: boolean = false, orphanIds: string[] = []): Process[] {
    if (!Array.isArray(items)) {
      return [];
    }

    let result = items;

    // Filter by orphan status if enabled
    if (showOrphansOnly) {
      result = result.filter(p => orphanIds.includes(p.id));
    }

    // Default: show only processes that have subprocesses (steps)
    // IMPORTANT: If showing orphans, we might want to ignore the subprocess filter or keep it.
    // The requirement implies showing orphans regardless of subprocess status, but usually filters are additive.
    // However, orphans might be drafts without steps.
    // Let's keep it additive but respect the user's choice on onlyWithSubprocesses.
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
