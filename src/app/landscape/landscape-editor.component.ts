import { Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { first } from 'rxjs/operators';

import {
  LandscapeBand,
  LandscapeService,
  LandscapeSource,
  LandscapeElementValues,
  LANDSCAPE_NODE_HEIGHT,
  LANDSCAPE_NODE_WIDTH
} from '../services/landscape.service';
import {
  landscapeNodeId,
  parseLandscapeNodeId,
  DEFAULT_LANDSCAPE_VIEW_ID,
  LandscapeEdge,
  LandscapeGraph,
  LandscapeImpact,
  LandscapeLayer,
  LandscapeLayerMeta,
  LandscapeNode,
  LandscapeView,
  Persona,
  PersonaMeta,
  LANDSCAPE_LAYERS,
  LANDSCAPE_LAYER_META,
  PERSONAS,
  PERSONA_META
} from '../models/landscape.model';
import { PersonaService } from '../services/persona.service';
import { ReviewSessionService, ReviewSession, ConflictChoice } from '../services/review-session.service';
import { ChangeState, ModelDiffService, ModelPayload, ObjectChange } from '../services/model-diff.service';
import { ScenarioService } from '../services/scenario.service';
import { Scenario, ScenarioStatus, ScenarioSummary, scenarioSummary, SCENARIO_STATUS_LABELS } from '../models/scenario.model';
import { ScenarioEditModalComponent, ScenarioValues } from './scenario-edit-modal.component';
import { ConfirmationDialogComponent } from '../components/confirmation-dialog.component';
import { BsModalService } from 'ngx-bootstrap/modal';
import { RepoService } from '../services/repo.service';
import { Subscription } from 'rxjs';

export type LandscapeTool = 'select' | 'connect' | LandscapeLayer;

@Component({
  selector: 'app-landscape-editor',
  templateUrl: './landscape-editor.component.html',
  styleUrls: ['./landscape-editor.component.scss']
})
export class LandscapeEditorComponent implements OnInit, OnDestroy {

  @ViewChild('svgEl', { static: true }) svgEl: ElementRef<SVGSVGElement>;

  source: LandscapeSource | null = null;
  graph: LandscapeGraph = { nodes: [], edges: [] };
  bands: LandscapeBand[] = [];
  view: LandscapeView = { id: DEFAULT_LANDSCAPE_VIEW_ID, positions: {}, hiddenLayers: [], panX: 40, panY: 40, zoom: 0.8 };
  loading = true;

  // Toolbar
  layers: LandscapeLayerMeta[] = LANDSCAPE_LAYERS.map(layer => LANDSCAPE_LAYER_META[layer]);
  creatableLayers: LandscapeLayerMeta[] = this.layers.filter(l => l.creatable);
  activeTool: LandscapeTool = 'select';
  searchText = '';
  focusMode = false;

  // Persona: the same model, told from the point of view of who is looking
  personas: PersonaMeta[] = PERSONAS.map(persona => PERSONA_META[persona]);
  persona: Persona = 'business';

  // Blast radius
  impactSource: LandscapeNode | null = null;
  impact: LandscapeImpact[] = [];

  // Target picture: the canvas shows the model as it is planned to become
  scenarios: Scenario[] = [];
  scenario: Scenario | null = null;
  /** the model of today, kept aside while a target picture is shown */
  private today: LandscapeSource | null = null;

  // Review mode: the canvas shows two states of the model instead of one
  review: ReviewSession | null = null;
  reviewGroups: { state: ChangeState; label: string }[] = [
    { state: 'added', label: 'Added' },
    { state: 'modified', label: 'Changed' },
    { state: 'removed', label: 'Removed' }
  ];
  reviewSelection: ObjectChange | null = null;
  private reviewSubscription: Subscription | null = null;

  // Selection
  selectedNode: LandscapeNode | null = null;
  selectedEdge: LandscapeEdge | null = null;
  connectSourceId: string | null = null;

  // Canvas
  panX = 40;
  panY = 40;
  zoom = 0.8;
  private isPanning = false;
  private lastPanX = 0;
  private lastPanY = 0;
  private spacePressed = false;

  // Node dragging
  private isDragging = false;
  private dragNodeId: string | null = null;
  private dragStart = { x: 0, y: 0 };
  private dragOrigin = { x: 0, y: 0 };
  private dragMoved = false;

  private saveTimer: any;

  constructor(
    private landscapeService: LandscapeService,
    private personaService: PersonaService,
    private reviewSessionService: ReviewSessionService,
    private scenarioService: ScenarioService,
    private modelDiffService: ModelDiffService,
    private modalService: BsModalService,
    private repoService: RepoService,
    private router: Router,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.persona = this.personaService.persona;
    this.scenarioService.all().pipe(first()).subscribe(scenarios => this.scenarios = scenarios || []);
    this.reviewSubscription = this.reviewSessionService.session$.subscribe(session => {
      this.review = session;
      if (this.source) {
        this.rebuild();
      }
    });
    this.refresh();
  }

  ngOnDestroy(): void {
    this.reviewSubscription?.unsubscribe();
  }

  refresh(): void {
    this.loading = true;
    this.landscapeService.hasView().pipe(first()).subscribe(seenBefore => {
      this.landscapeService.loadView().pipe(first()).subscribe(view => {
        this.view = view;
        this.panX = view.panX ?? 40;
        this.panY = view.panY ?? 40;
        this.zoom = view.zoom || 0.8;
        // without a stored view the persona decides which layers are shown
        if (!seenBefore) {
          const shown = PERSONA_META[this.persona].layers;
          this.view.hiddenLayers = LANDSCAPE_LAYERS.filter(layer => shown.indexOf(layer) < 0);
        }

        this.landscapeService.load().pipe(first()).subscribe(source => {
          this.today = source;
          this.scenarioService.restoreActive().pipe(first()).subscribe(scenario => {
            this.scenario = scenario;
            this.source = this.applyScenario(source, scenario);
            this.landscapeService.planningMode = !!scenario;
            this.rebuild();
          });
          this.loading = false;
          // on the very first visit show the whole landscape at once
          if (!seenBefore) {
            setTimeout(() => this.fitToScreen(), 0);
          }
        }, () => {
          this.loading = false;
          this.toastr.error('The model could not be loaded');
        });
      });
    });
  }

  /** Rebuilds graph and layout from the current entity snapshot */
  private rebuild(keepSelection = true): void {
    if (!this.source) return;
    const selectedNodeId = keepSelection ? this.selectedNode?.id : null;
    const selectedEdgeId = keepSelection ? this.selectedEdge?.id : null;

    // a review shows both states at once, so removed elements and cut relations
    // stay visible; the diff already prepared that picture
    const graph = this.review
      ? { nodes: this.review.diff.graph.nodes.map(n => ({ ...n })), edges: this.review.diff.graph.edges.map(e => ({ ...e })) }
      : this.landscapeService.buildGraph(this.source);
    graph.nodes = graph.nodes.filter(n => !this.isLayerHidden(n.layer));
    const visible = new Set(graph.nodes.map(n => n.id));
    graph.edges = graph.edges.filter(e => visible.has(e.from) && visible.has(e.to));

    this.graph = graph;
    this.bands = this.landscapeService.layout(this.graph, this.view);

    if (this.impactSource) {
      const stillThere = this.graph.nodes.find(n => n.id === this.impactSource!.id);
      this.impactSource = stillThere || null;
      this.impact = stillThere ? this.landscapeService.impactOf(this.graph, stillThere.id) : [];
    }

    if (this.review) {
      this.applyReviewStates();
    } else if (this.scenario && !this.isRealised) {
      this.applyPlannedStates();
    }

    this.selectedNode = selectedNodeId ? this.graph.nodes.find(n => n.id === selectedNodeId) || null : null;
    this.selectedEdge = selectedEdgeId ? this.graph.edges.find(e => e.id === selectedEdgeId) || null : null;
    if (this.selectedNode) this.selectedNode.selected = true;
    if (this.selectedEdge) this.selectedEdge.selected = true;
    this.applyHighlighting();
  }

  // ---------------------------------------------------------------------------
  // Target picture
  // ---------------------------------------------------------------------------

  /**
   * Puts the plan on top of today's model. Elements that are planned to go stay
   * in the picture on purpose - a target picture has to show what falls away.
   */
  private applyScenario(today: LandscapeSource, scenario: Scenario | null): LandscapeSource {
    if (!scenario) {
      return today;
    }
    // applyTo already hands out copies, so editing here cannot reach today's model
    const planned = this.scenarioService.applyTo(this.toPayload(today), scenario);
    const display = this.toSource(planned, today.roles);

    // bring the elements that are planned to disappear back into the drawing
    Object.entries(scenario.changes).forEach(([nodeId, change]) => {
      if (change.state !== 'removed') return;
      const parsed = parseLandscapeNodeId(nodeId);
      if (!parsed) return;
      const original = this.entitiesOf(today, parsed.layer).find(item => item.id === parsed.entityId);
      if (original) {
        this.entitiesOf(display, parsed.layer).push(JSON.parse(JSON.stringify(original)));
      }
    });

    return display;
  }

  /** The model as it would be once the plan is reality */
  private plannedTargetPayload(): ModelPayload {
    const payload = this.toPayload(this.source!);
    const removed = new Set(Object.entries(this.scenario?.changes || {})
      .filter(([, change]) => change.state === 'removed')
      .map(([nodeId]) => nodeId));

    LANDSCAPE_LAYERS.forEach(layer => {
      if (layer === 'experience') return;
      const items = this.entitiesOf(this.toSourceRef(payload), layer);
      const kept = items.filter(item => !removed.has(landscapeNodeId(layer, item.id)));
      this.setEntities(payload, layer, kept);
    });
    return payload;
  }

  /** Stores what the target picture currently looks like */
  private persistPlan(): void {
    if (!this.scenario || !this.today || !this.source) return;
    this.scenarioService
      .saveTargetState(this.scenario, this.toPayload(this.today), this.plannedTargetPayload())
      .pipe(first())
      .subscribe(updated => {
        this.scenario = updated;
        this.scenarios = this.scenarios.map(item => item.id === updated.id ? updated : item);
        this.rebuild();
      }, () => this.toastr.error('The target picture could not be saved'));
  }

  switchScenario(scenario: Scenario | null): void {
    this.scenarioService.activate(scenario);
    this.scenario = scenario;
    this.landscapeService.planningMode = !!scenario;
    this.clearSelection();
    if (this.today) {
      this.source = this.applyScenario(this.today, scenario);
      this.rebuild(false);
    }
    this.toastr.info(scenario ? `Target picture: ${scenario.name}` : 'Showing the model as it is today');
  }

  switchScenarioById(id: string): void {
    this.switchScenario(id ? (this.scenarios.find(item => item.id === id) || null) : null);
  }

  createScenario(): void {
    const ref = this.modalService.show(ScenarioEditModalComponent, { initialState: {} });
    const form = ref.content as ScenarioEditModalComponent;
    if (!form) return;

    form.saved.subscribe((values: ScenarioValues) => {
      this.scenarioService.create(values.name, values.description, values.targetDate)
        .pipe(first())
        .subscribe(created => {
          const scenario = { ...created, status: values.status };
          this.scenarioService.update(scenario).pipe(first()).subscribe(stored => {
            this.scenarios = [...this.scenarios, stored].sort((a, b) => a.name.localeCompare(b.name));
            // switch only once the new entry exists in the picker, otherwise the
            // selection falls back to today
            setTimeout(() => this.switchScenario(stored));
          });
        }, () => this.toastr.error('The target picture could not be created'));
    });
  }

  /** Name, purpose, target date and status of the open target picture */
  editScenario(): void {
    if (!this.scenario) return;
    const ref = this.modalService.show(ScenarioEditModalComponent, { initialState: {} });
    const form = ref.content as ScenarioEditModalComponent;
    if (!form) return;

    form.load(this.scenario);
    form.saved.subscribe((values: ScenarioValues) => {
      this.scenarioService.update({ ...this.scenario!, ...values }).pipe(first()).subscribe(updated => {
        this.scenario = updated;
        this.scenarios = this.scenarios
          .map(item => item.id === updated.id ? updated : item)
          .sort((a, b) => a.name.localeCompare(b.name));
        this.toastr.success('Target picture saved');
      }, () => this.toastr.error('The target picture could not be saved'));
    });
  }

  statusLabel(scenario: Scenario | null): string {
    return scenario ? SCENARIO_STATUS_LABELS[scenario.status] : '';
  }

  get isRealised(): boolean {
    return this.scenario?.status === ScenarioStatus.Realised;
  }

  /**
   * The plan has happened: everything it describes becomes the model of today.
   * The target picture itself is kept as a record of what was decided.
   */
  adoptScenario(): void {
    if (!this.scenario || !this.today || this.review) return;
    const scenario = this.scenario;
    const summary = this.plannedSummary;

    if (summary.total === 0) {
      this.toastr.info('This target picture does not change anything yet');
      return;
    }

    const ref = this.modalService.show(ConfirmationDialogComponent, {
      initialState: {
        title: 'Make this target picture reality',
        message: `${summary.added} new, ${summary.modified} changed and ${summary.removed} dropped elements `
          + `become the model of today. The target picture is kept as a record of the decision.`,
        btnYesText: 'Yes, adopt it',
        btnNoText: 'Cancel'
      }
    });

    const content: any = ref.content;
    if (!content?.onClose) return;
    content.onClose.pipe(first()).subscribe((confirmed: boolean) => {
      if (confirmed) {
        this.applyScenarioToReality(scenario);
      }
    });
  }

  private applyScenarioToReality(scenario: Scenario): void {
    this.loading = true;
    this.repoService.getCurrentData().pipe(first()).subscribe(current => {
      const target = this.scenarioService.applyTo({
        journeys: current.journeys,
        processes: current.processes,
        capabilities: current.capabilities,
        apiCalls: current.apiCalls,
        data: current.data,
        applications: current.applications,
        roles: current.roles
      }, scenario);

      const realised = this.scenarioService.asRealised(scenario);
      const payload = {
        ...target,
        roles: current.roles || [],
        // everything that is not part of the model itself has to travel along,
        // otherwise applying the plan would wipe it
        landscapeViews: current.landscapeViews || [],
        scenarios: (current.scenarios || []).map((item: Scenario) => item.id === realised.id ? realised : item)
      };

      this.repoService.uploadJsonContent(payload).pipe(first()).subscribe(() => {
        this.scenarioService.activate(null);
        this.scenario = null;
        this.landscapeService.planningMode = false;
        this.scenarios = this.scenarios.map(item => item.id === realised.id ? realised : item);
        this.toastr.success(`"${realised.name}" is the model of today now`);
        this.refresh();
      }, () => {
        this.loading = false;
        this.toastr.error('The target picture could not be adopted');
      });
    }, () => {
      this.loading = false;
      this.toastr.error('The model of today could not be read');
    });
  }

  deleteScenario(): void {
    if (!this.scenario) return;
    const scenario = this.scenario;
    if (!window.confirm(`Delete the target picture "${scenario.name}"? The model of today stays untouched.`)) return;
    this.scenarioService.delete(scenario.id).pipe(first()).subscribe(() => {
      this.scenarios = this.scenarios.filter(item => item.id !== scenario.id);
      this.switchScenario(null);
      this.toastr.success('Target picture deleted');
    });
  }

  get plannedSummary(): ScenarioSummary {
    return scenarioSummary(this.scenario);
  }

  plannedStateOf(node: LandscapeNode | null): string | null {
    if (!node || !this.scenario) return null;
    return this.scenarioService.plannedStateOf(this.scenario, node.id);
  }

  /** Plans an element to fall away, or takes that plan back */
  togglePlannedRemoval(node: LandscapeNode): void {
    if (!this.scenario) return;
    this.scenarioService.toggleRemoval(this.scenario, node.id).pipe(first()).subscribe(updated => {
      this.scenario = updated;
      this.scenarios = this.scenarios.map(item => item.id === updated.id ? updated : item);
      this.source = this.applyScenario(this.today!, updated);
      this.rebuild();
    });
  }

  /** Drops the plan for one element, bringing it back to today's state */
  revertPlanned(node: LandscapeNode): void {
    if (!this.scenario) return;
    this.scenarioService.revert(this.scenario, node.id).pipe(first()).subscribe(updated => {
      this.scenario = updated;
      this.scenarios = this.scenarios.map(item => item.id === updated.id ? updated : item);
      this.source = this.applyScenario(this.today!, updated);
      this.rebuild();
      this.toastr.info('Back to how it is today');
    });
  }

  /** Shows today and the target picture side by side, with the diff language */
  compareWithToday(): void {
    if (!this.scenario || !this.today) return;
    this.reviewSessionService.startReview(this.toPayload(this.today), this.plannedTargetPayload(), {
      title: `Today compared to "${this.scenario.name}"`,
      mineLabel: 'Target picture',
      theirsLabel: 'Today'
    });
  }

  private toPayload(source: LandscapeSource): ModelPayload {
    return {
      journeys: source.journeys,
      processes: source.processes,
      capabilities: source.capabilities,
      apiCalls: source.apiCalls,
      data: source.data,
      applications: source.applications,
      roles: source.roles
    };
  }

  private toSource(payload: ModelPayload, roles: any[]): LandscapeSource {
    return {
      journeys: (payload.journeys || []) as any,
      processes: (payload.processes || []) as any,
      capabilities: (payload.capabilities || []) as any,
      apiCalls: (payload.apiCalls || []) as any,
      data: (payload.data || []) as any,
      applications: (payload.applications || []) as any,
      roles: roles || []
    };
  }

  private toSourceRef(payload: ModelPayload): LandscapeSource {
    return this.toSource(payload, []);
  }

  private entitiesOf(source: LandscapeSource, layer: LandscapeLayer): any[] {
    switch (layer) {
      case 'journey': return source.journeys as any[];
      case 'process': return source.processes as any[];
      case 'capability': return source.capabilities as any[];
      case 'api': return source.apiCalls as any[];
      case 'data': return source.data as any[];
      case 'system': return source.applications as any[];
      default: return [];
    }
  }

  private setEntities(payload: ModelPayload, layer: LandscapeLayer, items: any[]): void {
    switch (layer) {
      case 'journey': payload.journeys = items; break;
      case 'process': payload.processes = items; break;
      case 'capability': payload.capabilities = items; break;
      case 'api': payload.apiCalls = items; break;
      case 'data': payload.data = items; break;
      case 'system': payload.applications = items; break;
    }
  }

  // ---------------------------------------------------------------------------
  // Persona
  // ---------------------------------------------------------------------------

  /**
   * Switching the persona does not touch the model, it only decides which
   * layers are put in front of the user by default.
   */
  setPersona(persona: Persona): void {
    if (this.persona === persona) return;
    this.persona = persona;
    this.personaService.set(persona);

    const shown = PERSONA_META[persona].layers;
    this.view.hiddenLayers = LANDSCAPE_LAYERS.filter(layer => shown.indexOf(layer) < 0);
    this.rebuild();
    this.scheduleViewSave();
  }

  personaMeta(persona: Persona): PersonaMeta {
    return PERSONA_META[persona];
  }

  // ---------------------------------------------------------------------------
  // Blast radius
  // ---------------------------------------------------------------------------

  /** Shows everything that breaks if the given element changes or is retired */
  showImpact(node: LandscapeNode): void {
    this.impactSource = node;
    this.impact = this.landscapeService.impactOf(this.graph, node.id);
    this.focusMode = false;
    this.applyHighlighting();
    if (this.impact.length === 0) {
      this.toastr.info(`Nothing else depends on ${node.label}`);
    }
  }

  closeImpact(): void {
    this.impactSource = null;
    this.impact = [];
    this.applyHighlighting();
  }

  /** The affected elements grouped by layer, for the summary list */
  impactByLayer(): { layer: LandscapeLayer; meta: LandscapeLayerMeta; nodes: LandscapeNode[] }[] {
    return LANDSCAPE_LAYERS
      .map(layer => ({
        layer,
        meta: LANDSCAPE_LAYER_META[layer],
        nodes: this.impact.filter(entry => entry.node.layer === layer).map(entry => entry.node)
      }))
      .filter(group => group.nodes.length > 0);
  }

  /** Customer facing elements are the ones the business side has to hear about */
  customerImpactCount(): number {
    return this.impact.filter(entry => entry.node.layer === 'experience' || entry.node.layer === 'journey').length;
  }

  // ---------------------------------------------------------------------------
  // Review mode
  // ---------------------------------------------------------------------------

  /** Paints the elements a target picture adds, changes or drops */
  private applyPlannedStates(): void {
    const changes = this.scenario?.changes || {};
    this.graph.nodes.forEach(node => {
      const planned = changes[node.id];
      node.changeState = planned ? planned.state : 'unchanged';
      node.conflict = false;
      node.resolved = null;
    });
    this.graph.edges.forEach(edge => edge.changeState = 'unchanged');
  }

  /** Paints every element and relation with the state it has in the review */
  private applyReviewStates(): void {
    const review = this.review;
    if (!review) return;

    this.graph.nodes.forEach(node => {
      const change = review.diff.changes[node.id];
      node.changeState = change ? change.state : 'unchanged';
      node.conflict = !!change?.conflict;
      node.resolved = change?.conflict ? (review.resolutions[node.id] || null) : null;
    });

    this.graph.edges.forEach(edge => {
      edge.changeState = review.diff.edgeStates[edge.id] || 'unchanged';
    });
  }

  /**
   * True whenever the canvas paints change states. An adopted target picture is
   * reality by now, so it is drawn like any other model instead of as a plan.
   */
  get showChangeStates(): boolean {
    return !!this.review || (!!this.scenario && !this.isRealised);
  }

  get reviewCounts(): { added: number; removed: number; modified: number; conflicts: number } | null {
    if (!this.review) return null;
    return {
      added: this.review.diff.added,
      removed: this.review.diff.removed,
      modified: this.review.diff.modified,
      conflicts: this.review.diff.conflicts.length
    };
  }

  get openConflicts(): ObjectChange[] {
    return this.reviewSessionService.openConflicts();
  }

  get allConflictsResolved(): boolean {
    return !!this.review && this.review.mode === 'conflicts' && this.openConflicts.length === 0;
  }

  changeFor(node: LandscapeNode | null): ObjectChange | null {
    if (!node || !this.review) return null;
    return this.review.diff.changes[node.id] || null;
  }

  /** The elements that changed, grouped for the summary list */
  reviewChanges(state: ChangeState): ObjectChange[] {
    if (!this.review) return [];
    return Object.values(this.review.diff.changes)
      .filter(change => change.state === state)
      .sort((a, b) => a.layer.localeCompare(b.layer) || a.label.localeCompare(b.label));
  }

  selectChange(change: ObjectChange): void {
    const node = this.graph.nodes.find(n => n.id === change.nodeId);
    if (node) {
      this.selectNode(node);
      this.reviewSelection = change;
    }
  }

  resolveConflict(nodeId: string, choice: ConflictChoice): void {
    this.reviewSessionService.resolve(nodeId, choice);
    this.applyReviewStates();
  }

  resolveAllConflicts(choice: ConflictChoice): void {
    this.reviewSessionService.resolveAll(choice);
    this.applyReviewStates();
  }

  applyResolution(): void {
    if (!this.allConflictsResolved) {
      this.toastr.warning('Please decide about every highlighted element first');
      return;
    }
    const merged = this.reviewSessionService.apply();
    if (merged) {
      this.toastr.success('The resolved version is now the one you work on');
      this.refresh();
    }
  }

  endReview(): void {
    this.reviewSessionService.end();
    this.reviewSelection = null;
    this.refresh();
  }

  /** Colour of the badge shown on a changed element */
  changeBadge(state: ChangeState | undefined): string {
    switch (state) {
      case 'added': return '+';
      case 'removed': return '\u2212';
      case 'modified': return '*';
      default: return '';
    }
  }

  // ---------------------------------------------------------------------------
  // Filtering, search and focus
  // ---------------------------------------------------------------------------

  isLayerHidden(layer: LandscapeLayer): boolean {
    return (this.view.hiddenLayers || []).indexOf(layer) >= 0;
  }

  toggleLayer(layer: LandscapeLayer): void {
    const hidden = this.view.hiddenLayers || [];
    this.view.hiddenLayers = this.isLayerHidden(layer)
      ? hidden.filter(l => l !== layer)
      : [...hidden, layer];
    this.rebuild();
    this.scheduleViewSave();
  }

  onSearchChange(): void {
    this.applyHighlighting();
  }

  toggleFocusMode(): void {
    this.focusMode = !this.focusMode;
    this.applyHighlighting();
  }

  /** Dims everything that neither matches the search nor belongs to the focus */
  private applyHighlighting(): void {
    const term = (this.searchText || '').trim().toLowerCase();
    const focusIds = this.focusMode && this.selectedNode ? this.neighbourhood(this.selectedNode.id) : null;
    const impactIds = this.impactSource
      ? new Set<string>([this.impactSource.id, ...this.impact.map(entry => entry.node.id)])
      : null;

    this.graph.nodes.forEach(node => {
      const matchesSearch = !term
        || node.label.toLowerCase().includes(term)
        || (node.sublabel || '').toLowerCase().includes(term);
      const inFocus = !focusIds || focusIds.has(node.id);
      const inImpact = !impactIds || impactIds.has(node.id);
      // in a review the delta is what matters, everything else steps back
      const inReview = !this.review
        || (this.review.mode === 'conflicts' ? !!node.conflict : node.changeState !== 'unchanged');
      node.dimmed = !(matchesSearch && inFocus && inImpact && inReview);
      node.impacted = !!impactIds && impactIds.has(node.id) && node.id !== this.impactSource?.id;
    });

    this.graph.edges.forEach(edge => {
      const from = this.nodeById(edge.from);
      const to = this.nodeById(edge.to);
      edge.dimmed = !!(from?.dimmed || to?.dimmed);
    });
  }

  /** Ids of a node and everything directly connected to it */
  private neighbourhood(nodeId: string): Set<string> {
    const ids = new Set<string>([nodeId]);
    this.graph.edges.forEach(edge => {
      if (edge.from === nodeId) ids.add(edge.to);
      if (edge.to === nodeId) ids.add(edge.from);
    });
    return ids;
  }

  matchCount(): number {
    return this.graph.nodes.filter(n => !n.dimmed).length;
  }

  // ---------------------------------------------------------------------------
  // Tools
  // ---------------------------------------------------------------------------

  setTool(tool: LandscapeTool): void {
    this.activeTool = tool;
    this.connectSourceId = null;
  }

  layerMeta(layer: LandscapeLayer): LandscapeLayerMeta {
    return LANDSCAPE_LAYER_META[layer];
  }

  get connectHint(): string | null {
    if (this.activeTool !== 'connect') return null;
    if (!this.connectSourceId) return 'Click the element the relation starts at';
    const node = this.nodeById(this.connectSourceId);
    return `Now click the element to connect with "${node?.label || ''}"`;
  }

  // ---------------------------------------------------------------------------
  // Canvas interaction
  // ---------------------------------------------------------------------------

  onCanvasMouseDown(event: MouseEvent): void {
    if (event.button === 1 || event.button === 2 || event.shiftKey || this.spacePressed) {
      this.isPanning = true;
      this.lastPanX = event.clientX;
      this.lastPanY = event.clientY;
      return;
    }

    const point = this.toWorld(event);
    const node = this.nodeAt(point.x, point.y);

    if (node) {
      this.onNodeHit(node, point);
      return;
    }

    // empty canvas
    if (this.activeTool !== 'select' && this.activeTool !== 'connect') {
      this.createElement(this.activeTool as LandscapeLayer, point);
      return;
    }
    this.clearSelection();
  }

  private onNodeHit(node: LandscapeNode, point: { x: number; y: number }): void {
    if (this.activeTool === 'connect') {
      this.handleConnect(node);
      return;
    }

    this.selectNode(node);
    this.isDragging = true;
    this.dragMoved = false;
    this.dragNodeId = node.id;
    this.dragStart = point;
    this.dragOrigin = { x: node.x, y: node.y };
  }

  onCanvasMouseMove(event: MouseEvent): void {
    if (this.isPanning) {
      this.panX += event.clientX - this.lastPanX;
      this.panY += event.clientY - this.lastPanY;
      this.lastPanX = event.clientX;
      this.lastPanY = event.clientY;
      return;
    }

    if (this.isDragging && this.dragNodeId) {
      const point = this.toWorld(event);
      const node = this.nodeById(this.dragNodeId);
      if (node) {
        node.x = this.dragOrigin.x + (point.x - this.dragStart.x);
        node.y = this.dragOrigin.y + (point.y - this.dragStart.y);
        node.pinned = true;
        this.dragMoved = true;
      }
    }
  }

  @HostListener('window:mouseup')
  onMouseUp(): void {
    if (this.isPanning) {
      this.isPanning = false;
      this.scheduleViewSave();
    }
    if (this.isDragging) {
      const node = this.dragNodeId ? this.nodeById(this.dragNodeId) : null;
      if (node && this.dragMoved) {
        this.view.positions = { ...(this.view.positions || {}), [node.id]: { x: node.x, y: node.y } };
        this.scheduleViewSave();
      }
      this.isDragging = false;
      this.dragNodeId = null;
    }
  }

  onWheel(event: WheelEvent): void {
    event.preventDefault();
    const ctm = this.svgEl.nativeElement.getScreenCTM();
    if (!ctm) return;

    const before = this.toWorld(event as unknown as MouseEvent);
    const next = Math.max(0.15, Math.min(2.5, this.zoom * Math.exp(-event.deltaY / 500)));
    if (next === this.zoom) return;

    this.zoom = next;
    this.panX = (event.clientX - ctm.e) - before.x * this.zoom;
    this.panY = (event.clientY - ctm.f) - before.y * this.zoom;
    this.scheduleViewSave();
  }

  zoomBy(factor: number): void {
    this.zoom = Math.max(0.15, Math.min(2.5, this.zoom * factor));
    this.scheduleViewSave();
  }

  /** Fits the whole landscape into the visible canvas */
  fitToScreen(): void {
    if (this.graph.nodes.length === 0) return;
    const svg = this.svgEl.nativeElement.getBoundingClientRect();
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    this.graph.nodes.forEach(n => {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + n.width);
      maxY = Math.max(maxY, n.y + n.height);
    });
    const padding = 60;
    const zoomX = svg.width / (maxX - minX + 2 * padding);
    const zoomY = svg.height / (maxY - minY + 2 * padding);
    this.zoom = Math.max(0.15, Math.min(1.5, Math.min(zoomX, zoomY)));
    this.panX = -minX * this.zoom + padding * this.zoom;
    this.panY = -minY * this.zoom + padding * this.zoom;
    this.scheduleViewSave();
  }

  /** Drops all manual positions and lets the auto layout take over again */
  resetLayout(): void {
    this.view.positions = {};
    this.rebuild();
    this.scheduleViewSave();
    this.toastr.info('Layout rearranged');
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    const tag = target?.tagName?.toLowerCase();
    const typing = !!(target && (target.isContentEditable || tag === 'input' || tag === 'textarea' || tag === 'select'));
    if (typing) return;

    if (event.code === 'Space') {
      this.spacePressed = true;
      event.preventDefault();
    }
    if (event.key === 'Escape') {
      if (this.impactSource) {
        this.closeImpact();
        return;
      }
      // a plain review can be left with Escape; decisions in a resolution
      // should not be dropped by a stray key press
      if (this.review && this.review.mode === 'review') {
        this.endReview();
        return;
      }
      this.connectSourceId = null;
      this.setTool('select');
    }
    if (event.key === 'Delete') {
      this.deleteSelection();
    }
  }

  @HostListener('window:keyup', ['$event'])
  onKeyUp(event: KeyboardEvent): void {
    if (event.code === 'Space') {
      this.spacePressed = false;
    }
  }

  // ---------------------------------------------------------------------------
  // Selection
  // ---------------------------------------------------------------------------

  selectNode(node: LandscapeNode): void {
    this.graph.nodes.forEach(n => n.selected = n.id === node.id);
    this.graph.edges.forEach(e => e.selected = false);
    this.selectedNode = node;
    this.selectedEdge = null;
    if (this.focusMode) {
      this.applyHighlighting();
    }
  }

  onEdgeMouseDown(edge: LandscapeEdge, event: MouseEvent): void {
    if (event.button !== 0 || this.activeTool === 'connect') return;
    event.stopPropagation();
    this.graph.nodes.forEach(n => n.selected = false);
    this.graph.edges.forEach(e => e.selected = e.id === edge.id);
    this.selectedNode = null;
    this.selectedEdge = edge;
  }

  clearSelection(): void {
    this.graph.nodes.forEach(n => n.selected = false);
    this.graph.edges.forEach(e => e.selected = false);
    this.selectedNode = null;
    this.selectedEdge = null;
    if (this.focusMode) {
      this.applyHighlighting();
    }
  }

  private deleteSelection(): void {
    if (this.selectedEdge) {
      this.removeRelation(this.selectedEdge);
      return;
    }
    if (this.selectedNode) {
      if (this.scenario) {
        this.togglePlannedRemoval(this.selectedNode);
        return;
      }
      this.toastr.info('Elements are deleted in their own list view, so nothing gets lost by accident');
    }
  }

  // ---------------------------------------------------------------------------
  // Relations
  // ---------------------------------------------------------------------------

  private handleConnect(node: LandscapeNode): void {
    if (!this.connectSourceId) {
      this.connectSourceId = node.id;
      this.selectNode(node);
      return;
    }
    if (this.connectSourceId === node.id) {
      this.connectSourceId = null;
      return;
    }

    const from = this.nodeById(this.connectSourceId);
    const to = node;
    if (!from || !this.source) return;

    const kind = this.landscapeService.resolveLinkKind(from.layer, to.layer);
    if (!kind) {
      this.toastr.warning(`${this.layerMeta(from.layer).label} and ${this.layerMeta(to.layer).label} cannot be connected`);
      this.connectSourceId = null;
      return;
    }

    this.landscapeService.link(this.source, from, to).pipe(first()).subscribe(() => {
      this.connectSourceId = null;
      this.rebuild();
      this.persistPlan();
      this.toastr.success(`${from.label} → ${to.label}`, this.scenario ? 'Planned relation' : 'Relation created');
    }, err => {
      this.connectSourceId = null;
      this.toastr.error(err?.message || 'The relation could not be created');
    });
  }

  removeRelation(edge: LandscapeEdge): void {
    if (!this.source) return;
    const from = this.nodeById(edge.from);
    const to = this.nodeById(edge.to);
    if (!from || !to) return;

    if (!this.landscapeService.isEditableKind(edge.kind)) {
      this.toastr.info('This relation follows from the elements themselves and cannot be removed here');
      return;
    }

    this.landscapeService.unlink(this.source, edge, from, to).pipe(first()).subscribe(() => {
      this.selectedEdge = null;
      this.rebuild();
      this.persistPlan();
      this.toastr.success(this.scenario ? 'Relation planned to go' : 'Relation removed');
    }, err => this.toastr.error(err?.message || 'The relation could not be removed'));
  }

  // ---------------------------------------------------------------------------
  // Elements
  // ---------------------------------------------------------------------------

  private createElement(layer: LandscapeLayer, point: { x: number; y: number }): void {
    if (!this.source) return;
    this.landscapeService.createElement(this.source, layer, `New ${this.layerMeta(layer).label}`)
      .pipe(first())
      .subscribe(node => {
        // keep the new element where it was dropped
        this.view.positions = {
          ...(this.view.positions || {}),
          [node.id]: { x: point.x - LANDSCAPE_NODE_WIDTH / 2, y: point.y - LANDSCAPE_NODE_HEIGHT / 2 }
        };
        if (this.isLayerHidden(layer)) {
          this.view.hiddenLayers = (this.view.hiddenLayers || []).filter(l => l !== layer);
        }
        this.setTool('select');
        this.rebuild(false);
        const created = this.nodeById(node.id);
        if (created) {
          this.selectNode(created);
        }
        this.scheduleViewSave();
        this.persistPlan();
        this.toastr.success(`${this.layerMeta(layer).label} ${this.scenario ? 'planned' : 'created'}`);
      }, err => this.toastr.error(err?.message || 'The element could not be created'));
  }

  onElementSaved(values: LandscapeElementValues): void {
    if (!this.source || !this.selectedNode) return;
    this.landscapeService.updateElement(this.source, this.selectedNode, values).pipe(first()).subscribe(() => {
      this.rebuild();
      this.persistPlan();
      this.toastr.success(this.scenario ? 'Planned change saved' : 'Element saved');
    }, err => this.toastr.error(err?.message || 'The element could not be saved'));
  }

  /** Opens the element in the editor that is specialised for its layer */
  openInEditor(node: LandscapeNode): void {
    const routes: { [key in LandscapeLayer]?: any[] } = {
      journey: ['/journeys/edit', node.entityId, 'editor'],
      process: ['/process/view', node.entityId],
      capability: ['/capability/edit', node.entityId, 'base'],
      api: ['/apiCall/edit', node.entityId, 'base'],
      data: ['/data/edit', node.entityId, 'base'],
      system: ['/system/edit', node.entityId, 'base']
    };

    if (node.layer === 'experience') {
      const journey = this.source?.journeys.find(j => (j.layout?.expectations || []).some(e => e.id === node.entityId));
      if (journey) {
        this.router.navigate(['/journeys/edit', journey.id, 'editor']).then();
      }
      return;
    }

    const route = routes[node.layer];
    if (route) {
      this.router.navigate(route).then();
    }
  }

  onNodeDblClick(node: LandscapeNode, event: MouseEvent): void {
    event.stopPropagation();
    this.openInEditor(node);
  }

  // ---------------------------------------------------------------------------
  // Geometry helpers used by the template
  // ---------------------------------------------------------------------------

  nodeById(id: string): LandscapeNode | undefined {
    return this.graph.nodes.find(n => n.id === id);
  }

  edgePath(edge: LandscapeEdge): string {
    const from = this.nodeById(edge.from);
    const to = this.nodeById(edge.to);
    if (!from || !to) return '';

    const start = { x: from.x + from.width / 2, y: from.y + from.height };
    const end = { x: to.x + to.width / 2, y: to.y };
    // route upwards when the target sits above the source
    if (end.y < start.y) {
      start.y = from.y;
      end.y = to.y + to.height;
    }
    const delta = Math.max(30, Math.abs(end.y - start.y) / 2);
    const c1y = start.y + (end.y > start.y ? delta : -delta);
    const c2y = end.y + (end.y > start.y ? -delta : delta);
    return `M ${start.x} ${start.y} C ${start.x} ${c1y}, ${end.x} ${c2y}, ${end.x} ${end.y}`;
  }

  edgeColor(edge: LandscapeEdge): string {
    const from = this.nodeById(edge.from);
    return from ? this.layerMeta(from.layer).color : '#adb5bd';
  }

  bandLabel(band: LandscapeBand): string {
    const meta = this.layerMeta(band.layer);
    return `${meta.label} (${band.count})`;
  }

  /** Splits a label into at most two lines that fit into a node */
  labelLines(node: LandscapeNode): string[] {
    const maxChars = 24;
    const words = (node.label || '').split(/\s+/).filter(w => !!w);
    const lines: string[] = [];
    let current = '';
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (candidate.length <= maxChars) {
        current = candidate;
      } else {
        if (current) lines.push(current);
        current = word;
        if (lines.length === 2) break;
      }
    }
    if (lines.length < 2 && current) lines.push(current);
    if (lines.length === 2 && lines.join(' ').length < (node.label || '').length) {
      lines[1] = lines[1].substring(0, maxChars - 1) + '…';
    }
    return lines.slice(0, 2);
  }

  private toWorld(event: MouseEvent): { x: number; y: number } {
    const ctm = this.svgEl.nativeElement.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    return {
      x: (event.clientX - ctm.e - this.panX) / this.zoom,
      y: (event.clientY - ctm.f - this.panY) / this.zoom
    };
  }

  private nodeAt(x: number, y: number): LandscapeNode | undefined {
    for (let i = this.graph.nodes.length - 1; i >= 0; i--) {
      const n = this.graph.nodes[i];
      if (x >= n.x && x <= n.x + n.width && y >= n.y && y <= n.y + n.height) {
        return n;
      }
    }
    return undefined;
  }

  private scheduleViewSave(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      this.view = { ...this.view, panX: this.panX, panY: this.panY, zoom: this.zoom };
      this.landscapeService.saveView(this.view).pipe(first()).subscribe();
    }, 400);
  }
}
