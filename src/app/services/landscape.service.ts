import { Injectable } from '@angular/core';
import { forkJoin, from, Observable, throwError } from 'rxjs';
import { map, switchMap, take } from 'rxjs/operators';

import { LandscaprDb } from '../db/landscapr-db';
import { Application } from '../models/application';
import { ApiCall, ApiImplementationStatus, ApiType, DataStatus } from '../models/api-call';
import { Capability } from '../models/capability';
import { Data } from '../models/data';
import { Journey, JourneyLayoutNode } from '../models/journey.model';
import { Process, Status, Step } from '../models/process';
import { Role } from '../models/role';
import {
  DEFAULT_LANDSCAPE_VIEW_ID,
  LandscapeEdge,
  LandscapeEdgeKind,
  LandscapeGraph,
  LandscapeImpact,
  LandscapeLayer,
  LandscapeNode,
  LandscapeView,
  LANDSCAPE_LAYERS,
  landscapeNodeId
} from '../models/landscape.model';

import { ApiCallService } from './api-call.service';
import { ApplicationService } from './application.service';
import { CapabilityService } from './capability.service';
import { DataService } from './data.service';
import { JourneyService } from './journey.service';
import { ProcessService } from './process.service';
import { RoleService } from './role.service';

/** Snapshot of every entity the landscape editor works on */
export interface LandscapeSource {
  journeys: Journey[];
  processes: Process[];
  capabilities: Capability[];
  apiCalls: ApiCall[];
  data: Data[];
  applications: Application[];
  roles: Role[];
}

/** A horizontal band of the landscape, one per visible layer */
export interface LandscapeBand {
  layer: LandscapeLayer;
  y: number;
  height: number;
  x: number;
  width: number;
  count: number;
}

export const LANDSCAPE_NODE_WIDTH = 170;
export const LANDSCAPE_NODE_HEIGHT = 54;

const NODE_GAP_X = 26;
const NODE_GAP_Y = 18;
const BAND_GAP = 54;
const BAND_PADDING = 22;
const MAX_NODES_PER_ROW = 12;

@Injectable({ providedIn: 'root' })
export class LandscapeService {

  constructor(
    private db: LandscaprDb,
    private journeyService: JourneyService,
    private processService: ProcessService,
    private capabilityService: CapabilityService,
    private apiCallService: ApiCallService,
    private dataService: DataService,
    private applicationService: ApplicationService,
    private roleService: RoleService
  ) {}

  // ---------------------------------------------------------------------------
  // Loading
  // ---------------------------------------------------------------------------

  /** Loads every entity of the model in one go */
  load(): Observable<LandscapeSource> {
    return forkJoin({
      journeys: this.journeyService.all().pipe(take(1)),
      processes: this.processService.all().pipe(take(1)),
      capabilities: this.capabilityService.all(null as any).pipe(take(1)),
      apiCalls: this.apiCallService.all().pipe(take(1)),
      data: this.dataService.all().pipe(take(1)),
      applications: this.applicationService.all(null as any).pipe(take(1)),
      roles: this.roleService.getAll().pipe(take(1))
    }).pipe(
      map(source => ({
        journeys: source.journeys || [],
        processes: source.processes || [],
        capabilities: source.capabilities || [],
        apiCalls: source.apiCalls || [],
        data: source.data || [],
        applications: source.applications || [],
        roles: source.roles || []
      }))
    );
  }

  // ---------------------------------------------------------------------------
  // Graph
  // ---------------------------------------------------------------------------

  /**
   * Turns the entities into one graph. Every edge mirrors a field of the
   * entities, so the entities remain the single source of truth.
   */
  buildGraph(source: LandscapeSource): LandscapeGraph {
    const nodes: LandscapeNode[] = [];
    const edges: LandscapeEdge[] = [];
    const known = new Set<string>();
    const roleNames = new Map((source.roles || []).map(r => [String(r.id), r.name]));

    const addNode = (layer: LandscapeLayer, entityId: string, label: string, sublabel?: string, draft?: boolean) => {
      const id = landscapeNodeId(layer, entityId);
      if (known.has(id)) return;
      known.add(id);
      nodes.push({
        id,
        layer,
        entityId,
        label: label || '(unnamed)',
        sublabel,
        draft,
        x: 0,
        y: 0,
        width: LANDSCAPE_NODE_WIDTH,
        height: LANDSCAPE_NODE_HEIGHT
      });
    };

    const edgeIds = new Set<string>();
    const addEdge = (from: string, to: string, kind: LandscapeEdgeKind, label?: string) => {
      if (!known.has(from) || !known.has(to) || from === to) return;
      const id = `${kind}|${from}|${to}`;
      if (edgeIds.has(id)) return;
      edgeIds.add(id);
      edges.push({ id, from, to, kind, label });
    };

    // --- nodes -------------------------------------------------------------
    source.journeys.forEach(j => {
      const steps = (j.layout?.nodes || []).filter(n => n.type === 'process').length;
      addNode('journey', j.id, j.name, `${steps} step${steps === 1 ? '' : 's'}`, j.status === 0);
      (j.layout?.expectations || []).forEach(exp => {
        const label = exp.title || exp.expectation;
        const detail = [exp.persona, exp.fulfilment].filter(v => !!v && v !== 'unknown').join(' · ');
        addNode('experience', exp.id, label, detail || 'not assessed');
      });
    });

    source.processes.forEach(p => {
      const role = roleNames.get(String(p.role));
      const functions = (p.apiCallIds || []).length;
      addNode('process', p.id, p.name, role || `${functions} function${functions === 1 ? '' : 's'}`, p.status === Status.Draft);
    });

    source.capabilities.forEach(c => addNode('capability', c.id, c.name, undefined, c.status === 0));
    source.apiCalls.forEach(a => addNode('api', a.id, a.name, a.apiGroup, a.status === 0));
    source.data.forEach(d => addNode('data', d.id, d.name, d.group, d.state === 0));
    source.applications.forEach(s => addNode('system', s.id, s.name, s.systemCluster, s.status === 0));

    // --- edges -------------------------------------------------------------
    source.journeys.forEach(j => {
      const journeyNode = landscapeNodeId('journey', j.id);
      const layoutNodes = new Map<string, JourneyLayoutNode>((j.layout?.nodes || []).map(n => [n.id, n]));

      (j.layout?.nodes || []).forEach(n => {
        if (n.type === 'process' && n.processId) {
          addEdge(journeyNode, landscapeNodeId('process', n.processId), 'journey-step');
        }
      });

      (j.layout?.expectations || []).forEach(exp => {
        const expNode = landscapeNodeId('experience', exp.id);
        addEdge(expNode, journeyNode, 'expectation-of-journey');
        const step = layoutNodes.get(exp.nodeId);
        if (step && step.type === 'process' && step.processId) {
          addEdge(expNode, landscapeNodeId('process', step.processId), 'expectation-of-step');
        }
      });
    });

    source.processes.forEach(p => {
      const processNode = landscapeNodeId('process', p.id);
      (p.steps || []).forEach(step => {
        if (step.processReference) {
          addEdge(processNode, landscapeNodeId('process', step.processReference), 'sub-process');
        }
        if (step.apiCallReference) {
          addEdge(processNode, landscapeNodeId('api', step.apiCallReference), 'process-function');
        }
      });
      (p.apiCallIds || []).forEach(apiId => addEdge(processNode, landscapeNodeId('api', apiId), 'process-function'));
      (p.implementedBy || []).forEach(systemId => addEdge(processNode, landscapeNodeId('system', systemId), 'implemented-by'));
    });

    source.capabilities.forEach(c => {
      const capNode = landscapeNodeId('capability', c.id);
      if (c.parentId) {
        addEdge(landscapeNodeId('capability', c.parentId), capNode, 'capability-parent');
      }
      (c.implementedBy || []).forEach(systemId => addEdge(capNode, landscapeNodeId('system', systemId), 'implemented-by'));
    });

    source.apiCalls.forEach(a => {
      const apiNode = landscapeNodeId('api', a.id);
      if (a.capabilityId) {
        addEdge(apiNode, landscapeNodeId('capability', a.capabilityId), 'function-capability');
      }
      (a.inputData || []).forEach(ref => {
        if (ref?.dataId) addEdge(landscapeNodeId('data', ref.dataId), apiNode, 'function-input', 'in');
      });
      (a.outputData || []).forEach(ref => {
        if (ref?.dataId) addEdge(apiNode, landscapeNodeId('data', ref.dataId), 'function-output', 'out');
      });
      (a.implementedBy || []).forEach(systemId => addEdge(apiNode, landscapeNodeId('system', systemId), 'implemented-by'));
    });

    source.data.forEach(d => {
      const dataNode = landscapeNodeId('data', d.id);
      if (d.parentId) {
        addEdge(landscapeNodeId('data', d.parentId), dataNode, 'data-reference');
      }
      (d.items || []).forEach(item => {
        if (item?.dataId) addEdge(dataNode, landscapeNodeId('data', item.dataId), 'data-reference');
      });
    });

    return { nodes, edges };
  }

  // ---------------------------------------------------------------------------
  // Layout
  // ---------------------------------------------------------------------------

  /**
   * Arranges the nodes in one band per layer. Nodes are ordered by their
   * connections to the layer above so that edges cross as little as possible.
   * Manually placed nodes keep their stored position.
   */
  layout(graph: LandscapeGraph, view: LandscapeView): LandscapeBand[] {
    const positions = view?.positions || {};
    const byLayer = new Map<LandscapeLayer, LandscapeNode[]>();
    graph.nodes.forEach(n => {
      const list = byLayer.get(n.layer) || [];
      list.push(n);
      byLayer.set(n.layer, list);
    });

    const neighbours = new Map<string, string[]>();
    graph.edges.forEach(e => {
      neighbours.set(e.from, [...(neighbours.get(e.from) || []), e.to]);
      neighbours.set(e.to, [...(neighbours.get(e.to) || []), e.from]);
    });

    const bands: LandscapeBand[] = [];
    const orderIndex = new Map<string, number>();
    let bandTop = 0;

    for (const layer of LANDSCAPE_LAYERS) {
      const list = byLayer.get(layer);
      if (!list || list.length === 0) continue;

      // order by the average position of already placed neighbours
      const barycenter = (node: LandscapeNode): number => {
        const placed = (neighbours.get(node.id) || [])
          .map(id => orderIndex.get(id))
          .filter(index => index !== undefined) as number[];
        if (placed.length === 0) return Number.MAX_SAFE_INTEGER;
        return placed.reduce((sum, index) => sum + index, 0) / placed.length;
      };
      const withKey = list.map(node => ({ node, key: barycenter(node) }));
      withKey.sort((a, b) => (a.key - b.key) || a.node.label.localeCompare(b.node.label));

      const rows = Math.ceil(withKey.length / MAX_NODES_PER_ROW);
      const perRow = Math.ceil(withKey.length / rows);
      const bandHeight = rows * LANDSCAPE_NODE_HEIGHT + (rows - 1) * NODE_GAP_Y + 2 * BAND_PADDING;

      withKey.forEach((entry, index) => {
        const row = Math.floor(index / perRow);
        const column = index % perRow;
        const node = entry.node;
        orderIndex.set(node.id, index);

        const autoX = column * (LANDSCAPE_NODE_WIDTH + NODE_GAP_X);
        const autoY = bandTop + BAND_PADDING + row * (LANDSCAPE_NODE_HEIGHT + NODE_GAP_Y);
        const manual = positions[node.id];
        node.pinned = !!manual;
        node.x = manual ? manual.x : autoX;
        node.y = manual ? manual.y : autoY;
      });

      bands.push({ layer, y: bandTop, height: bandHeight, x: 0, width: 0, count: withKey.length });
      bandTop += bandHeight + BAND_GAP;
    }

    // stretch all bands over the full content width
    let minX = 0;
    let maxX = LANDSCAPE_NODE_WIDTH;
    graph.nodes.forEach(n => {
      minX = Math.min(minX, n.x);
      maxX = Math.max(maxX, n.x + n.width);
    });
    bands.forEach(band => {
      band.x = minX - BAND_PADDING;
      band.width = (maxX - minX) + 2 * BAND_PADDING;
    });

    return bands;
  }

  // ---------------------------------------------------------------------------
  // Impact analysis
  // ---------------------------------------------------------------------------

  /**
   * For every kind of relation: which of its two ends depends on the other.
   * `from` means the element the edge starts at breaks when the other one goes
   * away, `to` means the other way round.
   */
  private readonly DEPENDENT_END: { [key in LandscapeEdgeKind]: 'from' | 'to' } = {
    'expectation-of-journey': 'from', // the expectation lives in the journey
    'expectation-of-step': 'from',    // the expectation hangs on that step
    'journey-step': 'from',           // the journey needs the process
    'sub-process': 'from',            // the parent process needs the sub process
    'process-function': 'from',       // the process needs the function
    'function-capability': 'from',    // the function is filed under the capability
    'capability-parent': 'to',        // the sub capability needs its parent
    'function-input': 'to',           // the function reads the data
    'function-output': 'to',          // the data is produced by the function
    'data-reference': 'from',         // the referencing object needs the target
    'implemented-by': 'from'          // the element needs the system
  };

  /**
   * Everything that would be affected if the given element changed or was
   * retired - the blast radius. Walks the model against the direction of
   * dependency, so it ends up at the customer journeys and expectations.
   */
  impactOf(graph: LandscapeGraph, nodeId: string): LandscapeImpact[] {
    return this.walk(graph, nodeId, 'dependents');
  }

  /**
   * Everything the given element relies on - its functions, data objects and
   * systems further down the model.
   */
  dependenciesOf(graph: LandscapeGraph, nodeId: string): LandscapeImpact[] {
    return this.walk(graph, nodeId, 'dependencies');
  }

  private walk(graph: LandscapeGraph, nodeId: string, direction: 'dependents' | 'dependencies'): LandscapeImpact[] {
    const nodes = new Map(graph.nodes.map(n => [n.id, n]));
    if (!nodes.has(nodeId)) return [];

    const found = new Map<string, number>();
    let frontier = [nodeId];
    let distance = 0;

    while (frontier.length > 0 && distance < 12) {
      distance++;
      const next: string[] = [];

      for (const currentId of frontier) {
        for (const edge of graph.edges) {
          const dependentEnd = this.DEPENDENT_END[edge.kind] || 'from';
          const dependent = dependentEnd === 'from' ? edge.from : edge.to;
          const dependsOn = dependentEnd === 'from' ? edge.to : edge.from;

          const step = direction === 'dependents'
            ? (dependsOn === currentId ? dependent : null)
            : (dependent === currentId ? dependsOn : null);

          if (!step || step === nodeId || found.has(step)) continue;
          found.set(step, distance);
          next.push(step);
        }
      }
      frontier = next;
    }

    return Array.from(found.entries())
      .map(([id, dist]) => ({ node: nodes.get(id)!, distance: dist }))
      .filter(entry => !!entry.node)
      .sort((a, b) => a.distance - b.distance
        || LANDSCAPE_LAYERS.indexOf(a.node.layer) - LANDSCAPE_LAYERS.indexOf(b.node.layer)
        || a.node.label.localeCompare(b.node.label));
  }

  // ---------------------------------------------------------------------------
  // Relations
  // ---------------------------------------------------------------------------

  /** The relation that dragging from one layer to another creates, if any */
  resolveLinkKind(from: LandscapeLayer, to: LandscapeLayer): LandscapeEdgeKind | null {
    const pair = (a: LandscapeLayer, b: LandscapeLayer) => (from === a && to === b) || (from === b && to === a);

    if (pair('journey', 'process')) return 'journey-step';
    if (from === 'process' && to === 'process') return 'sub-process';
    if (pair('process', 'api')) return 'process-function';
    if (pair('api', 'capability')) return 'function-capability';
    if (from === 'capability' && to === 'capability') return 'capability-parent';
    if (from === 'api' && to === 'data') return 'function-output';
    if (from === 'data' && to === 'api') return 'function-input';
    if (pair('system', 'process') || pair('system', 'capability') || pair('system', 'api')) return 'implemented-by';
    return null;
  }

  /** True for relations that can be created and removed on the canvas */
  isEditableKind(kind: LandscapeEdgeKind): boolean {
    return kind !== 'expectation-of-journey' && kind !== 'expectation-of-step' && kind !== 'data-reference';
  }

  /** Creates the relation behind an edge by writing it into the entities */
  link(source: LandscapeSource, from: LandscapeNode, to: LandscapeNode): Observable<void> {
    const kind = this.resolveLinkKind(from.layer, to.layer);
    if (!kind) {
      return throwError(new Error('These two elements cannot be connected'));
    }

    const pick = (layer: LandscapeLayer) => (from.layer === layer ? from : to);
    const other = (layer: LandscapeLayer) => (from.layer === layer ? to : from);

    switch (kind) {
      case 'journey-step':
        return this.addJourneyStep(source, pick('journey').entityId, other('journey').entityId);
      case 'sub-process':
        return this.addSubProcess(source, from.entityId, to.entityId);
      case 'process-function':
        return this.updateProcess(source, pick('process').entityId, process => {
          const apiId = other('process').entityId;
          process.apiCallIds = [...(process.apiCallIds || [])];
          if (process.apiCallIds.indexOf(apiId) < 0) process.apiCallIds.push(apiId);
        });
      case 'function-capability':
        return this.updateApiCall(source, pick('api').entityId, api => {
          api.capabilityId = other('api').entityId;
        });
      case 'capability-parent':
        return this.setCapabilityParent(source, to.entityId, from.entityId);
      case 'function-output':
        return this.updateApiCall(source, from.entityId, api => {
          api.outputData = [...(api.outputData || [])];
          if (!api.outputData.some(ref => ref?.dataId === to.entityId)) {
            api.outputData.push({ dataId: to.entityId });
          }
        });
      case 'function-input':
        return this.updateApiCall(source, to.entityId, api => {
          api.inputData = [...(api.inputData || [])];
          if (!api.inputData.some(ref => ref?.dataId === from.entityId)) {
            api.inputData.push({ dataId: from.entityId });
          }
        });
      case 'implemented-by': {
        const systemId = pick('system').entityId;
        const target = other('system');
        return this.addImplementedBy(source, target, systemId);
      }
      default:
        return throwError(new Error('This relation cannot be edited here'));
    }
  }

  /** Removes the relation behind an edge from the entities */
  unlink(source: LandscapeSource, edge: LandscapeEdge, from: LandscapeNode, to: LandscapeNode): Observable<void> {
    switch (edge.kind) {
      case 'journey-step':
        return this.updateJourney(source, from.entityId, journey => {
          if (!journey.layout) return;
          const removed = (journey.layout.nodes || [])
            .filter(n => n.type === 'process' && n.processId === to.entityId)
            .map(n => n.id);
          const removedIds = new Set(removed);
          journey.layout.nodes = (journey.layout.nodes || []).filter(n => !removedIds.has(n.id));
          journey.layout.edges = (journey.layout.edges || []).filter(e => !removedIds.has(e.from) && !removedIds.has(e.to));
          journey.layout.expectations = (journey.layout.expectations || []).filter(e => !removedIds.has(e.nodeId));
        });
      case 'sub-process':
        return this.updateProcess(source, from.entityId, process => {
          process.steps = (process.steps || []).filter(step => step.processReference !== to.entityId);
        });
      case 'process-function':
        return this.updateProcess(source, from.entityId, process => {
          process.apiCallIds = (process.apiCallIds || []).filter(id => id !== to.entityId);
          process.steps = (process.steps || []).filter(step => step.apiCallReference !== to.entityId);
        });
      case 'function-capability':
        return this.updateApiCall(source, from.entityId, api => {
          api.capabilityId = '';
        });
      case 'capability-parent':
        return this.setCapabilityParent(source, to.entityId, undefined);
      case 'function-output':
        return this.updateApiCall(source, from.entityId, api => {
          api.outputData = (api.outputData || []).filter(ref => ref?.dataId !== to.entityId);
        });
      case 'function-input':
        return this.updateApiCall(source, to.entityId, api => {
          api.inputData = (api.inputData || []).filter(ref => ref?.dataId !== from.entityId);
        });
      case 'implemented-by':
        return this.removeImplementedBy(source, from, to.entityId);
      default:
        return throwError(new Error('This relation is derived and cannot be removed here'));
    }
  }

  // ---------------------------------------------------------------------------
  // Creating and updating elements
  // ---------------------------------------------------------------------------

  /** Creates an empty element of the given layer and adds it to the snapshot */
  createElement(source: LandscapeSource, layer: LandscapeLayer, name: string): Observable<LandscapeNode> {
    const label = (name || '').trim() || `New ${layer}`;

    switch (layer) {
      case 'journey': {
        const journey: Journey = {
          id: undefined as any,
          name: label,
          description: '',
          items: [],
          connections: [],
          status: 0,
          tags: [],
          layout: { nodes: [], edges: [], panX: 0, panY: 0, zoom: 1, expectations: [], showExperienceLayer: true }
        };
        return this.journeyService.create(journey).pipe(map(created => {
          source.journeys.push(created);
          return this.nodeFor('journey', created.id, created.name, '0 steps', true);
        }));
      }
      case 'process': {
        const process: Process = {
          id: undefined as any,
          repoId: '',
          name: label,
          description: '',
          status: Status.Draft,
          input: '',
          output: '',
          tags: [],
          role: undefined as any,
          steps: [],
          apiCallIds: [],
          favorite: false,
          implementedBy: []
        };
        return this.processService.create(process).pipe(map(created => {
          source.processes.push(created);
          return this.nodeFor('process', created.id, created.name, '0 functions', true);
        }));
      }
      case 'capability': {
        const capability: Capability = {
          id: undefined as any,
          repoId: '',
          name: label,
          description: '',
          implementedBy: [],
          status: 0,
          tags: []
        } as Capability;
        return this.capabilityService.create(capability).pipe(map(created => {
          source.capabilities.push(created);
          return this.nodeFor('capability', created.id, created.name, undefined, true);
        }));
      }
      case 'api': {
        const apiCall: ApiCall = {
          id: undefined as any,
          repoId: '',
          name: label,
          description: '',
          docLinkUrl: '',
          capabilityId: '',
          implementationStatus: ApiImplementationStatus.Gap,
          implementedBy: [],
          input: '',
          output: '',
          inputData: [],
          outputData: [],
          tags: [],
          apiType: ApiType.Business,
          status: DataStatus.Draft
        } as ApiCall;
        return this.apiCallService.create(apiCall).pipe(map(created => {
          source.apiCalls.push(created);
          return this.nodeFor('api', created.id, created.name, undefined, true);
        }));
      }
      case 'data': {
        const data: Data = {
          id: undefined as any,
          name: label,
          description: '',
          group: '',
          state: DataStatus.Draft,
          link: '',
          items: []
        } as Data;
        return this.dataService.create(data).pipe(map(created => {
          source.data.push(created);
          return this.nodeFor('data', created.id, created.name, undefined, true);
        }));
      }
      case 'system': {
        const system: Application = {
          id: undefined as any,
          repoId: '',
          name: label,
          description: '',
          contact: '',
          url: '',
          systemCluster: '',
          tags: [],
          status: DataStatus.Draft
        } as Application;
        return this.applicationService.create(system).pipe(map(created => {
          source.applications.push(created);
          return this.nodeFor('system', created.id, created.name, undefined, true);
        }));
      }
      default:
        return throwError(new Error('Elements of this layer are created inside their parent element'));
    }
  }

  /** Writes the edited base fields of an element back to its entity */
  updateElement(source: LandscapeSource, node: LandscapeNode, values: LandscapeElementValues): Observable<void> {
    const name = (values.name || '').trim();
    switch (node.layer) {
      case 'journey':
        return this.updateJourney(source, node.entityId, journey => {
          journey.name = name || journey.name;
          journey.description = values.description ?? journey.description;
          journey.status = values.status ?? journey.status;
          journey.tags = values.tags ?? journey.tags;
        });
      case 'process':
        return this.updateProcess(source, node.entityId, process => {
          process.name = name || process.name;
          process.description = values.description ?? process.description;
          process.status = (values.status ?? process.status) as Status;
          process.tags = values.tags ?? process.tags;
        });
      case 'capability':
        return this.updateCapability(source, node.entityId, capability => {
          capability.name = name || capability.name;
          capability.description = values.description ?? capability.description;
          capability.status = values.status ?? capability.status;
          capability.tags = values.tags ?? capability.tags;
        });
      case 'api':
        return this.updateApiCall(source, node.entityId, api => {
          api.name = name || api.name;
          api.description = values.description ?? api.description;
          api.status = values.status ?? api.status;
          api.tags = values.tags ?? api.tags;
        });
      case 'data':
        return this.updateData(source, node.entityId, data => {
          data.name = name || data.name;
          data.description = values.description ?? data.description;
          data.state = values.status ?? data.state;
          data.group = values.group ?? data.group;
        });
      case 'system':
        return this.updateApplication(source, node.entityId, system => {
          system.name = name || system.name;
          system.description = values.description ?? system.description;
          system.status = values.status ?? system.status;
          system.tags = values.tags ?? system.tags;
        });
      case 'experience':
        return this.updateExpectation(source, node.entityId, values);
      default:
        return throwError(new Error('This element cannot be edited here'));
    }
  }

  // ---------------------------------------------------------------------------
  // View persistence
  // ---------------------------------------------------------------------------

  /** True once a view has been stored, i.e. the landscape was opened before */
  hasView(id: string = DEFAULT_LANDSCAPE_VIEW_ID): Observable<boolean> {
    return from(this.db.landscapeViews.get(id)).pipe(map(view => !!view));
  }

  loadView(id: string = DEFAULT_LANDSCAPE_VIEW_ID): Observable<LandscapeView> {
    return from(this.db.landscapeViews.get(id)).pipe(
      map(view => view || { id, positions: {}, hiddenLayers: [], panX: 40, panY: 40, zoom: 0.8 })
    );
  }

  saveView(view: LandscapeView): Observable<void> {
    return from(this.db.landscapeViews.put(view)).pipe(map(() => undefined));
  }

  // ---------------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------------

  private nodeFor(layer: LandscapeLayer, entityId: string, label: string, sublabel?: string, draft?: boolean): LandscapeNode {
    return {
      id: landscapeNodeId(layer, entityId),
      layer,
      entityId,
      label,
      sublabel,
      draft,
      x: 0,
      y: 0,
      width: LANDSCAPE_NODE_WIDTH,
      height: LANDSCAPE_NODE_HEIGHT
    };
  }

  private addJourneyStep(source: LandscapeSource, journeyId: string, processId: string): Observable<void> {
    const process = source.processes.find(p => p.id === processId);
    return this.updateJourney(source, journeyId, journey => {
      if (!journey.layout) {
        journey.layout = { nodes: [], edges: [], panX: 0, panY: 0, zoom: 1 };
      }
      const nodes = journey.layout.nodes || [];
      if (nodes.some(n => n.type === 'process' && n.processId === processId)) return;
      const right = nodes.reduce((max, n) => Math.max(max, n.x + n.width), 0);
      journey.layout.nodes = [...nodes, {
        id: 'proc_' + Math.random().toString(36).substring(2, 9),
        type: 'process',
        label: process?.name || 'Process',
        x: nodes.length === 0 ? 100 : right + 80,
        y: 400,
        width: 120,
        height: 60,
        processId
      }];
    });
  }

  private addSubProcess(source: LandscapeSource, parentId: string, childId: string): Observable<void> {
    return this.updateProcess(source, parentId, parent => {
      const steps = parent.steps || [];
      if (steps.some(step => step.processReference === childId)) return;
      const step = new Step();
      step.processReference = childId;
      step.successors = [];
      parent.steps = [...steps, step];
    });
  }

  private addImplementedBy(source: LandscapeSource, target: LandscapeNode, systemId: string): Observable<void> {
    const add = (list: string[] | undefined): string[] => {
      const next = [...(list || [])];
      if (next.indexOf(systemId) < 0) next.push(systemId);
      return next;
    };
    switch (target.layer) {
      case 'process':
        return this.updateProcess(source, target.entityId, p => { p.implementedBy = add(p.implementedBy); });
      case 'capability':
        return this.updateCapability(source, target.entityId, c => { c.implementedBy = add(c.implementedBy); });
      case 'api':
        return this.updateApiCall(source, target.entityId, a => { a.implementedBy = add(a.implementedBy); });
      default:
        return throwError(new Error('This element cannot be implemented by a system'));
    }
  }

  private removeImplementedBy(source: LandscapeSource, target: LandscapeNode, systemId: string): Observable<void> {
    const remove = (list: string[] | undefined): string[] => (list || []).filter(id => id !== systemId);
    switch (target.layer) {
      case 'process':
        return this.updateProcess(source, target.entityId, p => { p.implementedBy = remove(p.implementedBy); });
      case 'capability':
        return this.updateCapability(source, target.entityId, c => { c.implementedBy = remove(c.implementedBy); });
      case 'api':
        return this.updateApiCall(source, target.entityId, a => { a.implementedBy = remove(a.implementedBy); });
      default:
        return throwError(new Error('This relation cannot be removed here'));
    }
  }

  private setCapabilityParent(source: LandscapeSource, childId: string, parentId: string | undefined): Observable<void> {
    return this.updateCapability(source, childId, child => { child.parentId = parentId; });
  }

  private updateExpectation(source: LandscapeSource, expectationId: string, values: LandscapeElementValues): Observable<void> {
    const journey = source.journeys.find(j => (j.layout?.expectations || []).some(e => e.id === expectationId));
    if (!journey) {
      return throwError(new Error('Expectation not found'));
    }
    return this.updateJourney(source, journey.id, updated => {
      updated.layout!.expectations = (updated.layout!.expectations || []).map(exp => exp.id === expectationId
        ? { ...exp, title: (values.name || '').trim() || exp.title, expectation: values.description ?? exp.expectation }
        : exp);
    });
  }

  private updateJourney(source: LandscapeSource, id: string, mutate: (journey: Journey) => void): Observable<void> {
    const journey = source.journeys.find(j => j.id === id);
    if (!journey) return throwError(new Error('Journey not found'));
    mutate(journey);
    return this.journeyService.update(id, journey).pipe(map(() => undefined));
  }

  private updateProcess(source: LandscapeSource, id: string, mutate: (process: Process) => void): Observable<void> {
    const process = source.processes.find(p => p.id === id);
    if (!process) return throwError(new Error('Process not found'));
    mutate(process);
    return this.processService.update(id, process).pipe(map(() => undefined));
  }

  private updateCapability(source: LandscapeSource, id: string, mutate: (capability: Capability) => void): Observable<void> {
    const capability = source.capabilities.find(c => c.id === id);
    if (!capability) return throwError(new Error('Capability not found'));
    mutate(capability);
    return this.capabilityService.update(id, capability).pipe(
      switchMap(() => this.capabilityService.all(null as any).pipe(take(1))),
      map(all => {
        // the service maintains parent/children links, so take the stored state back
        source.capabilities.splice(0, source.capabilities.length, ...(all || []));
        return undefined;
      })
    );
  }

  private updateApiCall(source: LandscapeSource, id: string, mutate: (apiCall: ApiCall) => void): Observable<void> {
    const apiCall = source.apiCalls.find(a => a.id === id);
    if (!apiCall) return throwError(new Error('Function not found'));
    mutate(apiCall);
    return this.apiCallService.update(id, apiCall).pipe(map(() => undefined));
  }

  private updateData(source: LandscapeSource, id: string, mutate: (data: Data) => void): Observable<void> {
    const data = source.data.find(d => d.id === id);
    if (!data) return throwError(new Error('Data object not found'));
    mutate(data);
    return this.dataService.update(id, data).pipe(map(() => undefined));
  }

  private updateApplication(source: LandscapeSource, id: string, mutate: (system: Application) => void): Observable<void> {
    const system = source.applications.find(s => s.id === id);
    if (!system) return throwError(new Error('System not found'));
    mutate(system);
    return this.applicationService.update(id, system).pipe(map(() => undefined));
  }
}

/** Base fields the inspector can edit, independent of the layer */
export interface LandscapeElementValues {
  name?: string;
  description?: string;
  status?: number;
  tags?: string[];
  group?: string;
}
