import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';

import { LandscapeElementValues, LandscapeService, LandscapeSource } from '../services/landscape.service';
import {
  LandscapeEdge,
  LandscapeGraph,
  LandscapeLayerMeta,
  LandscapeNode,
  LANDSCAPE_LAYER_META
} from '../models/landscape.model';

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

  @Output() saved = new EventEmitter<LandscapeElementValues>();
  @Output() unlinked = new EventEmitter<LandscapeEdge>();
  @Output() opened = new EventEmitter<LandscapeNode>();
  @Output() selectedOther = new EventEmitter<LandscapeNode>();
  @Output() closed = new EventEmitter<void>();

  values: LandscapeElementValues = {};
  tagsText = '';
  relations: InspectorRelation[] = [];

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

  constructor(private landscapeService: LandscapeService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['node'] || changes['graph']) {
      this.reload();
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
