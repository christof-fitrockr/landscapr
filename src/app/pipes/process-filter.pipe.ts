import { Pipe, PipeTransform } from '@angular/core';
import { Process } from '../models/process';

@Pipe({
  name: 'processFilter'
})
export class ProcessFilterPipe implements PipeTransform {
  // Filters processes. Optionally applies a text search on the process name or tags.
  // If a search text is provided, it also checks descendants and returns the process if any descendant matches.
  transform(items: Process[], allProcesses: Process[], searchText?: string, showOrphansOnly: boolean = false, orphanIds: string[] = [], status?: number, onlyWithComments?: boolean): Process[] {
    if (!Array.isArray(items)) {
      return [];
    }

    const hasSearch = searchText && searchText.trim().length > 0;
    const q = hasSearch ? searchText.toLowerCase() : '';

    return items.filter(item => this.isVisible(item, allProcesses, q, showOrphansOnly, orphanIds, status, onlyWithComments));
  }

  private isVisible(item: Process, allProcesses: Process[], q: string, showOrphansOnly: boolean, orphanIds: string[], status: number | undefined, onlyWithComments: boolean | undefined): boolean {
    const matchesSearch = !q ||
      item?.name?.toLowerCase().includes(q) ||
      (Array.isArray(item?.tags) && item.tags.join(' ').toLowerCase().includes(q));

    const matchesOrphan = !showOrphansOnly || orphanIds.includes(item.id);

    const matchesStatus = (status === undefined || status === null) || item.status === status;

    const matchesComments = !onlyWithComments || (!!item.comments && item.comments.length > 0);

    if (matchesSearch && matchesOrphan && matchesStatus && matchesComments) {
      return true;
    }

    // Even if it doesn't match, show it if any of its children match (recursively)
    const childIds = this.getChildIds(item);
    if (childIds.length > 0 && allProcesses) {
      return childIds.some(id => {
        const child = allProcesses.find(p => p.id === id);
        if (child) {
          return this.isVisible(child, allProcesses, q, showOrphansOnly, orphanIds, status, onlyWithComments);
        }
        return false;
      });
    }

    return false;
  }

  private getChildIds(process: Process): string[] {
    if (!process || !process.steps) {
      return [];
    }
    const ids: string[] = [];
    process.steps.forEach(step => {
      if (step.processReference) {
        ids.push(step.processReference);
      }
      if (step.successors) {
        step.successors.forEach(succ => {
          if (succ.processReference) {
            ids.push(succ.processReference);
          }
        });
      }
    });
    return ids;
  }
}
