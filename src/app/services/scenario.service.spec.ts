import { TestBed } from '@angular/core/testing';

import { ScenarioService } from './scenario.service';
import { LandscaprDb } from '../db/landscapr-db';
import { ModelPayload } from './model-diff.service';
import { Scenario, ScenarioStatus, SCENARIO_STATUS_LABELS, scenarioSummary } from '../models/scenario.model';
import { landscapeNodeId } from '../models/landscape.model';

describe('ScenarioService', () => {
  let service: ScenarioService;
  let stored: Map<string, Scenario>;

  const today = (): ModelPayload => ({
    journeys: [],
    processes: [
      { id: 'p1', name: 'Book appointment', description: 'today', status: 1, apiCallIds: [], steps: [], implementedBy: ['s1'], tags: [] },
      { id: 'p2', name: 'Send reminder', description: '', status: 1, apiCallIds: [], steps: [], implementedBy: [], tags: [] }
    ],
    capabilities: [],
    apiCalls: [],
    data: [],
    applications: [{ id: 's1', name: 'Old CRM', status: 1, tags: [] }],
    roles: []
  });

  const scenario = (changes: Scenario['changes'] = {}): Scenario => ({
    id: 'sc1',
    name: 'Target 2027',
    description: '',
    targetDate: 'Q3 2027',
    status: ScenarioStatus.Draft,
    changes,
    createdAt: 1,
    updatedAt: 1
  });

  beforeEach(() => {
    stored = new Map<string, Scenario>();
    TestBed.configureTestingModule({
      providers: [
        ScenarioService,
        {
          provide: LandscaprDb,
          useValue: {
            scenarios: {
              toArray: () => Promise.resolve(Array.from(stored.values())),
              get: (id: string) => Promise.resolve(stored.get(id)),
              put: (item: Scenario) => { stored.set(item.id, item); return Promise.resolve(item.id); },
              delete: (id: string) => { stored.delete(id); return Promise.resolve(); }
            }
          }
        }
      ]
    });
    service = TestBed.inject(ScenarioService);
  });

  describe('applying a plan', () => {
    it('leaves the model of today alone when nothing is planned', () => {
      const model = today();
      const target = service.applyTo(model, scenario());

      expect(target.processes!.length).toBe(2);
      expect(target.applications!.length).toBe(1);
    });

    it('adds, changes and drops elements as planned', () => {
      const plan = scenario({
        [landscapeNodeId('process', 'p3')]: {
          state: 'added',
          entity: { id: 'p3', name: 'Digital handover', description: '', status: 0, apiCallIds: [], steps: [], implementedBy: [], tags: [] }
        },
        [landscapeNodeId('process', 'p1')]: {
          state: 'modified',
          entity: { id: 'p1', name: 'Book appointment', description: 'fully self service', status: 1, apiCallIds: [], steps: [], implementedBy: ['s2'], tags: [] }
        },
        [landscapeNodeId('system', 's1')]: { state: 'removed' }
      });

      const target = service.applyTo(today(), plan);

      expect(target.processes!.some(p => p.id === 'p3')).toBeTrue();
      expect(target.processes!.find(p => p.id === 'p1').description).toBe('fully self service');
      expect(target.applications!.length).toBe(0);
    });

    it('never writes into the model of today', () => {
      const model = today();
      const plan = scenario({ [landscapeNodeId('system', 's1')]: { state: 'removed' } });

      service.applyTo(model, plan);

      expect(model.applications!.length).toBe(1);
    });
  });

  describe('reading a plan back', () => {
    it('turns a changed target state into planned changes', () => {
      const model = today();
      const target = service.applyTo(model, scenario());
      target.processes!.push({ id: 'p9', name: 'New step', description: '', status: 0, apiCallIds: [], steps: [], implementedBy: [], tags: [] });
      target.processes!.find(p => p.id === 'p1').description = 'changed';
      target.processes = target.processes!.filter(p => p.id !== 'p2');

      const changes = service.deltaFrom(model, target);

      expect(changes[landscapeNodeId('process', 'p9')].state).toBe('added');
      expect(changes[landscapeNodeId('process', 'p1')].state).toBe('modified');
      expect(changes[landscapeNodeId('process', 'p2')].state).toBe('removed');
      expect(Object.keys(changes).length).toBe(3);
    });

    it('drops a planned change again when the element is back to today', () => {
      const model = today();
      const target = service.applyTo(model, scenario());

      expect(Object.keys(service.deltaFrom(model, target)).length).toBe(0);
    });

    it('keeps the plan valid when today moves on', () => {
      // the plan changes p1, and afterwards somebody renames p2 in reality
      const plan = scenario({
        [landscapeNodeId('process', 'p1')]: {
          state: 'modified',
          entity: { id: 'p1', name: 'Book appointment', description: 'planned', status: 1, apiCallIds: [], steps: [], implementedBy: [], tags: [] }
        }
      });
      const movedOn = today();
      movedOn.processes!.find(p => p.id === 'p2').name = 'Send reminder by app';

      const target = service.applyTo(movedOn, plan);

      expect(target.processes!.find(p => p.id === 'p1').description).toBe('planned');
      expect(target.processes!.find(p => p.id === 'p2').name).toBe('Send reminder by app');
    });
  });

  describe('working with target pictures', () => {
    it('stores a plan and remembers notes on it', async () => {
      const created = await service.create('Target 2027', '', 'Q3 2027').toPromise();
      created.changes[landscapeNodeId('process', 'p1')] = { state: 'removed', note: 'replaced by self service' };
      await service.update(created).toPromise();

      const model = today();
      const target = service.applyTo(model, created);
      const saved = await service.saveTargetState(created, model, target).toPromise();

      expect(saved.changes[landscapeNodeId('process', 'p1')].note).toBe('replaced by self service');
    });

    it('plans a removal and takes it back', async () => {
      const created = await service.create('Target').toPromise();
      const nodeId = landscapeNodeId('system', 's1');

      const planned = await service.toggleRemoval(created, nodeId).toPromise();
      expect(planned.changes[nodeId].state).toBe('removed');

      const reverted = await service.toggleRemoval(planned, nodeId).toPromise();
      expect(reverted.changes[nodeId]).toBeUndefined();
    });

    it('counts what a target picture changes', () => {
      const plan = scenario({
        a: { state: 'added', entity: {} },
        b: { state: 'removed' },
        c: { state: 'modified', entity: {} },
        d: { state: 'added', entity: {} }
      });

      expect(scenarioSummary(plan)).toEqual({ added: 2, removed: 1, modified: 1, total: 4 });
    });

    it('keeps a target picture as a record once the plan is reality', () => {
      const plan = scenario({ [landscapeNodeId('system', 's1')]: { state: 'removed' } });

      const realised = service.asRealised(plan);

      expect(realised.status).toBe(ScenarioStatus.Realised);
      expect(realised.realisedAt).toBeGreaterThan(0);
      // the decision stays readable, only its state changes
      expect(realised.changes).toEqual(plan.changes);
      expect(realised.name).toBe(plan.name);
      expect(SCENARIO_STATUS_LABELS[realised.status]).toBe('Realised');
    });

    it('has nothing left to plan once it was adopted', () => {
      const plan = scenario({
        [landscapeNodeId('system', 's1')]: { state: 'removed' },
        [landscapeNodeId('process', 'p1')]: {
          state: 'modified',
          entity: { id: 'p1', name: 'Book appointment', description: 'planned', status: 1, apiCallIds: [], steps: [], implementedBy: ['s1'], tags: [] }
        }
      });

      // adopting means the target state becomes today
      const adopted = service.applyTo(today(), plan);

      expect(service.deltaFrom(adopted, service.applyTo(adopted, plan))).toEqual({});
    });

    it('forgets a target picture that was deleted while it was open', async () => {
      const created = await service.create('Target').toPromise();
      service.activate(created);

      await service.delete(created.id).toPromise();

      expect(service.active).toBeNull();
    });
  });
});
