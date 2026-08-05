import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';

import { LandscapeElementValues, LandscapeService, LandscapeSource } from '../services/landscape.service';
import { ModelDiffService, ObjectChange } from '../services/model-diff.service';
import { ConflictChoice, ReviewSession } from '../services/review-session.service';
import {
  LandscapeEdge,
  LandscapeGraph,
  LandscapeImpact,
  LandscapeLayer,
  LandscapeLayerMeta,
  LandscapeNode,
  Persona,
  LANDSCAPE_LAYER_META
} from '../models/landscape.model';

/** A measurable promise attached to a customer expectation */
export interface InspectorKpi {
  title: string;
  metric: string;
  target: string;
  actual: string;
  fulfilment: string;
}

/** One relation of the inspected element, prepared for the list in the panel */
export interface InspectorRelation {
  edge: LandscapeEdge;
  other: LandscapeNode;
  description: string;
  removable: boolean;
}

@Component({
  selector: 'app-landscape-inspector',
  templateUrl: './landscape-inspector.component.html',
  styleUrls: ['./landscape-inspector.component.scss']
})
export class LandscapeInspectorComponent implements OnChanges {

  @Input() node: LandscapeNode | null = null;
  @Input() graph: LandscapeGraph = { nodes: [], edges: [] };
  @Input() source: LandscapeSource | null = null;
  @Input() persona: Persona = 'business';
  /** set while a review is shown: how this element changed */
  @Input() change: ObjectChange | null = null;
  @Input() review: ReviewSession | null = null;

  @Output() saved = new EventEmitter<LandscapeElementValues>();
  @Output() unlinked = new EventEmitter<LandscapeEdge>();
  @Output() opened = new EventEmitter<LandscapeNode>();
  @Output() selectedOther = new EventEmitter<LandscapeNode>();
  @Output() closed = new EventEmitter<void>();
  @Output() impactRequested = new EventEmitter<LandscapeNode>();
  @Output() conflictResolved = new EventEmitter<ConflictChoice>();

  values: LandscapeElementValues = {};
  tagsText = '';
  relations: InspectorRelation[] = [];

  /** what the business side cares about: who feels a change of this element */
  affectedExpectations: LandscapeNode[] = [];
  affectedJourneys: LandscapeNode[] = [];
  supportingCapabilities: LandscapeNode[] = [];
  painPoints: InspectorKpi[] = [];
  kpis: InspectorKpi[] = [];

  /** what the IT side cares about: what this element runs on */
  usedFunctions: LandscapeNode[] = [];
  usedData: LandscapeNode[] = [];
  usedSystems: LandscapeNode[] = [];
  technicalStatus: string | null = null;

  private readonly relationLabels: { [key: string]: { out: string; in: string } } = {
    'expectation-of-journey': { out: 'expectation in journey', in: 'expectation' },
    'expectation-of-step': { out: 'expectation at step', in: 'expectation' },
    'journey-step': { out: 'journey step', in: 'used in journey' },
    'sub-process': { out: 'sub process', in: 'part of process' },
    'process-function': { out: 'uses function', in: 'used by process' },
    'function-capability': { out: 'belongs to capability', in: 'provided by function' },
    'capability-parent': { out: 'sub capability', in: 'parent capability' },
    'function-input': { out: 'input of function', in: 'reads data' },
    'function-output': { out: 'writes data', in: 'written by function' },
    'data-reference': { out: 'references', in: 'referenced by' },
    'implemented-by': { out: 'implemented by system', in: 'implements' }
  };

  /** the two versions of a conflicting element, ready for a side by side view */
  comparison: { field: string; label: string; theirs: string | null; mine: string | null; differs: boolean }[] = [];

  constructor(private landscapeService: LandscapeService, private modelDiffService: ModelDiffService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['node'] || changes['graph'] || changes['change'] || changes['review']) {
      this.reload();
      this.reloadComparison();
    }
  }

  private reloadComparison(): void {
    this.comparison = [];
    if (!this.node || !this.review || !this.change?.conflict) return;
    this.comparison = this.modelDiffService
      .versionsOf(this.node.id, this.review.theirs, this.review.mine)
      .fields
      .filter(field => field.differs || field.field === 'name');
  }

  get changeTitle(): string {
    switch (this.change?.state) {
      case 'added': return 'Added in this proposal';
      case 'removed': return 'Removed in this proposal';
      case 'modified': return 'Changed in this proposal';
      default: return 'Unchanged';
    }
  }

  private reload(): void {
    if (!this.node) {
      this.values = {};
      this.relations = [];
      return;
    }

    this.values = {
      name: this.node.label,
      description: this.entityValue('description') ?? '',
      status: this.entityStatus(),
      group: this.entityValue('group') ?? '',
      tags: this.entityValue('tags') || []
    };
    this.tagsText = (this.values.tags || []).join(', ');
    this.relations = this.buildRelations(this.node);
    this.buildPersonaFacts(this.node);
  }

  /**
   * Both personas look at the same element, they just need different answers:
   * the business side who is affected, the IT side what it runs on.
   */
  private buildPersonaFacts(node: LandscapeNode): void {
    const dependents = this.landscapeService.impactOf(this.graph, node.id);
    const dependencies = this.landscapeService.dependenciesOf(this.graph, node.id);
    const pick = (list: LandscapeImpact[], layer: LandscapeLayer) =>
      list.filter(entry => entry.node.layer === layer).map(entry => entry.node);

    this.affectedExpectations = pick(dependents, 'experience');
    this.affectedJourneys = pick(dependents, 'journey');
    this.supportingCapabilities = pick(dependencies, 'capability');

    const expectations = this.affectedExpectations
      .map(expectationNode => this.expectationOf(expectationNode.entityId))
      .filter(expectation => !!expectation);

    this.painPoints = expectations
      .filter(expectation => expectation.fulfilment === 'missed' || expectation.fulfilment === 'partly')
      .map(expectation => this.toKpi(expectation));
    this.kpis = expectations
      .filter(expectation => !!expectation.metric)
      .map(expectation => this.toKpi(expectation));

    this.usedFunctions = pick(dependencies, 'api');
    this.usedData = pick(dependencies, 'data');
    this.usedSystems = pick(dependencies, 'system');

    const entity = this.entity();
    this.technicalStatus = node.layer === 'api' && entity
      ? this.API_STATUS[entity.implementationStatus] || null
      : null;
  }

  private readonly API_STATUS: { [key: number]: string } = {
    0: 'Gap',
    1: 'Planned',
    2: 'In development',
    3: 'Ready'
  };

  private toKpi(expectation: any): InspectorKpi {
    return {
      title: expectation.title || expectation.expectation || '',
      metric: expectation.metric || '',
      target: expectation.target || '–',
      actual: expectation.actual || '–',
      fulfilment: expectation.fulfilment || 'unknown'
    };
  }

  private expectationOf(expectationId: string): any {
    if (!this.source) return null;
    for (const journey of this.source.journeys) {
      const found = (journey.layout?.expectations || []).find(e => e.id === expectationId);
      if (found) return found;
    }
    return null;
  }

  get meta(): LandscapeLayerMeta | null {
    return this.node ? LANDSCAPE_LAYER_META[this.node.layer] : null;
  }

  metaOf(node: LandscapeNode): LandscapeLayerMeta {
    return LANDSCAPE_LAYER_META[node.layer];
  }

  get supportsStatus(): boolean {
    return !!this.node && this.node.layer !== 'experience';
  }

  get supportsTags(): boolean {
    return !!this.node && ['journey', 'process', 'capability', 'api', 'system'].indexOf(this.node.layer) >= 0;
  }

  get supportsGroup(): boolean {
    return this.node?.layer === 'data';
  }

  get hasBusinessFacts(): boolean {
    return this.affectedExpectations.length > 0
      || this.affectedJourneys.length > 0
      || this.supportingCapabilities.length > 0;
  }

  get hasTechnicalFacts(): boolean {
    return this.usedFunctions.length > 0
      || this.usedData.length > 0
      || this.usedSystems.length > 0
      || !!this.technicalStatus;
  }

  get descriptionLabel(): string {
    return this.node?.layer === 'experience' ? 'Expectation' : 'Description';
  }

  private buildRelations(node: LandscapeNode): InspectorRelation[] {
    const relations: InspectorRelation[] = [];
    this.graph.edges.forEach(edge => {
      const outgoing = edge.from === node.id;
      const incoming = edge.to === node.id;
      if (!outgoing && !incoming) return;

      const otherId = outgoing ? edge.to : edge.from;
      const other = this.graph.nodes.find(n => n.id === otherId);
      if (!other) return;

      const labels = this.relationLabels[edge.kind];
      relations.push({
        edge,
        other,
        description: labels ? (outgoing ? labels.out : labels.in) : edge.kind,
        removable: this.landscapeService.isEditableKind(edge.kind)
      });
    });

    return relations.sort((a, b) => a.description.localeCompare(b.description) || a.other.label.localeCompare(b.other.label));
  }

  onTagsChange(): void {
    this.values.tags = (this.tagsText || '')
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => !!tag);
  }

  save(): void {
    this.onTagsChange();
    this.saved.emit({ ...this.values });
  }

  private entityValue(field: string): any {
    const entity = this.entity();
    return entity ? (entity as any)[field] : undefined;
  }

  private entityStatus(): number | undefined {
    const entity = this.entity() as any;
    if (!entity) return undefined;
    return this.node?.layer === 'data' ? entity.state : entity.status;
  }

  /** The entity behind the inspected node */
  private entity(): any {
    if (!this.node || !this.source) return null;
    switch (this.node.layer) {
      case 'journey':
        return this.source.journeys.find(j => j.id === this.node!.entityId);
      case 'process':
        return this.source.processes.find(p => p.id === this.node!.entityId);
      case 'capability':
        return this.source.capabilities.find(c => c.id === this.node!.entityId);
      case 'api':
        return this.source.apiCalls.find(a => a.id === this.node!.entityId);
      case 'data':
        return this.source.data.find(d => d.id === this.node!.entityId);
      case 'system':
        return this.source.applications.find(s => s.id === this.node!.entityId);
      case 'experience': {
        const journey = this.source.journeys
          .find(j => (j.layout?.expectations || []).some(e => e.id === this.node!.entityId));
        const expectation = (journey?.layout?.expectations || []).find(e => e.id === this.node!.entityId);
        return expectation ? { description: expectation.expectation, ...expectation } : null;
      }
      default:
        return null;
    }
  }
}
