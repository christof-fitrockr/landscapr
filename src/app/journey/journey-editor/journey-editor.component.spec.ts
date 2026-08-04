import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ModalModule } from 'ngx-bootstrap/modal';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';

import { JourneyEditorComponent } from './journey-editor.component';
import { JourneyService } from '../../services/journey.service';
import { ProcessService } from '../../services/process.service';
import { RoleService } from '../../services/role.service';
import { ExperienceExpectation, Journey, JourneyLayout } from '../../models/journey.model';

describe('JourneyEditorComponent experience layer', () => {
  let component: JourneyEditorComponent;
  let fixture: ComponentFixture<JourneyEditorComponent>;
  let journey: Journey;

  const expectation = (id: string, nodeId: string, extra: Partial<ExperienceExpectation> = {}): ExperienceExpectation => ({
    id,
    nodeId,
    title: 'Expectation ' + id,
    expectation: 'The customer expects something',
    outcome: 'What the customer gets',
    fulfilment: 'met',
    ...extra
  });

  const layout = (): JourneyLayout => ({
    panX: 0,
    panY: 0,
    zoom: 1,
    nodes: [
      { id: 'n1', type: 'process', label: 'Step 1', x: 0, y: 500, width: 120, height: 60, processId: 'p1' },
      { id: 'n2', type: 'process', label: 'Step 2', x: 140, y: 500, width: 120, height: 60, processId: 'p2' },
      { id: 'n3', type: 'process', label: 'Step 3', x: 600, y: 500, width: 120, height: 60, processId: 'p3' }
    ],
    edges: [],
    expectations: [
      expectation('x1', 'n1', { persona: 'Fleet customer', fulfilment: 'missed' }),
      expectation('x2', 'n2', { persona: 'Private customer' }),
      expectation('x3', 'gone') // anchored to a step that no longer exists
    ],
    showExperienceLayer: true
  });

  beforeEach(async () => {
    journey = {
      id: 'j1',
      name: 'Journey',
      description: '',
      items: [],
      connections: [],
      status: 1,
      tags: [],
      layout: layout()
    };

    const journeyServiceStub = {
      byId: () => of(journey),
      update: (_id: string, updated: Journey) => of(updated)
    };

    await TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        RouterTestingModule,
        FormsModule,
        NgSelectModule,
        ModalModule.forRoot()
      ],
      declarations: [JourneyEditorComponent],
      providers: [
        { provide: JourneyService, useValue: journeyServiceStub },
        { provide: ProcessService, useValue: { all: () => of([]) } },
        { provide: RoleService, useValue: { getRoleColor: () => '#ffffff' } }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(JourneyEditorComponent);
    component = fixture.componentInstance;
    component.journeyId = 'j1';
    fixture.detectChanges();
  });

  it('drops expectations whose journey step no longer exists', () => {
    expect(component.expectations.map(e => e.id)).toEqual(['x1', 'x2']);
  });

  it('places the band above the journey and anchors a card per expectation', () => {
    const band = component.experienceBand!;
    const topNodeY = Math.min(...component.nodes.map(n => n.y));

    expect(band).toBeTruthy();
    expect(band.y + band.height).toBeLessThan(topNodeY);
    expect(component.experienceCards.length).toBe(2);
    expect(component.experienceCards.map(c => c.expectation.id)).toEqual(['x1', 'x2']);
  });

  it('keeps cards of steps that sit close to each other from overlapping', () => {
    const [first, second] = component.experienceCards;
    expect(second.x).toBeGreaterThanOrEqual(first.x + first.width);
  });

  it('puts a missed expectation below a fulfilled one on the experience curve', () => {
    const missed = component.experienceCards.find(c => c.expectation.fulfilment === 'missed')!;
    const met = component.experienceCards.find(c => c.expectation.fulfilment === 'met')!;
    expect(missed.curveY).toBeGreaterThan(met.curveY);
  });

  it('shows the result of a single customer when a persona filter is set', () => {
    component.personaFilter = 'Private customer';
    component.onPersonaFilterChange();

    expect(component.personas).toEqual(['Fleet customer', 'Private customer']);
    expect(component.experienceCards.length).toBe(1);
    expect(component.experienceCards[0].expectation.persona).toBe('Private customer');
    expect(component.experienceSummary).toContain('Private customer');
  });

  it('hides the layer without losing the captured expectations', () => {
    component.toggleExperienceLayer();

    expect(component.showExperienceLayer).toBeFalse();
    expect(component.experienceBand).toBeNull();
    expect(component.experienceCards.length).toBe(0);
    expect(component.expectations.length).toBe(2);
  });

  it('stores expectations and the layer state in the journey layout', () => {
    const built = component['buildLayout']();

    expect(built.expectations?.map(e => e.id)).toEqual(['x1', 'x2']);
    expect(built.showExperienceLayer).toBeTrue();
  });
});
