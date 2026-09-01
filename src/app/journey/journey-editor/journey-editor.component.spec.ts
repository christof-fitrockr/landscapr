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

describe('JourneyEditorComponent moving and sizing the view', () => {
  let component: JourneyEditorComponent;
  let fixture: ComponentFixture<JourneyEditorComponent>;
  let journey: Journey;

  /** A press or a move of the mouse, as far as the editor is concerned */
  const mouse = (clientX: number, clientY: number, button = 0): MouseEvent =>
    ({ clientX, clientY, button, shiftKey: false, preventDefault: () => {}, stopPropagation: () => {} } as any);

  beforeEach(async () => {
    journey = {
      id: 'j1', name: 'Journey', description: '', items: [], connections: [], status: 1, tags: [],
      layout: {
        panX: 0, panY: 0, zoom: 1,
        nodes: [
          { id: 'n1', type: 'process', label: 'Step 1', x: 100, y: 100, width: 120, height: 60, processId: 'p1' },
          { id: 'n2', type: 'process', label: 'Step 2', x: 900, y: 400, width: 120, height: 60, processId: 'p2' }
        ],
        edges: [], expectations: [], showExperienceLayer: false
      }
    };

    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, RouterTestingModule, FormsModule, NgSelectModule, ModalModule.forRoot()],
      declarations: [JourneyEditorComponent],
      providers: [
        { provide: JourneyService, useValue: { byId: () => of(journey), update: (_id: string, u: Journey) => of(u) } },
        { provide: ProcessService, useValue: { all: () => of([]) } },
        { provide: RoleService, useValue: { getRoleColor: () => '#ffffff' } }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(JourneyEditorComponent);
    component = fixture.componentInstance;
    component.journeyId = 'j1';
    fixture.detectChanges();

    // a view of a known size, so fitting can be reasoned about
    component['svgEl'].nativeElement.getBoundingClientRect = () =>
      ({ width: 800, height: 600, x: 0, y: 0, top: 0, left: 0, right: 800, bottom: 600, toJSON: () => ({}) } as DOMRect);
  });

  it('moves the view when the background is dragged', () => {
    component['getSvgPoint'] = () => ({ x: 5000, y: 5000 }); // nowhere near a step

    component.onCanvasMouseDown(mouse(300, 300));
    component.onCanvasMouseMove(mouse(340, 320));

    expect(component.panX).toBe(40);
    expect(component.panY).toBe(20);
    expect(component.nodes.map(n => n.x)).toEqual([100, 900]);
  });

  it('shows the closed hand while the view is being dragged, and lets go afterwards', () => {
    component['getSvgPoint'] = () => ({ x: 5000, y: 5000 });

    component.onCanvasMouseDown(mouse(300, 300));
    expect(component.isPanning).toBeTrue();

    component.onCanvasMouseUp(mouse(300, 300));
    expect(component.isPanning).toBeFalse();
  });

  it('moves the step when a step is dragged, and leaves the view where it is', () => {
    let point = { x: 150, y: 130 }; // inside the first step
    component['getSvgPoint'] = () => point;

    component.onCanvasMouseDown(mouse(150, 130));
    point = { x: 200, y: 160 };
    component.onCanvasMouseMove(mouse(200, 160));

    expect(component.nodes[0].x).toBe(150);
    expect(component.nodes[0].y).toBe(130);
    expect(component.panX).toBe(0);
    expect(component.panY).toBe(0);
  });

  it('does not record a step that was only clicked as something to undo', () => {
    component['getSvgPoint'] = () => ({ x: 150, y: 130 });

    component.onCanvasMouseDown(mouse(150, 130));
    component.onCanvasMouseUp(mouse(150, 130));

    expect(component.nodes[0].selected).toBeTrue();
    expect(component.canUndo()).toBeFalse();
  });

  it('records a step that was actually moved', () => {
    let point = { x: 150, y: 130 };
    component['getSvgPoint'] = () => point;

    component.onCanvasMouseDown(mouse(150, 130));
    point = { x: 220, y: 130 };
    component.onCanvasMouseMove(mouse(220, 130));

    expect(component.canUndo()).toBeTrue();
  });

  it('brings the whole journey into view when it is asked to fit', () => {
    component.fitToScreen();

    const corners = component.nodes.map(n => ({
      left: n.x * component.zoom + component.panX,
      top: n.y * component.zoom + component.panY,
      right: (n.x + n.width) * component.zoom + component.panX,
      bottom: (n.y + n.height) * component.zoom + component.panY
    }));

    corners.forEach(corner => {
      expect(corner.left).toBeGreaterThanOrEqual(0);
      expect(corner.top).toBeGreaterThanOrEqual(0);
      expect(corner.right).toBeLessThanOrEqual(800);
      expect(corner.bottom).toBeLessThanOrEqual(600);
    });
  });

  it('keeps the middle of the view in place while zooming', () => {
    const worldBefore = {
      x: (400 - component.panX) / component.zoom,
      y: (300 - component.panY) / component.zoom
    };

    component.zoomIn();

    expect(component.zoom).toBeGreaterThan(1);
    expect((400 - component.panX) / component.zoom).toBeCloseTo(worldBefore.x, 6);
    expect((300 - component.panY) / component.zoom).toBeCloseTo(worldBefore.y, 6);
  });

  it('does not zoom further out than the canvas allows', () => {
    for (let step = 0; step < 30; step++) {
      component.zoomOut();
    }
    expect(component.zoom).toBe(0.2);
    expect(component.zoomPercent).toBe(20);
  });

  it('goes back to actual size', () => {
    component.zoomIn();
    component.resetZoom();
    expect(component.zoom).toBe(1);
    expect(component.zoomPercent).toBe(100);
  });
});
