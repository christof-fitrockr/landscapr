import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { ModalModule } from 'ngx-bootstrap/modal';
import { ToastrService } from 'ngx-toastr';
import { of } from 'rxjs';

import { ProcessViewComponent } from './process-view.component';
import { ProcessService } from '../services/process.service';
import { ApiCallService } from '../services/api-call.service';
import { ApplicationService } from '../services/application.service';
import { JourneyService } from '../services/journey.service';
import { FlowViewService } from './flow-view.service';
import { Journey } from '../models/journey.model';
import { Process } from '../models/process';

describe('ProcessViewComponent finding the way up', () => {
  let component: ProcessViewComponent;
  let fixture: ComponentFixture<ProcessViewComponent>;
  let router: Router;

  const process = (id: string, name: string): Process => ({
    id, name, repoId: '', description: '', status: 0, input: '', output: '', tags: [],
    role: '', steps: [], apiCallIds: [], favorite: false, implementedBy: []
  } as any);

  const journey = (id: string, name: string, processIds: string[]): Journey => ({
    id, name, description: '', items: [], connections: [], status: 0, tags: [],
    layout: {
      panX: 0, panY: 0, zoom: 1, edges: [], expectations: [],
      nodes: processIds.map((processId, index) =>
        ({ id: 'n' + index, type: 'process' as const, x: 0, y: 0, width: 120, height: 60, processId }))
    }
  } as any);

  let parents: Process[];
  let journeys: Journey[];

  const build = async () => {
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, ModalModule.forRoot()],
      declarations: [ProcessViewComponent],
      providers: [
        FormBuilder,
        { provide: ProcessService, useValue: {
          byId: () => of(process('me', 'Charging Session & Fuel Transaction Ingestion')),
          allParents: () => of(parents)
        } },
        { provide: ApiCallService, useValue: { byIds: () => of([]) } },
        { provide: ApplicationService, useValue: { byIds: () => of([]) } },
        { provide: JourneyService, useValue: { all: () => of(journeys) } },
        { provide: FlowViewService, useValue: { selection$: of({ type: 'none', data: null }) } },
        { provide: ToastrService, useValue: { error: () => {}, success: () => {} } },
        { provide: Location, useValue: { back: () => {} } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'me' } }, parent: null } }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(ProcessViewComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  };

  beforeEach(() => {
    parents = [];
    journeys = [];
  });

  it('offers the process that calls this one', async () => {
    parents = [process('parent', 'Multi-Fuel & Expense Clearing')];
    await build();

    expect(component.upTargets.length).toBe(1);
    expect(component.upTargets[0]).toEqual({ kind: 'process', id: 'parent', name: 'Multi-Fuel & Expense Clearing' });
  });

  it('offers the journey a process sits on when nothing calls it', async () => {
    journeys = [journey('j1', 'B2B Fleet Journey', ['me'])];
    await build();

    expect(component.upTargets).toEqual([{ kind: 'journey', id: 'j1', name: 'B2B Fleet Journey' }]);
  });

  it('offers every place a process is used, callers before journeys', async () => {
    parents = [process('p1', 'Parent one'), process('p2', 'Parent two')];
    journeys = [journey('j1', 'On this journey', ['me']), journey('j2', 'Somewhere else', ['other'])];
    await build();

    expect(component.upTargets.map(t => t.name)).toEqual(['Parent one', 'Parent two', 'On this journey']);
  });

  it('offers nothing to a process nobody uses, rather than a dead button', async () => {
    await build();
    expect(component.upTargets).toEqual([]);
  });

  it('goes to the one place above it when there is only one', async () => {
    parents = [process('parent', 'Parent')];
    await build();
    spyOn(component, 'showProcess');

    component.goUp();

    expect(component.showProcess).toHaveBeenCalledWith('parent');
  });

  it('goes to the journey when that is what was chosen', async () => {
    journeys = [journey('j1', 'B2B Fleet Journey', ['me'])];
    await build();
    const navigate = spyOn(router, 'navigate');

    component.showUpMenu = true;
    component.goUp(component.upTargets[0]);

    expect(navigate).toHaveBeenCalledWith(['/journeys/editor', 'j1']);
    expect(component.showUpMenu).toBeFalse();
  });
});
