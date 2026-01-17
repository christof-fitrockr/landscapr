import {Injectable} from '@angular/core';
import {Observable, from, throwError, of} from 'rxjs';
import {map, switchMap, catchError} from 'rxjs/operators';
import {Capability} from '../models/capability';
import {v4 as uuidv4} from 'uuid';
import { LandscaprDb } from '../db/landscapr-db';

@Injectable({
  providedIn: 'root',
})
export class CapabilityService {
  public static STORAGE_KEY = 'ls_capability';

  constructor(private db: LandscaprDb) {}

  private async isCycle(nodeId: string, candidateParentId: string | undefined | null): Promise<boolean> {
    if (!candidateParentId) return false;
    if (candidateParentId === nodeId) return true;

    let cur = candidateParentId;
    while (cur) {
      if (cur === nodeId) return true;
      const parent = await this.db.capabilities.get(cur);
      if (!parent || !parent.parentId) break;
      cur = parent.parentId;
    }
    return false;
  }

  all(repoId: string): Observable<Capability[]> {
    if (repoId) {
        return from(this.db.capabilities.filter(a => a.repoId === repoId).toArray());
    }
    return from(this.db.capabilities.toArray());
  }

  roots(repoId: string): Observable<Capability[]> {
    return from(this.db.capabilities.toArray()).pipe(
        map(apps => {
             if (repoId) {
                 apps = apps.filter(a => a.repoId === repoId);
             }
             const ids = new Set(apps.map(a => a.id));
             return apps.filter(c => !c.parentId || !ids.has(c.parentId));
        })
    );
  }

  childrenOf(id: string): Observable<Capability[]> {
      return from(this.db.capabilities.where('parentId').equals(id).toArray());
  }

  byId(id: string): Observable<Capability> {
    return from(this.db.capabilities.get(id)).pipe(
        switchMap(cap => {
            if (cap) return of(cap);
            return throwError(undefined);
        })
    );
  }

  byIds(ids: string[]): Observable<Capability[]> {
    if (!ids || ids.length === 0) return of([]);
    return from(this.db.capabilities.where('id').anyOf(ids).toArray());
  }

  byName(name: string): Observable<Capability[]> {
    return from(this.db.capabilities.where('name').equals(name).toArray());
  }

  byImplementation(systemId: string): Observable<Capability[]> {
    return from(this.db.capabilities.filter(app =>
        !!(app.implementedBy && app.implementedBy.indexOf(systemId) >= 0)
    ).toArray());
  }

  create(capability: Capability): Observable<Capability> {
      capability.id = uuidv4();

      return from(this.db.transaction('rw', this.db.capabilities, async () => {
          if (await this.isCycle(capability.id, capability.parentId)) {
              throw new Error('Invalid parent: would create a cycle');
          }

          await this.db.capabilities.add(capability);

          if (capability.parentId) {
              const parent = await this.db.capabilities.get(capability.parentId);
              if (parent) {
                  if (!parent.childrenIds) parent.childrenIds = [];
                  if (parent.childrenIds.indexOf(capability.id) === -1) {
                      parent.childrenIds.push(capability.id);
                      await this.db.capabilities.put(parent);
                  }
              }
          }
          return capability;
      }));
  }

  update(id: string, capability: Capability): Observable<Capability> {
      return from(this.db.transaction('rw', this.db.capabilities, async () => {
          const previous = await this.db.capabilities.get(id);
          if (!previous) throw undefined;

          if (await this.isCycle(id, capability.parentId)) {
             throw new Error('Invalid parent: would create a cycle');
          }

          const oldParentId = previous.parentId;
          const newParentId = capability.parentId;

          if (oldParentId !== newParentId) {
             if (oldParentId) {
                 const oldParent = await this.db.capabilities.get(oldParentId);
                 if (oldParent && oldParent.childrenIds) {
                     oldParent.childrenIds = oldParent.childrenIds.filter(cid => cid !== id);
                     await this.db.capabilities.put(oldParent);
                 }
             }
             if (newParentId) {
                 const newParent = await this.db.capabilities.get(newParentId);
                 if (newParent) {
                     if (!newParent.childrenIds) newParent.childrenIds = [];
                     if (newParent.childrenIds.indexOf(id) === -1) {
                         newParent.childrenIds.push(id);
                         await this.db.capabilities.put(newParent);
                     }
                 }
             }
          }

          const updated = { ...previous, ...capability, id };
          await this.db.capabilities.put(updated);
          return updated;
      }));
  }

  delete(id: string): Observable<void> {
      return from(this.db.transaction('rw', this.db.capabilities, async () => {
          const cap = await this.db.capabilities.get(id);
          if (!cap) throw undefined;

          if (cap.parentId) {
              const parent = await this.db.capabilities.get(cap.parentId);
              if (parent && parent.childrenIds) {
                  parent.childrenIds = parent.childrenIds.filter(cid => cid !== id);
                  await this.db.capabilities.put(parent);
              }
          }

          const children = await this.db.capabilities.where('parentId').equals(id).toArray();
          for (const child of children) {
              child.parentId = undefined;
              await this.db.capabilities.put(child);
          }

          await this.db.capabilities.delete(id);
      }));
  }
}
