import { TestBed } from '@angular/core/testing';

import { ModelDiffService, ModelPayload } from './model-diff.service';
import { LandscapeService } from './landscape.service';
import { ReviewSessionService } from './review-session.service';
import { LandscaprDb } from '../db/landscapr-db';
import { RoleService } from './role.service';
import { of } from 'rxjs';
import { landscapeNodeId } from '../models/landscape.model';

describe('ModelDiffService', () => {
  let service: ModelDiffService;
  let reviewService: ReviewSessionService;

  const published = (): ModelPayload => ({
    journeys: [{
      id: 'j1', name: 'Booking', description: '', items: [], connections: [], status: 1, tags: [],
      layout: {
        panX: 0, panY: 0, zoom: 1,
        nodes: [{ id: 'n1', type: 'process', label: 'Book', x: 0, y: 0, width: 120, height: 60, processId: 'p1' }],
        edges: [],
        expectations: [{ id: 'x1', nodeId: 'n1', title: 'Book fast', expectation: 'quick', outcome: 'ok', fulfilment: 'met' }]
      }
    }],
    processes: [
      { id: 'p1', name: 'Book appointment', description: 'old text', status: 1, apiCallIds: ['a1'], steps: [], implementedBy: ['s1'], tags: [] },
      { id: 'p2', name: 'Send reminder', description: '', status: 1, apiCallIds: [], steps: [], implementedBy: [], tags: [] }
    ],
    capabilities: [{ id: 'c1', name: 'Aftersales', implementedBy: [], status: 1, tags: [] }],
    apiCalls: [{ id: 'a1', name: 'bookAppointment', capabilityId: 'c1', inputData: [], outputData: [], implementedBy: ['s1'], tags: [], status: 1 }],
    data: [{ id: 'd1', name: 'Customer', state: 1, items: [] }],
    applications: [{ id: 's1', name: 'DMS', status: 1, tags: [] }],
    roles: []
  });

  /** the published model with one element added, one removed and one changed */
  const draft = (): ModelPayload => {
    const model = published();
    model.processes = [
      { ...model.processes![0], description: 'new text', apiCallIds: [] },
      { id: 'p3', name: 'Collect feedback', description: '', status: 0, apiCallIds: [], steps: [], implementedBy: [], tags: [] }
    ];
    return model;
  };

  beforeEach(() => {
    // only the pure graph building of the landscape service is needed here, so
    // its database collaborators are stubbed out
    TestBed.configureTestingModule({
      providers: [
        ModelDiffService,
        LandscapeService,
        ReviewSessionService,
        { provide: LandscaprDb, useValue: { landscapeViews: { get: () => Promise.resolve(undefined), put: () => Promise.resolve('id') } } },
        { provide: RoleService, useValue: { getAll: () => of([]), getRoleName: () => '', getRoleColor: () => '' } }
      ]
    });
    service = TestBed.inject(ModelDiffService);
    reviewService = TestBed.inject(ReviewSessionService);
  });

  describe('states', () => {
    it('classifies every element as added, removed, changed or untouched', () => {
      const diff = service.compute(published(), draft());

      expect(diff.changes[landscapeNodeId('process', 'p3')].state).toBe('added');
      expect(diff.changes[landscapeNodeId('process', 'p2')].state).toBe('removed');
      expect(diff.changes[landscapeNodeId('process', 'p1')].state).toBe('modified');
      expect(diff.changes[landscapeNodeId('system', 's1')].state).toBe('unchanged');
      expect(diff.added).toBe(1);
      expect(diff.removed).toBe(1);
      expect(diff.modified).toBe(1);
    });

    it('keeps removed elements in the picture so they can be shown', () => {
      const diff = service.compute(published(), draft());

      expect(diff.union.processes.some(p => p.id === 'p2')).toBeTrue();
      expect(diff.union.processes.some(p => p.id === 'p3')).toBeTrue();
    });

    it('reports which attributes of an element changed', () => {
      const diff = service.compute(published(), draft());
      const change = diff.changes[landscapeNodeId('process', 'p1')];
      const description = change.attributes.find(a => a.field === 'description');

      expect(description?.before).toBe('old text');
      expect(description?.after).toBe('new text');
    });

    it('reports relations that were connected or disconnected', () => {
      const diff = service.compute(published(), draft());
      const change = diff.changes[landscapeNodeId('process', 'p1')];
      const lost = change.relations.find(r => r.state === 'removed');

      expect(lost?.otherLabel).toBe('bookAppointment');
    });

    it('marks the relations themselves so the lines can be drawn', () => {
      const diff = service.compute(published(), draft());
      const edgeId = `process-function|${landscapeNodeId('process', 'p1')}|${landscapeNodeId('api', 'a1')}`;

      expect(diff.edgeStates[edgeId]).toBe('removed');
    });

    it('sees no change when the same model is saved again with keys in another order', () => {
      const before = published();
      const after = JSON.parse(JSON.stringify(published()));
      after.processes[0] = { status: 1, name: 'Book appointment', id: 'p1', description: 'old text', apiCallIds: ['a1'], steps: [], implementedBy: ['s1'], tags: [] };

      const diff = service.compute(before, after);

      expect(diff.modified).toBe(0);
      expect(diff.added).toBe(0);
      expect(diff.removed).toBe(0);
    });

    it('treats an expectation inside a journey as an element of its own', () => {
      const before = published();
      const after = published();
      after.journeys![0].layout.expectations[0].outcome = 'took too long';

      const diff = service.compute(before, after);

      expect(diff.changes[landscapeNodeId('experience', 'x1')].state).toBe('modified');
    });
  });

  describe('conflicts', () => {
    it('marks elements both sides changed', () => {
      const theirs = published();
      const mine = published();
      theirs.processes![0].description = 'their text';
      mine.processes![0].description = 'my text';

      const diff = service.markConflicts(service.compute(theirs, mine), theirs, mine);

      expect(diff.conflicts.length).toBe(1);
      expect(diff.conflicts[0].nodeId).toBe(landscapeNodeId('process', 'p1'));
    });

    it('leaves elements alone that only one side touched, given a common ancestor', () => {
      const base = published();
      const theirs = published();
      const mine = published();
      mine.processes![0].description = 'my text';

      const diff = service.markConflicts(service.compute(theirs, mine), theirs, mine, base);

      expect(diff.conflicts.length).toBe(0);
    });

    it('offers both versions of a conflicting element side by side', () => {
      const theirs = published();
      const mine = published();
      theirs.processes![0].name = 'Book slot';
      mine.processes![0].name = 'Reserve slot';

      const comparison = service.versionsOf(landscapeNodeId('process', 'p1'), theirs, mine);
      const name = comparison.fields.find(f => f.field === 'name');

      expect(name?.theirs).toBe('Book slot');
      expect(name?.mine).toBe('Reserve slot');
      expect(name?.differs).toBeTrue();
    });
  });

  describe('resolution', () => {
    it('builds a complete model from whole objects, never from patched text', () => {
      const theirs = published();
      const mine = published();
      theirs.processes![0].description = 'their text';
      mine.processes![0].description = 'my text';

      const session = reviewService.startConflictResolution(theirs, mine, () => {});
      reviewService.resolve(landscapeNodeId('process', 'p1'), 'theirs');
      const merged = reviewService.buildMerged(reviewService.session!);

      expect(merged.processes!.find(p => p.id === 'p1').description).toBe('their text');
      expect(merged.processes!.length).toBe(2);
      expect(() => JSON.parse(JSON.stringify(merged))).not.toThrow();
    });

    it('refuses to apply while a decision is still open', () => {
      const theirs = published();
      const mine = published();
      theirs.processes![0].description = 'their text';
      mine.processes![0].description = 'my text';

      let applied: any = null;
      reviewService.startConflictResolution(theirs, mine, merged => applied = merged);

      expect(reviewService.apply()).toBeNull();
      expect(applied).toBeNull();

      reviewService.resolve(landscapeNodeId('process', 'p1'), 'mine');
      expect(reviewService.apply()).not.toBeNull();
      expect(applied.processes.find((p: any) => p.id === 'p1').description).toBe('my text');
    });

    it('keeps every element that exists on either side, without asking', () => {
      const theirs = published();
      const mine = draft();

      const session = reviewService.startConflictResolution(theirs, mine, () => {});
      const merged = reviewService.buildMerged(session);

      // an element only one side has is taken over - the same rule the existing
      // resolver uses, since without a common ancestor a missing element cannot
      // be told apart from one the other side has just added
      expect(merged.processes!.some(p => p.id === 'p3')).toBeTrue();
      expect(merged.processes!.some(p => p.id === 'p2')).toBeTrue();
    });
  });

  describe('performance', () => {
    it('diffs a model of 5000 elements in well under 500 ms', () => {
      const build = (offset: number): ModelPayload => ({
        journeys: [],
        processes: Array.from({ length: 2500 }, (_, i) => ({
          id: `p${i}`, name: `Process ${i}`, description: i === offset ? 'changed' : 'text',
          status: 1, apiCallIds: [`a${i}`], steps: [], implementedBy: [`s${i % 50}`], tags: []
        })),
        capabilities: [],
        apiCalls: Array.from({ length: 2500 }, (_, i) => ({
          id: `a${i}`, name: `function ${i}`, capabilityId: '', inputData: [], outputData: [],
          implementedBy: [`s${i % 50}`], tags: [], status: 1
        })),
        data: [],
        applications: Array.from({ length: 50 }, (_, i) => ({ id: `s${i}`, name: `System ${i}`, status: 1, tags: [] })),
        roles: []
      });

      const before = build(-1);
      const after = build(7);

      const started = performance.now();
      const diff = service.compute(before, after);
      const took = performance.now() - started;

      expect(Object.keys(diff.changes).length).toBeGreaterThan(5000);
      expect(diff.modified).toBe(1);
      expect(took).toBeLessThan(500);
    });
  });
});
