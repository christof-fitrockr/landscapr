import { Injectable } from '@angular/core';

import { LandscapeGraph, LandscapeLayer, LandscapeNode, landscapeNodeId } from '../models/landscape.model';
import { LandscapeService, LandscapeSource } from './landscape.service';

/** How an element or a relation changed between two states of the model */
export type ChangeState = 'unchanged' | 'added' | 'removed' | 'modified';

/** One attribute that differs between the two states of an element */
export interface AttributeChange {
  field: string;
  label: string;
  before: string | null;
  after: string | null;
}

/** One relation that was connected or disconnected */
export interface RelationChange {
  state: 'added' | 'removed';
  description: string;
  otherLabel: string;
  otherLayer: LandscapeLayer;
}

/** The change of a single element of the model */
export interface ObjectChange {
  nodeId: string;
  layer: LandscapeLayer;
  entityId: string;
  label: string;
  state: ChangeState;
  /** true when both sides changed the same element - a conflict to resolve */
  conflict: boolean;
  attributes: AttributeChange[];
  relations: RelationChange[];
}

export interface ModelDiff {
  /** every element that exists in either state, keyed by landscape node id */
  changes: { [nodeId: string]: ObjectChange };
  /** state of every relation, keyed by edge id */
  edgeStates: { [edgeId: string]: ChangeState };
  /** both states merged, so removed elements can still be drawn */
  union: LandscapeSource;
  /** the picture to draw: every element and every relation of either state */
  graph: LandscapeGraph;
  added: number;
  removed: number;
  modified: number;
  unchanged: number;
  conflicts: ObjectChange[];
}

/** The raw model as it is stored in the repository file */
export interface ModelPayload {
  processes?: any[];
  apiCalls?: any[];
  capabilities?: any[];
  applications?: any[];
  journeys?: any[];
  data?: any[];
  roles?: any[];
}

/** Fields that are noise in a business review, they never carry meaning */
const IGNORED_FIELDS = new Set(['repoId', 'favorite', 'childrenIds']);

/** Nicer names for the fields a reviewer actually reads */
const FIELD_LABELS: { [field: string]: string } = {
  name: 'Name',
  description: 'Description',
  status: 'Status',
  state: 'Status',
  tags: 'Tags',
  group: 'Group',
  role: 'Role',
  input: 'Input',
  output: 'Output',
  apiGroup: 'Function group',
  apiType: 'Function type',
  implementationStatus: 'Implementation status',
  systemCluster: 'System cluster',
  url: 'URL',
  contact: 'Contact',
  link: 'Link',
  layout: 'Diagram',
  steps: 'Process steps',
  items: 'Contents',
  expectations: 'Customer expectations'
};

@Injectable({ providedIn: 'root' })
export class ModelDiffService {

  constructor(private landscapeService: LandscapeService) {}

  /**
   * Compares two states of the whole model and says, per element and per
   * relation, what changed. Works on the objects themselves - the repository
   * file is read as a whole and compared by id, so no text diff is involved
   * and the result can never be half-parsed.
   *
   * `before` is the state in the repository, `after` the state being proposed.
   */
  compute(before: ModelPayload, after: ModelPayload): ModelDiff {
    const beforeSource = this.toSource(before);
    const afterSource = this.toSource(after);

    const beforeGraph = this.landscapeService.buildGraph(beforeSource);
    const afterGraph = this.landscapeService.buildGraph(afterSource);
    const union = this.mergeSources(beforeSource, afterSource);
    const unionGraph = this.landscapeService.buildGraph(union);

    // a relation that was cut only exists in the old state, so the union graph
    // has to take the relations of both sides - otherwise it cannot be shown
    const unionEdgeIds = new Set(unionGraph.edges.map(e => e.id));
    const unionNodeIds = new Set(unionGraph.nodes.map(n => n.id));
    [...beforeGraph.edges, ...afterGraph.edges].forEach(edge => {
      if (unionEdgeIds.has(edge.id)) return;
      if (!unionNodeIds.has(edge.from) || !unionNodeIds.has(edge.to)) return;
      unionEdgeIds.add(edge.id);
      unionGraph.edges.push({ ...edge });
    });

    const beforeEntities = this.entitiesByNodeId(beforeSource);
    const afterEntities = this.entitiesByNodeId(afterSource);

    const changes: { [nodeId: string]: ObjectChange } = {};
    let added = 0;
    let removed = 0;
    let modified = 0;
    let unchanged = 0;

    const beforeNodes = new Map(beforeGraph.nodes.map(n => [n.id, n]));
    const afterNodes = new Map(afterGraph.nodes.map(n => [n.id, n]));
    const edgeStates = this.diffEdges(beforeGraph, afterGraph, unionGraph);

    for (const node of unionGraph.nodes) {
      const inBefore = beforeNodes.get(node.id);
      const inAfter = afterNodes.get(node.id);
      const entityBefore = beforeEntities[node.id];
      const entityAfter = afterEntities[node.id];

      let state: ChangeState;
      if (!inBefore && inAfter) {
        state = 'added';
        added++;
      } else if (inBefore && !inAfter) {
        state = 'removed';
        removed++;
      } else if (this.equal(entityBefore, entityAfter)) {
        state = 'unchanged';
        unchanged++;
      } else {
        state = 'modified';
        modified++;
      }

      changes[node.id] = {
        nodeId: node.id,
        layer: node.layer,
        entityId: node.entityId,
        label: (inAfter || inBefore || node).label,
        state,
        conflict: false,
        attributes: state === 'modified' ? this.attributeChanges(entityBefore, entityAfter) : [],
        relations: state === 'unchanged' ? [] : this.relationChanges(node.id, beforeGraph, afterGraph, unionGraph)
      };
    }

    return {
      changes,
      edgeStates,
      union,
      graph: unionGraph,
      added,
      removed,
      modified,
      unchanged,
      conflicts: []
    };
  }

  /**
   * Marks the elements both sides changed at the same time. They are the ones
   * a person has to decide about; everything else can be taken over as is.
   */
  markConflicts(diff: ModelDiff, theirs: ModelPayload, mine: ModelPayload, base?: ModelPayload): ModelDiff {
    const theirEntities = this.entitiesByNodeId(this.toSource(theirs));
    const myEntities = this.entitiesByNodeId(this.toSource(mine));
    const baseEntities = base ? this.entitiesByNodeId(this.toSource(base)) : null;
    const conflicts: ObjectChange[] = [];

    Object.values(diff.changes).forEach(change => {
      const their = theirEntities[change.nodeId];
      const my = myEntities[change.nodeId];

      if (!their || !my || this.equal(their, my)) {
        change.conflict = false;
        return;
      }

      if (baseEntities) {
        // with a common ancestor only a change on both sides is a real conflict
        const original = baseEntities[change.nodeId];
        change.conflict = !this.equal(original, their) && !this.equal(original, my);
      } else {
        // without one, every element that differs needs a decision
        change.conflict = true;
      }

      if (change.conflict) {
        conflicts.push(change);
      }
    });

    diff.conflicts = conflicts;
    return diff;
  }

  /** The two versions of one element, ready to be shown side by side */
  versionsOf(nodeId: string, theirs: ModelPayload, mine: ModelPayload): {
    theirs: AttributeChange[];
    mine: AttributeChange[];
    fields: { field: string; label: string; theirs: string | null; mine: string | null; differs: boolean }[];
  } {
    const theirEntity = this.entitiesByNodeId(this.toSource(theirs))[nodeId];
    const myEntity = this.entitiesByNodeId(this.toSource(mine))[nodeId];
    const fieldNames = Array.from(new Set([
      ...Object.keys(theirEntity || {}),
      ...Object.keys(myEntity || {})
    ])).filter(field => !IGNORED_FIELDS.has(field) && field !== 'id');

    const fields = fieldNames.map(field => {
      const theirValue = this.format(field, theirEntity ? theirEntity[field] : undefined);
      const myValue = this.format(field, myEntity ? myEntity[field] : undefined);
      return {
        field,
        label: FIELD_LABELS[field] || this.humanise(field),
        theirs: theirValue,
        mine: myValue,
        differs: theirValue !== myValue
      };
    }).sort((a, b) => Number(b.differs) - Number(a.differs) || a.label.localeCompare(b.label));

    return {
      theirs: this.attributeChanges(myEntity, theirEntity),
      mine: this.attributeChanges(theirEntity, myEntity),
      fields
    };
  }

  // ---------------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------------

  private toSource(payload: ModelPayload): LandscapeSource {
    return {
      journeys: payload?.journeys || [],
      processes: payload?.processes || [],
      capabilities: payload?.capabilities || [],
      apiCalls: payload?.apiCalls || [],
      data: payload?.data || [],
      applications: payload?.applications || [],
      roles: payload?.roles || []
    };
  }

  /** Union of both states so that removed elements are still on the canvas */
  private mergeSources(before: LandscapeSource, after: LandscapeSource): LandscapeSource {
    const merge = (a: any[], b: any[]) => {
      const byId = new Map<string, any>();
      (a || []).forEach(item => byId.set(item.id, item));
      // the proposed state wins, so labels and contents show the new version
      (b || []).forEach(item => byId.set(item.id, item));
      return Array.from(byId.values());
    };

    return {
      journeys: this.mergeJourneys(before.journeys, after.journeys),
      processes: merge(before.processes, after.processes),
      capabilities: merge(before.capabilities, after.capabilities),
      apiCalls: merge(before.apiCalls, after.apiCalls),
      data: merge(before.data, after.data),
      applications: merge(before.applications, after.applications),
      roles: (after.roles && after.roles.length > 0) ? after.roles : before.roles
    };
  }

  /** Journeys need their expectations merged as well, they are elements too */
  private mergeJourneys(before: any[], after: any[]): any[] {
    const byId = new Map<string, any>();
    (before || []).forEach(journey => byId.set(journey.id, journey));

    (after || []).forEach(journey => {
      const existing = byId.get(journey.id);
      if (!existing) {
        byId.set(journey.id, journey);
        return;
      }
      const expectations = new Map<string, any>();
      (existing.layout?.expectations || []).forEach((exp: any) => expectations.set(exp.id, exp));
      (journey.layout?.expectations || []).forEach((exp: any) => expectations.set(exp.id, exp));
      byId.set(journey.id, {
        ...journey,
        layout: { ...(journey.layout || {}), expectations: Array.from(expectations.values()) }
      });
    });

    return Array.from(byId.values());
  }

  /** Every entity of the model keyed by its landscape node id */
  private entitiesByNodeId(source: LandscapeSource): { [nodeId: string]: any } {
    const map: { [nodeId: string]: any } = {};
    const add = (layer: LandscapeLayer, items: any[]) =>
      (items || []).forEach(item => { map[landscapeNodeId(layer, item.id)] = item; });

    add('journey', source.journeys);
    add('process', source.processes);
    add('capability', source.capabilities);
    add('api', source.apiCalls);
    add('data', source.data);
    add('system', source.applications);
    (source.journeys || []).forEach(journey => {
      (journey.layout?.expectations || []).forEach((exp: any) => {
        map[landscapeNodeId('experience', exp.id)] = exp;
      });
    });
    return map;
  }

  private diffEdges(before: LandscapeGraph, after: LandscapeGraph, union: LandscapeGraph): { [edgeId: string]: ChangeState } {
    const beforeIds = new Set(before.edges.map(e => e.id));
    const afterIds = new Set(after.edges.map(e => e.id));
    const states: { [edgeId: string]: ChangeState } = {};

    union.edges.forEach(edge => {
      if (!beforeIds.has(edge.id) && afterIds.has(edge.id)) {
        states[edge.id] = 'added';
      } else if (beforeIds.has(edge.id) && !afterIds.has(edge.id)) {
        states[edge.id] = 'removed';
      } else {
        states[edge.id] = 'unchanged';
      }
    });

    return states;
  }

  private relationChanges(nodeId: string, before: LandscapeGraph, after: LandscapeGraph, union: LandscapeGraph): RelationChange[] {
    const beforeIds = new Set(before.edges.filter(e => e.from === nodeId || e.to === nodeId).map(e => e.id));
    const afterIds = new Set(after.edges.filter(e => e.from === nodeId || e.to === nodeId).map(e => e.id));
    const nodes = new Map(union.nodes.map(n => [n.id, n]));
    const changes: RelationChange[] = [];

    union.edges.forEach(edge => {
      if (edge.from !== nodeId && edge.to !== nodeId) return;
      const inBefore = beforeIds.has(edge.id);
      const inAfter = afterIds.has(edge.id);
      if (inBefore === inAfter) return;

      const other = nodes.get(edge.from === nodeId ? edge.to : edge.from);
      if (!other) return;
      changes.push({
        state: inAfter ? 'added' : 'removed',
        description: edge.kind.replace(/-/g, ' '),
        otherLabel: other.label,
        otherLayer: other.layer
      });
    });

    return changes;
  }

  private attributeChanges(before: any, after: any): AttributeChange[] {
    const fields = Array.from(new Set([
      ...Object.keys(before || {}),
      ...Object.keys(after || {})
    ])).filter(field => field !== 'id' && !IGNORED_FIELDS.has(field));

    const changes: AttributeChange[] = [];
    for (const field of fields) {
      const beforeValue = this.format(field, before ? before[field] : undefined);
      const afterValue = this.format(field, after ? after[field] : undefined);
      if (beforeValue === afterValue) continue;
      changes.push({
        field,
        label: FIELD_LABELS[field] || this.humanise(field),
        before: beforeValue,
        after: afterValue
      });
    }
    return changes;
  }

  /** Turns a stored value into something a reviewer can read */
  private format(field: string, value: any): string | null {
    if (value === undefined || value === null || value === '') return null;
    if (field === 'layout') {
      // the diagram is compared as a whole, its coordinates are not a review topic
      return JSON.stringify(value).length + ' bytes of diagram';
    }
    if (Array.isArray(value)) {
      if (value.length === 0) return null;
      if (value.every(item => typeof item === 'string' || typeof item === 'number')) {
        return value.join(', ');
      }
      return `${value.length} entr${value.length === 1 ? 'y' : 'ies'}`;
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  }

  private humanise(field: string): string {
    const spaced = field.replace(/([A-Z])/g, ' $1').trim();
    return spaced.charAt(0).toUpperCase() + spaced.slice(1);
  }

  private equal(a: any, b: any): boolean {
    if (a === b) return true;
    if (!a || !b) return false;
    // fast path: unchanged objects usually come back with the same key order
    if (JSON.stringify(a) === JSON.stringify(b)) return true;
    return JSON.stringify(this.sorted(a)) === JSON.stringify(this.sorted(b));
  }

  /** Stable key order so that a re-saved file does not look changed */
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
