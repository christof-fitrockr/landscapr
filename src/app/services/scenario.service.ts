import { Injectable } from '@angular/core';
import { BehaviorSubject, from, Observable, of } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';

import { LandscaprDb } from '../db/landscapr-db';
import { LandscapeLayer, landscapeNodeId, parseLandscapeNodeId } from '../models/landscape.model';
import { PlannedChange, PlannedState, Scenario, ScenarioStatus } from '../models/scenario.model';
import { ModelPayload } from './model-diff.service';

/** Which section of the stored model an element of a layer lives in */
const SECTION_OF_LAYER: { [key in LandscapeLayer]?: keyof ModelPayload } = {
  journey: 'journeys',
  process: 'processes',
  capability: 'capabilities',
  api: 'apiCalls',
  data: 'data',
  system: 'applications'
};

const LAYER_OF_SECTION: { [section: string]: LandscapeLayer } = {
  journeys: 'journey',
  processes: 'process',
  capabilities: 'capability',
  apiCalls: 'api',
  data: 'data',
  applications: 'system'
};

const SECTIONS = Object.keys(LAYER_OF_SECTION) as (keyof ModelPayload)[];

/**
 * Keeps the target pictures and turns one of them into a model state that can
 * be drawn, compared and analysed exactly like the model of today.
 */
@Injectable({ providedIn: 'root' })
export class ScenarioService {

  static readonly STORAGE_ACTIVE = 'ls_active_scenario';

  private activeSubject = new BehaviorSubject<Scenario | null>(null);
  /** the target picture currently being looked at, null while showing today */
  readonly active$: Observable<Scenario | null> = this.activeSubject.asObservable();

  constructor(private db: LandscaprDb) {}

  get active(): Scenario | null {
    return this.activeSubject.value;
  }

  // ---------------------------------------------------------------------------
  // Storage
  // ---------------------------------------------------------------------------

  all(): Observable<Scenario[]> {
    return from(this.db.scenarios.toArray()).pipe(
      map(scenarios => (scenarios || []).sort((a, b) => a.name.localeCompare(b.name)))
    );
  }

  byId(id: string): Observable<Scenario | undefined> {
    return from(this.db.scenarios.get(id));
  }

  create(name: string, description = '', targetDate = ''): Observable<Scenario> {
    const scenario: Scenario = {
      id: uuidv4(),
      name: (name || '').trim() || 'New target picture',
      description,
      targetDate,
      status: ScenarioStatus.Draft,
      changes: {},
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    return from(this.db.scenarios.put(scenario)).pipe(map(() => scenario));
  }

  update(scenario: Scenario): Observable<Scenario> {
    const updated: Scenario = { ...scenario, updatedAt: Date.now() };
    return from(this.db.scenarios.put(updated)).pipe(
      tap(() => {
        if (this.active?.id === updated.id) {
          this.activeSubject.next(updated);
        }
      }),
      map(() => updated)
    );
  }

  delete(id: string): Observable<void> {
    return from(this.db.scenarios.delete(id)).pipe(
      tap(() => {
        if (this.active?.id === id) {
          this.deactivate();
        }
      })
    );
  }

  // ---------------------------------------------------------------------------
  // Which target picture is being looked at
  // ---------------------------------------------------------------------------

  activate(scenario: Scenario | null): void {
    try {
      if (scenario) {
        localStorage.setItem(ScenarioService.STORAGE_ACTIVE, scenario.id);
      } else {
        localStorage.removeItem(ScenarioService.STORAGE_ACTIVE);
      }
    } catch {
      // a browser without storage simply forgets the choice on reload
    }
    this.activeSubject.next(scenario);
  }

  deactivate(): void {
    this.activate(null);
  }

  /** Restores the target picture that was open before, if it still exists */
  restoreActive(): Observable<Scenario | null> {
    let storedId: string | null = null;
    try {
      storedId = localStorage.getItem(ScenarioService.STORAGE_ACTIVE);
    } catch {
      storedId = null;
    }
    if (!storedId) {
      this.activeSubject.next(null);
      return of(null);
    }
    return this.byId(storedId).pipe(
      switchMap(scenario => {
        this.activate(scenario || null);
        return of(scenario || null);
      })
    );
  }

  // ---------------------------------------------------------------------------
  // Turning a plan into a model state
  // ---------------------------------------------------------------------------

  /**
   * Applies a target picture to the model of today and returns the model as it
   * would be once the plan is reality.
   */
  applyTo(today: ModelPayload, scenario: Scenario | null): ModelPayload {
    // deep copies throughout: planning must never reach into today's elements
    const target: ModelPayload = {};
    SECTIONS.forEach(section => {
      (target as any)[section] = (((today as any)[section] || []) as any[]).map(item => this.clone(item));
    });
    target.roles = today.roles || [];

    if (!scenario) {
      return target;
    }

    Object.entries(scenario.changes).forEach(([nodeId, change]) => {
      const parsed = parseLandscapeNodeId(nodeId);
      if (!parsed) return;
      const section = SECTION_OF_LAYER[parsed.layer];
      if (!section) return;

      const items = ((target as any)[section] || []) as any[];
      const index = items.findIndex(item => item?.id === parsed.entityId);

      if (change.state === 'removed') {
        if (index >= 0) items.splice(index, 1);
        return;
      }

      if (!change.entity) return;
      const planned = this.clone(change.entity);
      if (index >= 0) {
        items[index] = planned;
      } else {
        items.push(planned);
      }
    });

    return target;
  }

  /**
   * Reads back what a changed target state means as a plan: everything that
   * differs from today becomes a planned change, everything else disappears
   * from the plan again.
   */
  deltaFrom(today: ModelPayload, target: ModelPayload): { [nodeId: string]: PlannedChange } {
    const changes: { [nodeId: string]: PlannedChange } = {};

    SECTIONS.forEach(section => {
      const layer = LAYER_OF_SECTION[section as string];
      const todayItems = new Map<string, any>(((today as any)[section] || []).map((item: any) => [item.id, item]));
      const targetItems = new Map<string, any>(((target as any)[section] || []).map((item: any) => [item.id, item]));

      targetItems.forEach((item, id) => {
        const current = todayItems.get(id);
        if (!current) {
          changes[landscapeNodeId(layer, id)] = { state: 'added', entity: this.clone(item) };
        } else if (!this.equal(current, item)) {
          changes[landscapeNodeId(layer, id)] = { state: 'modified', entity: this.clone(item) };
        }
      });

      todayItems.forEach((_item, id) => {
        if (!targetItems.has(id)) {
          changes[landscapeNodeId(layer, id)] = { state: 'removed' };
        }
      });
    });

    return changes;
  }

  /** Stores the plan that results from the given target state */
  saveTargetState(scenario: Scenario, today: ModelPayload, target: ModelPayload): Observable<Scenario> {
    const changes = this.deltaFrom(today, target);
    // notes the user wrote survive a recalculation of the plan
    Object.keys(changes).forEach(nodeId => {
      const note = scenario.changes[nodeId]?.note;
      if (note) changes[nodeId].note = note;
    });
    return this.update({ ...scenario, changes });
  }

  /** Plans an element to be dropped, or takes that plan back */
  toggleRemoval(scenario: Scenario, nodeId: string): Observable<Scenario> {
    const changes = { ...scenario.changes };
    if (changes[nodeId]?.state === 'removed') {
      delete changes[nodeId];
    } else {
      changes[nodeId] = { state: 'removed', note: changes[nodeId]?.note };
    }
    return this.update({ ...scenario, changes });
  }

  /** Drops a single planned change, bringing the element back to today's state */
  revert(scenario: Scenario, nodeId: string): Observable<Scenario> {
    const changes = { ...scenario.changes };
    delete changes[nodeId];
    return this.update({ ...scenario, changes });
  }

  plannedStateOf(scenario: Scenario | null, nodeId: string): PlannedState | null {
    return scenario?.changes[nodeId]?.state || null;
  }

  private clone<T>(value: T): T {
    return value === null || value === undefined ? value : JSON.parse(JSON.stringify(value));
  }

  private equal(a: any, b: any): boolean {
    if (a === b) return true;
    if (!a || !b) return false;
    if (JSON.stringify(a) === JSON.stringify(b)) return true;
    return JSON.stringify(this.sorted(a)) === JSON.stringify(this.sorted(b));
  }

  private sorted(value: any): any {
    if (value === null || typeof value !== 'object') return value;
    if (Array.isArray(value)) return value.map(item => this.sorted(item));
    const out: any = {};
    Object.keys(value).sort().forEach(key => {
      if (value[key] === undefined) return;
      out[key] = this.sorted(value[key]);
    });
    return out;
  }
}
