import { TestBed } from '@angular/core/testing';

import { GapAnalysisService } from './gap-analysis.service';
import { LandscapeService, LandscapeSource } from './landscape.service';
import { ApiImplementationStatus } from '../models/api-call';
import { NO_JOURNEY_ID } from '../models/gap.model';

describe('GapAnalysisService', () => {
  let service: GapAnalysisService;

  const api = (id: string, name: string, status: ApiImplementationStatus, implementedBy: string[] = []) =>
    ({ id, name, implementationStatus: status, implementedBy } as any);

  const process = (id: string, name: string, steps: any[] = [], extra: any = {}) =>
    ({ id, name, role: '0', steps, apiCallIds: [], ...extra } as any);

  const source = (over: Partial<LandscapeSource> = {}): LandscapeSource => ({
    journeys: [],
    processes: [],
    capabilities: [],
    apiCalls: [],
    data: [],
    applications: [{ id: 'sys1', name: 'DMS' } as any],
    roles: [{ id: '0', name: 'Customer' } as any, { id: '4', name: 'Workshop' } as any],
    ...over
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [GapAnalysisService, { provide: LandscapeService, useValue: {} }]
    });
    service = TestBed.inject(GapAnalysisService);
  });

  it('calls a process seamless when every step runs on a live function', () => {
    const report = service.analyse(source({
      apiCalls: [api('a1', 'bookAppointment', ApiImplementationStatus.Ready, ['sys1'])],
      processes: [process('p1', 'Book', [{ apiCallReference: 'a1' }])]
    }));

    expect(report.processes[0].band).toBe('seamless');
    expect(report.processes[0].coverage).toBe(1);
    expect(report.totals.processesWithGap).toBe(0);
    expect(report.openItems.length).toBe(0);
  });

  it('treats a ready function that no system implements as a gap', () => {
    const report = service.analyse(source({
      apiCalls: [api('a1', 'bookAppointment', ApiImplementationStatus.Ready, [])],
      processes: [process('p1', 'Book', [{ apiCallReference: 'a1' }])]
    }));

    expect(report.processes[0].band).toBe('gap');
    expect(report.processes[0].activities[0].reason).toBe('noSystem');
  });

  it('separates a declared gap from a step with no function at all', () => {
    const report = service.analyse(source({
      apiCalls: [api('a1', 'sendConfirmation', ApiImplementationStatus.Gap)],
      processes: [process('p1', 'Confirm', [{ apiCallReference: 'a1' }, {}])]
    }));

    const states = report.processes[0].activities.map(a => a.state);
    expect(states).toEqual(['declared', 'missing']);
    expect(report.processes[0].open).toBe(2);
    // the declared one names a function, the other one does not
    expect(report.openItems.map(i => i.modelled).sort()).toEqual([false, true]);
  });

  it('counts a planned function as planned, not as a gap', () => {
    const report = service.analyse(source({
      apiCalls: [
        api('a1', 'getStock', ApiImplementationStatus.Ready, ['sys1']),
        api('a2', 'orderParts', ApiImplementationStatus.Planned)
      ],
      processes: [process('p1', 'Order parts', [{ apiCallReference: 'a1' }, { apiCallReference: 'a2' }])]
    }));

    const gap = report.processes[0];
    expect(gap.band).toBe('planned');
    expect(gap.coverage).toBe(0.5);
    expect(gap.plannedCoverage).toBe(1);
    expect(report.totals.processesWithGap).toBe(0);
  });

  it('treats a step in development as planned as well', () => {
    const report = service.analyse(source({
      apiCalls: [api('a1', 'orderParts', ApiImplementationStatus.InDevelopment)],
      processes: [process('p1', 'Order parts', [{ apiCallReference: 'a1' }])]
    }));

    expect(report.processes[0].activities[0].state).toBe('planned');
  });

  it('gives a subprocess step the verdict of the process it points at', () => {
    const report = service.analyse(source({
      apiCalls: [
        api('a1', 'live', ApiImplementationStatus.Ready, ['sys1']),
        api('a2', 'missing', ApiImplementationStatus.Gap)
      ],
      processes: [
        process('parent', 'Parent', [{ apiCallReference: 'a1' }, { processReference: 'child' }]),
        process('child', 'Child', [{ apiCallReference: 'a2' }])
      ]
    }));

    const parent = report.processes.find(p => p.processId === 'parent');
    expect(parent.band).toBe('gap');
    // the child contributes one activity, not one per step it happens to have
    expect(parent.counted).toBe(2);
    expect(parent.activities[1].subprocessId).toBe('child');
  });

  it('does not put a subprocess on the roadmap twice', () => {
    const report = service.analyse(source({
      apiCalls: [api('a1', 'sendConfirmation', ApiImplementationStatus.Gap)],
      processes: [
        process('parent', 'Parent', [{ processReference: 'child' }]),
        process('child', 'Child', [{ apiCallReference: 'a1' }])
      ]
    }));

    expect(report.openItems.length).toBe(1);
    expect(report.openItems[0].name).toBe('sendConfirmation');
    expect(report.openItems[0].places.length).toBe(1);
  });

  it('survives a process that reaches itself', () => {
    const report = service.analyse(source({
      processes: [
        process('p1', 'Loop', [{ processReference: 'p2' }]),
        process('p2', 'Back', [{ processReference: 'p1' }])
      ]
    }));

    expect(report.processes.length).toBe(2);
  });

  it('takes a process that is manual by design out of the gap count', () => {
    const report = service.analyse(source({
      processes: [
        process('p1', 'Repair', [{}], { supportPlan: { intent: 'manualByDesign' } })
      ]
    }));

    const gap = report.processes[0];
    expect(gap.band).toBe('manual');
    expect(gap.counted).toBe(0);
    expect(gap.manual).toBe(1);
    expect(report.totals.processesWithGap).toBe(0);
    expect(report.totals.processesManual).toBe(1);
    expect(report.openItems.length).toBe(0);
  });

  it('calls a process without any step or function a gap', () => {
    const report = service.analyse(source({ processes: [process('p1', 'Empty')] }));

    expect(report.processes[0].band).toBe('gap');
    expect(report.openItems.length).toBe(1);
  });

  it('rolls the processes of a journey up into one coverage', () => {
    const report = service.analyse(source({
      apiCalls: [
        api('a1', 'live', ApiImplementationStatus.Ready, ['sys1']),
        api('a2', 'open', ApiImplementationStatus.Gap)
      ],
      processes: [
        process('p1', 'One', [{ apiCallReference: 'a1' }]),
        process('p2', 'Two', [{ apiCallReference: 'a2' }])
      ],
      journeys: [{
        id: 'j1',
        name: 'Service',
        layout: { nodes: [
          { id: 'n1', type: 'process', processId: 'p1' },
          { id: 'n2', type: 'process', processId: 'p2' }
        ] }
      } as any]
    }));

    const journey = report.journeys.find(j => j.journeyId === 'j1');
    expect(journey.processIds).toEqual(['p1', 'p2']);
    expect(journey.coverage).toBe(0.5);
    expect(report.totals.journeysAffected).toBe(1);
    expect(report.processes.find(p => p.processId === 'p2').journeyNames).toEqual(['Service']);
  });

  it('collects processes no journey reaches in their own group', () => {
    const report = service.analyse(source({
      processes: [process('p1', 'Alone', [{}])],
      journeys: []
    }));

    expect(report.journeys.length).toBe(1);
    expect(report.journeys[0].journeyId).toBe(NO_JOURNEY_ID);
    // the bucket is not a journey, so it does not inflate the journey count
    expect(report.totals.journeys).toBe(0);
  });

  it('makes one roadmap entry out of the same function used twice', () => {
    const report = service.analyse(source({
      apiCalls: [api('a1', 'sendCustomerMessage', ApiImplementationStatus.Gap)],
      processes: [
        process('p1', 'Confirm', [{ apiCallReference: 'a1' }], { supportPlan: { intent: 'automate', priority: 'low', horizon: 'Q4 2027' } }),
        process('p2', 'Notify', [{ apiCallReference: 'a1' }], { supportPlan: { intent: 'automate', priority: 'high' } })
      ]
    }));

    expect(report.openItems.length).toBe(1);
    const item = report.openItems[0];
    expect(item.places.length).toBe(2);
    // the most urgent of the places sets the priority of the work
    expect(item.priority).toBe('high');
    expect(item.horizon).toBe('Q4 2027');
  });

  it('sorts the roadmap by priority, then by horizon', () => {
    const report = service.analyse(source({
      apiCalls: [
        api('a1', 'later', ApiImplementationStatus.Gap),
        api('a2', 'now', ApiImplementationStatus.Gap),
        api('a3', 'soon', ApiImplementationStatus.Gap)
      ],
      processes: [
        process('p1', 'A', [{ apiCallReference: 'a1' }], { supportPlan: { intent: 'automate', priority: 'low' } }),
        process('p2', 'B', [{ apiCallReference: 'a2' }], { supportPlan: { intent: 'automate', priority: 'high', horizon: 'Q1 2027' } }),
        process('p3', 'C', [{ apiCallReference: 'a3' }], { supportPlan: { intent: 'automate', priority: 'high', horizon: 'Q3 2027' } })
      ]
    }));

    expect(report.openItems.map(i => i.name)).toEqual(['now', 'soon', 'later']);
  });

  it('counts a function assigned to the process but never called from a step', () => {
    const report = service.analyse(source({
      apiCalls: [api('a1', 'orphan', ApiImplementationStatus.Gap)],
      processes: [process('p1', 'Loose ends', [], { apiCallIds: ['a1'] })]
    }));

    expect(report.processes[0].counted).toBe(1);
    expect(report.processes[0].activities[0].key).toBe('function:a1');
  });

  it('does not count a function twice when a step already calls it', () => {
    const report = service.analyse(source({
      apiCalls: [api('a1', 'once', ApiImplementationStatus.Ready, ['sys1'])],
      processes: [process('p1', 'Once', [{ apiCallReference: 'a1' }], { apiCallIds: ['a1'] })]
    }));

    expect(report.processes[0].counted).toBe(1);
  });

  it('flags a step that points at a function which is not in the model', () => {
    const report = service.analyse(source({
      processes: [process('p1', 'Dangling', [{ apiCallReference: 'gone' }])]
    }));

    expect(report.processes[0].activities[0].reason).toBe('unknownFunction');
    expect(report.processes[0].band).toBe('gap');
  });

  it('reads the role name of a process', () => {
    const report = service.analyse(source({
      processes: [process('p1', 'Repair', [{}], { role: '4' }), process('p2', 'Odd', [{}], { role: '99' })]
    }));

    expect(report.processes[0].roleName).toBe('Workshop');
    expect(report.processes[1].roleName).toBe('Unassigned');
  });

  it('sums the whole model into the numbers the view leads with', () => {
    const report = service.analyse(source({
      apiCalls: [
        api('a1', 'live', ApiImplementationStatus.Ready, ['sys1']),
        api('a2', 'planned', ApiImplementationStatus.Planned),
        api('a3', 'open', ApiImplementationStatus.Gap)
      ],
      processes: [
        process('p1', 'One', [{ apiCallReference: 'a1' }]),
        process('p2', 'Two', [{ apiCallReference: 'a2' }]),
        process('p3', 'Three', [{ apiCallReference: 'a3' }]),
        process('p4', 'Four', [{ apiCallReference: 'a1' }], { supportPlan: { intent: 'manualByDesign' } })
      ]
    }));

    expect(report.totals.processes).toBe(4);
    expect(report.totals.activities).toBe(3);
    expect(report.totals.live).toBe(1);
    expect(report.totals.planned).toBe(1);
    expect(report.totals.open).toBe(1);
    expect(report.totals.manual).toBe(1);
    expect(report.totals.coverage).toBeCloseTo(1 / 3, 5);
    expect(report.totals.plannedCoverage).toBeCloseTo(2 / 3, 5);
    expect(report.totals.processesWithGap).toBe(1);
    expect(report.totals.openItems).toBe(1);
  });

  it('analyses a stored payload the same way as the live model', () => {
    const report = service.analysePayload({
      processes: [{ id: 'p1', name: 'Empty' } as any],
      apiCalls: [],
      journeys: [],
      capabilities: [],
      data: [],
      applications: [],
      roles: []
    });

    expect(report.processes.length).toBe(1);
    expect(report.processes[0].band).toBe('gap');
  });
});
