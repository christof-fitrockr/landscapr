import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { LandscapeService, LandscapeSource } from './landscape.service';
import { LandscaprDb } from '../db/landscapr-db';
import { ApiCallService } from './api-call.service';
import { ApplicationService } from './application.service';
import { CapabilityService } from './capability.service';
import { DataService } from './data.service';
import { JourneyService } from './journey.service';
import { ProcessService } from './process.service';
import { RoleService } from './role.service';
import { Status } from '../models/process';
import { LandscapeView, landscapeNodeId } from '../models/landscape.model';

describe('LandscapeService', () => {
  let service: LandscapeService;
  let source: LandscapeSource;
  let updated: { [entity: string]: any };

  const emptyView = (): LandscapeView => ({ id: 'test', positions: {}, hiddenLayers: [], panX: 0, panY: 0, zoom: 1 });

  const record = (entity: string) => (id: string, value: any) => {
    updated[entity] = { id, value };
    return of(value);
  };

  beforeEach(() => {
    updated = {};

    source = {
      journeys: [{
        id: 'j1', name: 'Booking', description: '', items: [], connections: [], status: 1, tags: [],
        layout: {
          panX: 0, panY: 0, zoom: 1,
          nodes: [{ id: 'n1', type: 'process', label: 'Book', x: 0, y: 0, width: 120, height: 60, processId: 'p1' }],
          edges: [],
          expectations: [{
            id: 'x1', nodeId: 'n1', title: 'Book fast', expectation: 'quick', outcome: 'slow',
            fulfilment: 'missed', persona: 'Fleet customer'
          }]
        }
      }] as any,
      processes: [
        { id: 'p1', name: 'Book appointment', status: Status.Validated, apiCallIds: ['a1'], steps: [{ processReference: 'p2', successors: [] }], implementedBy: ['s1'], tags: [] },
        { id: 'p2', name: 'Check quality', status: Status.Draft, apiCallIds: [], steps: [], implementedBy: [], tags: [] }
      ] as any,
      capabilities: [
        { id: 'c1', name: 'Aftersales', implementedBy: [], status: 1, tags: [] },
        { id: 'c2', name: 'Booking', parentId: 'c1', implementedBy: ['s1'], status: 1, tags: [] }
      ] as any,
      apiCalls: [
        { id: 'a1', name: 'bookAppointment', capabilityId: 'c2', inputData: [{ dataId: 'd1' }], outputData: [], implementedBy: ['s1'], tags: [], status: 1 }
      ] as any,
      data: [{ id: 'd1', name: 'Customer', state: 1, items: [] }] as any,
      applications: [{ id: 's1', name: 'DMS', status: 1, tags: [] }] as any,
      roles: [{ id: '3', name: 'Service', color: '', description: '' }] as any
    };

    TestBed.configureTestingModule({
      providers: [
        LandscapeService,
        { provide: LandscaprDb, useValue: { landscapeViews: { get: () => Promise.resolve(undefined), put: () => Promise.resolve('id') } } },
        { provide: JourneyService, useValue: { all: () => of(source.journeys), update: record('journey'), create: (j: any) => of({ ...j, id: 'new-j' }) } },
        { provide: ProcessService, useValue: { all: () => of(source.processes), update: record('process'), create: (p: any) => of({ ...p, id: 'new-p' }) } },
        { provide: CapabilityService, useValue: { all: () => of(source.capabilities), update: record('capability'), create: (c: any) => of({ ...c, id: 'new-c' }) } },
        { provide: ApiCallService, useValue: { all: () => of(source.apiCalls), update: record('apiCall'), create: (a: any) => of({ ...a, id: 'new-a' }) } },
        { provide: DataService, useValue: { all: () => of(source.data), update: record('data'), create: (d: any) => of({ ...d, id: 'new-d' }) } },
        { provide: ApplicationService, useValue: { all: () => of(source.applications), update: record('application'), create: (s: any) => of({ ...s, id: 'new-s' }) } },
        { provide: RoleService, useValue: { getAll: () => of(source.roles) } }
      ]
    });

    service = TestBed.inject(LandscapeService);
  });

  describe('buildGraph', () => {
    it('creates a node for every element of every layer', () => {
      const graph = service.buildGraph(source);
      const layers = graph.nodes.map(n => n.layer);

      expect(graph.nodes.length).toBe(9);
      expect(layers).toContain('experience');
      expect(layers).toContain('journey');
      expect(layers).toContain('process');
      expect(layers).toContain('capability');
      expect(layers).toContain('api');
      expect(layers).toContain('data');
      expect(layers).toContain('system');
    });

    it('connects the layers along the relations stored in the entities', () => {
      const graph = service.buildGraph(source);
      const kinds = (from: string, to: string) => graph.edges
        .filter(e => e.from === from && e.to === to)
        .map(e => e.kind);

      expect(kinds(landscapeNodeId('journey', 'j1'), landscapeNodeId('process', 'p1'))).toEqual(['journey-step']);
      expect(kinds(landscapeNodeId('experience', 'x1'), landscapeNodeId('process', 'p1'))).toEqual(['expectation-of-step']);
      expect(kinds(landscapeNodeId('process', 'p1'), landscapeNodeId('process', 'p2'))).toEqual(['sub-process']);
      expect(kinds(landscapeNodeId('process', 'p1'), landscapeNodeId('api', 'a1'))).toEqual(['process-function']);
      expect(kinds(landscapeNodeId('api', 'a1'), landscapeNodeId('capability', 'c2'))).toEqual(['function-capability']);
      expect(kinds(landscapeNodeId('capability', 'c1'), landscapeNodeId('capability', 'c2'))).toEqual(['capability-parent']);
      expect(kinds(landscapeNodeId('data', 'd1'), landscapeNodeId('api', 'a1'))).toEqual(['function-input']);
      expect(kinds(landscapeNodeId('api', 'a1'), landscapeNodeId('system', 's1'))).toEqual(['implemented-by']);
    });

    it('ignores relations that point to a missing element', () => {
      source.processes[0].apiCallIds = ['a1', 'gone'];
      const graph = service.buildGraph(source);

      expect(graph.edges.some(e => e.to === landscapeNodeId('api', 'gone'))).toBeFalse();
    });

    it('marks drafts so they can be told apart on the canvas', () => {
      const graph = service.buildGraph(source);
      const draft = graph.nodes.find(n => n.id === landscapeNodeId('process', 'p2'));

      expect(draft?.draft).toBeTrue();
    });
  });

  describe('layout', () => {
    it('stacks one band per used layer from experience down to system', () => {
      const graph = service.buildGraph(source);
      const bands = service.layout(graph, emptyView());

      expect(bands.map(b => b.layer)).toEqual(['experience', 'journey', 'process', 'capability', 'api', 'data', 'system']);
      for (let i = 1; i < bands.length; i++) {
        expect(bands[i].y).toBeGreaterThan(bands[i - 1].y + bands[i - 1].height - 1);
      }
    });

    it('places every node inside the band of its layer', () => {
      const graph = service.buildGraph(source);
      const bands = service.layout(graph, emptyView());

      graph.nodes.forEach(node => {
        const band = bands.find(b => b.layer === node.layer)!;
        expect(node.y).toBeGreaterThanOrEqual(band.y);
        expect(node.y + node.height).toBeLessThanOrEqual(band.y + band.height);
      });
    });

    it('keeps positions that were placed by hand', () => {
      const graph = service.buildGraph(source);
      const view = emptyView();
      const pinned = landscapeNodeId('system', 's1');
      view.positions[pinned] = { x: 900, y: 1200 };

      service.layout(graph, view);
      const node = graph.nodes.find(n => n.id === pinned)!;

      expect(node.x).toBe(900);
      expect(node.y).toBe(1200);
      expect(node.pinned).toBeTrue();
    });
  });

  describe('relations', () => {
    it('resolves the relation from the two layers, in both drag directions', () => {
      expect(service.resolveLinkKind('process', 'api')).toBe('process-function');
      expect(service.resolveLinkKind('api', 'process')).toBe('process-function');
      expect(service.resolveLinkKind('api', 'data')).toBe('function-output');
      expect(service.resolveLinkKind('data', 'api')).toBe('function-input');
      expect(service.resolveLinkKind('journey', 'system')).toBeNull();
    });

    it('writes a new function relation into the process', () => {
      const graph = service.buildGraph(source);
      const process = graph.nodes.find(n => n.id === landscapeNodeId('process', 'p2'))!;
      const api = graph.nodes.find(n => n.id === landscapeNodeId('api', 'a1'))!;

      service.link(source, process, api).subscribe();

      expect(source.processes[1].apiCallIds).toEqual(['a1']);
      expect(updated['process'].id).toBe('p2');
    });

    it('adds a journey step when a process is connected to a journey', () => {
      const graph = service.buildGraph(source);
      const journey = graph.nodes.find(n => n.id === landscapeNodeId('journey', 'j1'))!;
      const process = graph.nodes.find(n => n.id === landscapeNodeId('process', 'p2'))!;

      service.link(source, journey, process).subscribe();
      const nodes = source.journeys[0].layout!.nodes;

      expect(nodes.length).toBe(2);
      expect(nodes[1].processId).toBe('p2');
    });

    it('removes a function relation from both the list and the steps', () => {
      source.processes[0].steps = [{ apiCallReference: 'a1', successors: [] } as any];
      const graph = service.buildGraph(source);
      const process = graph.nodes.find(n => n.id === landscapeNodeId('process', 'p1'))!;
      const api = graph.nodes.find(n => n.id === landscapeNodeId('api', 'a1'))!;
      const edge = graph.edges.find(e => e.from === process.id && e.to === api.id)!;

      service.unlink(source, edge, process, api).subscribe();

      expect(source.processes[0].apiCallIds).toEqual([]);
      expect(source.processes[0].steps).toEqual([]);
    });

    it('drops the journey step and its expectation when the relation is removed', () => {
      const graph = service.buildGraph(source);
      const journey = graph.nodes.find(n => n.id === landscapeNodeId('journey', 'j1'))!;
      const process = graph.nodes.find(n => n.id === landscapeNodeId('process', 'p1'))!;
      const edge = graph.edges.find(e => e.from === journey.id && e.to === process.id)!;

      service.unlink(source, edge, journey, process).subscribe();

      expect(source.journeys[0].layout!.nodes).toEqual([]);
      expect(source.journeys[0].layout!.expectations).toEqual([]);
    });

    it('refuses relations that have no meaning between two layers', () => {
      const graph = service.buildGraph(source);
      const journey = graph.nodes.find(n => n.id === landscapeNodeId('journey', 'j1'))!;
      const system = graph.nodes.find(n => n.id === landscapeNodeId('system', 's1'))!;
      let error: Error | null = null;

      service.link(source, journey, system).subscribe({ error: err => error = err });

      expect(error).toBeTruthy();
    });

    it('treats derived relations as read only', () => {
      expect(service.isEditableKind('process-function')).toBeTrue();
      expect(service.isEditableKind('expectation-of-journey')).toBeFalse();
      expect(service.isEditableKind('data-reference')).toBeFalse();
    });
  });

  describe('impact analysis', () => {
    it('walks from a system all the way up to the customer expectation', () => {
      const graph = service.buildGraph(source);
      const impact = service.impactOf(graph, landscapeNodeId('system', 's1'));
      const affected = impact.map(entry => entry.node.id);

      expect(affected).toContain(landscapeNodeId('api', 'a1'));
      expect(affected).toContain(landscapeNodeId('process', 'p1'));
      expect(affected).toContain(landscapeNodeId('journey', 'j1'));
      expect(affected).toContain(landscapeNodeId('experience', 'x1'));
      expect(affected).not.toContain(landscapeNodeId('system', 's1'));
    });

    it('reports how many relations away each affected element sits', () => {
      const graph = service.buildGraph(source);
      const impact = service.impactOf(graph, landscapeNodeId('api', 'a1'));
      const distanceOf = (id: string) => impact.find(entry => entry.node.id === id)?.distance;

      expect(distanceOf(landscapeNodeId('process', 'p1'))).toBe(1);
      expect(distanceOf(landscapeNodeId('journey', 'j1'))).toBe(2);
      // the expectation hangs on the step itself, so it is just as close as the journey
      expect(distanceOf(landscapeNodeId('experience', 'x1'))).toBe(2);
    });

    it('finds nothing for an element nothing depends on', () => {
      const graph = service.buildGraph(source);

      expect(service.impactOf(graph, landscapeNodeId('experience', 'x1'))).toEqual([]);
    });

    it('lists what an element runs on in the other direction', () => {
      const graph = service.buildGraph(source);
      const dependencies = service.dependenciesOf(graph, landscapeNodeId('process', 'p1'))
        .map(entry => entry.node.id);

      expect(dependencies).toContain(landscapeNodeId('api', 'a1'));
      expect(dependencies).toContain(landscapeNodeId('system', 's1'));
      expect(dependencies).toContain(landscapeNodeId('capability', 'c2'));
      expect(dependencies).not.toContain(landscapeNodeId('journey', 'j1'));
    });

    it('survives a cycle in the model', () => {
      source.processes[1].steps = [{ processReference: 'p1', successors: [] } as any];
      const graph = service.buildGraph(source);

      const impact = service.impactOf(graph, landscapeNodeId('process', 'p1'));

      expect(impact.some(entry => entry.node.id === landscapeNodeId('process', 'p2'))).toBeTrue();
      expect(impact.some(entry => entry.node.id === landscapeNodeId('process', 'p1'))).toBeFalse();
    });
  });

  describe('elements', () => {
    it('creates an element and adds it to the snapshot', () => {
      let created: any = null;
      service.createElement(source, 'system', 'Loyalty Platform').subscribe(node => created = node);

      expect(created.layer).toBe('system');
      expect(created.label).toBe('Loyalty Platform');
      expect(source.applications.some(s => s.name === 'Loyalty Platform')).toBeTrue();
    });

    it('saves edited base fields back to the entity', () => {
      const graph = service.buildGraph(source);
      const node = graph.nodes.find(n => n.id === landscapeNodeId('data', 'd1'))!;

      service.updateElement(source, node, { name: 'Customer master', description: 'core object', status: 0, group: 'Master data' }).subscribe();

      expect(source.data[0].name).toBe('Customer master');
      expect(source.data[0].description).toBe('core object');
      expect(source.data[0].group).toBe('Master data');
      expect(source.data[0].state).toBe(0);
    });

    it('edits an expectation through its journey', () => {
      const graph = service.buildGraph(source);
      const node = graph.nodes.find(n => n.id === landscapeNodeId('experience', 'x1'))!;

      service.updateElement(source, node, { name: 'Book without waiting', description: 'in under a minute' }).subscribe();
      const expectation = source.journeys[0].layout!.expectations![0];

      expect(expectation.title).toBe('Book without waiting');
      expect(expectation.expectation).toBe('in under a minute');
    });
  });
});
