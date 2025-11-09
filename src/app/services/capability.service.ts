import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {Capability} from '../models/capability';
import {v4 as uuidv4} from 'uuid';

@Injectable({
  providedIn: 'root',
})
export class CapabilityService {
  public static STORAGE_KEY = 'ls_capability';

  constructor() {}

  private static load(): Capability[] {
    const item = JSON.parse(localStorage.getItem(CapabilityService.STORAGE_KEY)) as Capability[];
    if (!item) {
      return [];
    }
    return item;
  }

  private static store(apps: Capability[]): void {
    localStorage.setItem(CapabilityService.STORAGE_KEY, JSON.stringify(apps));
  }

  // Helpers
  private static mapById(apps: Capability[]): Map<string, Capability> {
    const m = new Map<string, Capability>();
    for (const a of apps) {
      m.set(a.id, a);
    }
    return m;
  }

  private static isCycle(apps: Capability[], nodeId: string, candidateParentId: string | undefined | null): boolean {
    if (!candidateParentId) return false;
    if (candidateParentId === nodeId) return true;
    // Walk up parent pointers from candidate parent; if we hit nodeId → cycle
    const byId = this.mapById(apps);
    let cur = candidateParentId;
    const guard = 0;
    while (cur) {
      if (cur === nodeId) return true;
      const parent = byId.get(cur)?.parentId;
      if (!parent) break;
      cur = parent;
    }
    return false;
  }

  private static ensureChildrenConsistency(apps: Capability[]): void {
    // Rebuild childrenIds from parentId for in-memory consistency
    const byId = this.mapById(apps);
    for (const c of apps) {
      c.childrenIds = [];
    }
    for (const c of apps) {
      if (c.parentId && byId.has(c.parentId)) {
        const p = byId.get(c.parentId);
        if (!p.childrenIds) p.childrenIds = [];
        if (p.childrenIds.indexOf(c.id) === -1) {
          p.childrenIds.push(c.id);
        }
      }
    }
  }

  all(repoId: string): Observable<Capability[]> {
    return new Observable<Capability[]>(obs => {
      const apps = CapabilityService.load();
      // Keep in-memory childrenIds consistent (non-destructive)
      CapabilityService.ensureChildrenConsistency(apps);
      obs.next(apps.filter(a => a.repoId === repoId));
    });
  }

  roots(repoId: string): Observable<Capability[]> {
    return new Observable<Capability[]>(obs => {
      const apps = CapabilityService.load().filter(a => a.repoId === repoId);
      const byId = CapabilityService.mapById(apps);
      const roots = apps.filter(c => !c.parentId || !byId.has(c.parentId));
      obs.next(roots);
    });
  }

  childrenOf(id: string): Observable<Capability[]> {
    return new Observable<Capability[]>(obs => {
      const apps = CapabilityService.load();
      const self = apps.find(a => a.id === id);
      if (!self) { obs.next([]); return; }
      let children: Capability[] = [];
      if (self.childrenIds && self.childrenIds.length) {
        const byId = CapabilityService.mapById(apps);
        children = self.childrenIds.map(cid => byId.get(cid)).filter(Boolean) as Capability[];
      } else {
        children = apps.filter(a => a.parentId === id);
      }
      obs.next(children);
    });
  }

  byId(id: string): Observable<Capability> {
    return new Observable<Capability>(obs => {
      const apps = CapabilityService.load();
      for (const app of apps) {
        if (app.id === id) {
          obs.next(app);
          return;
        }
      }
      obs.error();
    });
  }

  byIds(ids: string[]): Observable<Capability[]> {
    return new Observable<Capability[]>(obs => {
      const apps = CapabilityService.load();
      const result: Capability[] = [];
      for (const app of apps) {
        if (ids.indexOf(app.id) >= 0) {
          result.push(app);
        }
      }
      obs.next(result);
    });
  }

  byName(name: string): Observable<Capability[]> {
    return new Observable<Capability[]>(obs => {
      const apps = CapabilityService.load();
      const result: Capability[] = [];
      for (const app of apps) {
        if (name === app.name) {
          result.push(app);
        }
      }
      obs.next(result);
    });
  }

  byImplementation(systemId: string): Observable<Capability[]> {
    return new Observable<Capability[]>(obs => {
      const apps = CapabilityService.load();
      const result: Capability[] = [];
      for (const app of apps) {
        if (app.implementedBy && app.implementedBy.indexOf(systemId) >= 0) {
          result.push(app);
        }
      }
      obs.next(result);
    });
  }

  create(capability: Capability): Observable<Capability> {
    return new Observable<Capability>(obs => {
      const apps = CapabilityService.load();
      // Generate id first for relationship handling
      capability.id = uuidv4();

      if (CapabilityService.isCycle(apps, capability.id, capability.parentId)) {
        obs.error(new Error('Invalid parent: would create a cycle'));
        return;
      }

      apps.push(capability);

      // Maintain parent.childrenIds
      if (capability.parentId) {
        const parent = apps.find(a => a.id === capability.parentId);
        if (parent) {
          if (!parent.childrenIds) parent.childrenIds = [];
          if (parent.childrenIds.indexOf(capability.id) === -1) {
            parent.childrenIds.push(capability.id);
          }
        }
      }

      CapabilityService.store(apps);
      obs.next(capability);
    });
  }

  update(id: string, capability: Capability): Observable<Capability> {
    return new Observable<Capability>(obs => {
      const apps = CapabilityService.load();
      const existingIndex = apps.findIndex(a => a.id === id);
      if (existingIndex === -1) { obs.error(); return; }

      const previous = apps[existingIndex];

      if (CapabilityService.isCycle(apps, id, capability.parentId)) {
        obs.error(new Error('Invalid parent: would create a cycle'));
        return;
      }

      // If parent changed, update children lists of old and new parent
      const oldParentId = previous.parentId;
      const newParentId = capability.parentId;
      if (oldParentId !== newParentId) {
        if (oldParentId) {
          const oldParent = apps.find(a => a.id === oldParentId);
          if (oldParent && oldParent.childrenIds) {
            oldParent.childrenIds = oldParent.childrenIds.filter(cid => cid !== id);
          }
        }
        if (newParentId) {
          const newParent = apps.find(a => a.id === newParentId);
          if (newParent) {
            if (!newParent.childrenIds) newParent.childrenIds = [];
            if (newParent.childrenIds.indexOf(id) === -1) newParent.childrenIds.push(id);
          }
        }
      }

      apps[existingIndex] = { ...previous, ...capability, id };

      CapabilityService.store(apps);
      obs.next(apps[existingIndex]);
    });
  }

  delete(id: string): Observable<void> {
    return new Observable<void>(obs => {
      const apps = CapabilityService.load();
      const idx = apps.findIndex(a => a.id === id);
      if (idx === -1) { obs.error(); return; }

      // Remove reference from parent if present
      const parentId = apps[idx].parentId;
      if (parentId) {
        const parent = apps.find(a => a.id === parentId);
        if (parent && parent.childrenIds) {
          parent.childrenIds = parent.childrenIds.filter(cid => cid !== id);
        }
      }

      // Note: children are left orphaned (promoted to roots). Alternative strategies can be implemented on request.
      for (const c of apps) {
        if (c.parentId === id) {
          c.parentId = undefined;
        }
      }

      apps.splice(idx, 1);
      CapabilityService.store(apps);
      obs.next();
    });
  }
}
