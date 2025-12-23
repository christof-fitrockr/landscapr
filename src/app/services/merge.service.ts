import { Injectable } from '@angular/core';

export interface LandscaprData {
  processes?: any[];
  apiCalls?: any[];
  capabilities?: any[];
  applications?: any[];
  journeys?: any[];
}

export interface SectionChoice {
  processes: 'repo' | 'local';
  apiCalls: 'repo' | 'local';
  capabilities: 'repo' | 'local';
  applications: 'repo' | 'local';
  journeys: 'repo' | 'local';
}

export type DiffStatus = 'same' | 'onlyRepo' | 'onlyLocal' | 'conflict';

export interface ItemRecord<T = any> {
  key: string;
  repoItem?: T;
  localItem?: T;
  status: DiffStatus;
}

export interface SectionDiff<T = any> {
  section: keyof LandscaprData;
  items: ItemRecord<T>[];
}

export interface ItemChoicesPerSection {
  [key: string]: 'repo' | 'local';
}

export interface AllItemChoices {
  processes: ItemChoicesPerSection;
  apiCalls: ItemChoicesPerSection;
  capabilities: ItemChoicesPerSection;
  applications: ItemChoicesPerSection;
  journeys: ItemChoicesPerSection;
}

export type DiffType = 'equal' | 'added' | 'removed' | 'changed' | 'object' | 'array';

export interface DiffNode {
  key?: string;
  type: DiffType;
  left?: any;
  right?: any;
  children?: DiffNode[];
}

@Injectable({ providedIn: 'root' })
export class MergeService {

  different(a: any, b: any): boolean {
    try {
      return JSON.stringify(a) !== JSON.stringify(b);
    } catch {
      return true;
    }
  }

  // Legacy section-level merge retained for backward compatibility
  buildMerged(repo: LandscaprData, local: LandscaprData, choice: SectionChoice): LandscaprData {
    return {
      processes: choice.processes === 'repo' ? (ensureArray(repo.processes)) : (ensureArray(local.processes)),
      apiCalls: choice.apiCalls === 'repo' ? (ensureArray(repo.apiCalls)) : (ensureArray(local.apiCalls)),
      capabilities: choice.capabilities === 'repo' ? (ensureArray(repo.capabilities)) : (ensureArray(local.capabilities)),
      applications: choice.applications === 'repo' ? (ensureArray(repo.applications)) : (ensureArray(local.applications)),
      journeys: choice.journeys === 'repo' ? (ensureArray(repo.journeys)) : (ensureArray(local.journeys)),
    };
  }

  computeDiffs(repo: LandscaprData, local: LandscaprData): { [K in keyof LandscaprData]: SectionDiff } {
    return {
      processes: this.diffSection('processes', ensureArray(repo.processes), ensureArray(local.processes)),
      apiCalls: this.diffSection('apiCalls', ensureArray(repo.apiCalls), ensureArray(local.apiCalls)),
      capabilities: this.diffSection('capabilities', ensureArray(repo.capabilities), ensureArray(local.capabilities)),
      applications: this.diffSection('applications', ensureArray(repo.applications), ensureArray(local.applications)),
      journeys: this.diffSection('journeys', ensureArray(repo.journeys), ensureArray(local.journeys)),
    } as any;
  }

  buildMergedItemLevel(repo: LandscaprData, local: LandscaprData, choices: AllItemChoices): LandscaprData {
    const diffs = this.computeDiffs(repo, local);
    const build = (section: keyof LandscaprData) => {
      const items = (diffs[section].items || []).map(rec => {
        switch (rec.status) {
          case 'same':
            // prefer local to maintain unsaved refs like UI-only props
            return rec.localItem ?? rec.repoItem;
          case 'onlyRepo':
          case 'onlyLocal':
          case 'conflict':
            const pick = (choices[section as keyof AllItemChoices] as ItemChoicesPerSection)?.[rec.key] || (rec.status === 'onlyRepo' ? 'repo' : 'local');
            return pick === 'repo' ? rec.repoItem : rec.localItem;
        }
      }).filter(Boolean);
      // Ensure stable deterministic sort by key then name if available
      return items.sort((a: any, b: any) => {
        const ka = this.keyOf(section, a);
        const kb = this.keyOf(section, b);
        if (ka !== kb) return ka < kb ? -1 : 1;
        const na = (a && (a.name || '')) as string;
        const nb = (b && (b.name || '')) as string;
        return na.localeCompare(nb);
      });
    };

    return {
      processes: build('processes'),
      apiCalls: build('apiCalls'),
      capabilities: build('capabilities'),
      applications: build('applications'),
      journeys: build('journeys'),
    };
  }

  diffSection<T = any>(section: keyof LandscaprData, repoArr: T[], localArr: T[]): SectionDiff<T> {
    const repoMap = new Map<string, T>();
    const localMap = new Map<string, T>();
    for (const r of repoArr) repoMap.set(this.keyOf(section, r), r);
    for (const l of localArr) localMap.set(this.keyOf(section, l), l);

    const keys = new Set<string>([...repoMap.keys(), ...localMap.keys()]);
    const items: ItemRecord<T>[] = [];

    for (const key of Array.from(keys)) {
      const r = repoMap.get(key);
      const l = localMap.get(key);
      let status: DiffStatus;
      if (r && l) {
        status = this.equals(section, r, l) ? 'same' : 'conflict';
      } else if (r && !l) {
        status = 'onlyRepo';
      } else if (!r && l) {
        status = 'onlyLocal';
      } else {
        // shouldn't happen because key comes from union
        continue;
      }
      items.push({ key, repoItem: r, localItem: l, status });
    }

    // sort items to have conflicts first, then only*, then same
    const rank: Record<DiffStatus, number> = { conflict: 0, onlyRepo: 1, onlyLocal: 2, same: 3 };
    items.sort((a, b) => {
      const rr = rank[a.status] - rank[b.status];
      if (rr !== 0) return rr;
      return a.key.localeCompare(b.key);
    });

    return { section, items } as SectionDiff<T>;
  }

  keyOf(section: keyof LandscaprData, item: any): string {
    if (!item) return '';
    // Prefer stable `id` if present, otherwise `repoId` or `name`
    return (item.id || item.repoId || item.name || JSON.stringify(item)).toString();
  }

  equals(section: keyof LandscaprData, a: any, b: any): boolean {
    try {
      return JSON.stringify(clean(a)) === JSON.stringify(clean(b));
    } catch {
      return false;
    }
  }

  // Compute a structured diff for a single item (repo vs local)
  computeItemDiff(section: keyof LandscaprData, left: any, right: any): DiffNode {
    return this.diffAny(section, undefined, left, right);
  }

  private diffAny(section: keyof LandscaprData, key: string | undefined, left: any, right: any): DiffNode {
    const lIsObj = left !== null && typeof left === 'object';
    const rIsObj = right !== null && typeof right === 'object';

    // Equal (fast path)
    if (this.equals(section, left, right)) {
      return { key, type: 'equal', left, right };
    }

    // Only on one side
    if (left !== undefined && right === undefined) {
      return { key, type: 'added', left, right };
    }
    if (left === undefined && right !== undefined) {
      return { key, type: 'removed', left, right };
    }

    // Mixed types -> changed
    if (lIsObj !== rIsObj) {
      return { key, type: 'changed', left, right };
    }

    // Both objects or arrays
    if (Array.isArray(left) && Array.isArray(right)) {
      return this.diffArray(section, key, left, right);
    }
    if (lIsObj && rIsObj) {
      return this.diffObject(section, key, left, right);
    }

    // Primitives differ
    return { key, type: 'changed', left, right };
  }

  private diffObject(section: keyof LandscaprData, key: string | undefined, left: any, right: any): DiffNode {
    const keys = Array.from(new Set([ ...Object.keys(left || {}), ...Object.keys(right || {}) ])).sort();
    const children: DiffNode[] = [];
    for (const k of keys) {
      if (left && left[k] === undefined && right && right[k] === undefined) continue;
      children.push(this.diffAny(section, k, left ? left[k] : undefined, right ? right[k] : undefined));
    }
    return { key, type: 'object', left, right, children };
  }

  private diffArray(section: keyof LandscaprData, key: string | undefined, left: any[], right: any[]): DiffNode {
    // Align array items by identity if objects, else by index
    const children: DiffNode[] = [];
    const leftMap = new Map<string, any>();
    const rightMap = new Map<string, any>();

    const itemsAreObjects = left.some(v => v && typeof v === 'object') || right.some(v => v && typeof v === 'object');

    if (itemsAreObjects) {
      for (const item of left) {
        const k = this.keyOf(section, item);
        leftMap.set(k, item);
      }
      for (const item of right) {
        const k = this.keyOf(section, item);
        rightMap.set(k, item);
      }
      const allKeys = Array.from(new Set([ ...leftMap.keys(), ...rightMap.keys() ])).sort();
      for (const k of allKeys) {
        children.push(this.diffAny(section, k, leftMap.get(k), rightMap.get(k)));
      }
    } else {
      const max = Math.max(left.length, right.length);
      for (let i = 0; i < max; i++) {
        children.push(this.diffAny(section, String(i), left[i], right[i]));
      }
    }

    return { key, type: 'array', left, right, children };
  }
}

function ensureArray<T>(v: T[] | any): T[] {
  return Array.isArray(v) ? v : (v ? v : []);
}

function clean(obj: any): any {
  // Shallow cleanup: remove undefined, reorder keys deterministically
  if (obj == null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(clean);
  const out: any = {};
  for (const k of Object.keys(obj).sort()) {
    const val = obj[k];
    if (val === undefined) continue;
    out[k] = clean(val);
  }
  return out;
}
