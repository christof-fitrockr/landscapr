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
import { ChangeState, ObjectChange } from '../services/model-diff.service';
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
    private router: Router,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.persona = this.personaService.persona;
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
          this.source = source;
          this.rebuild();
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
    }

    this.selectedNode = selectedNodeId ? this.graph.nodes.find(n => n.id === selectedNodeId) || null : null;
    this.selectedEdge = selectedEdgeId ? this.graph.edges.find(e => e.id === selectedEdgeId) || null : null;
    if (this.selectedNode) this.selectedNode.selected = true;
    if (this.selectedEdge) this.selectedEdge.selected = true;
    this.applyHighlighting();
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
      this.toastr.success(`${from.label} → ${to.label}`, 'Relation created');
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
      this.toastr.success('Relation removed');
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
        this.toastr.success(`${this.layerMeta(layer).label} created`);
      }, err => this.toastr.error(err?.message || 'The element could not be created'));
  }

  onElementSaved(values: LandscapeElementValues): void {
    if (!this.source || !this.selectedNode) return;
    this.landscapeService.updateElement(this.source, this.selectedNode, values).pipe(first()).subscribe(() => {
      this.rebuild();
      this.toastr.success('Element saved');
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
