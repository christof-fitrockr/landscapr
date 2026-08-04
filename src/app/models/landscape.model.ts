/**
 * Model of the global landscape editor: one graph across all layers of the
 * business - from the experience a customer expects, through journeys and
 * processes, down to the functions, data and systems that deliver them.
 */

/** The layers a landscape node can belong to, ordered top down */
export type LandscapeLayer =
  | 'experience'
  | 'journey'
  | 'process'
  | 'capability'
  | 'api'
  | 'data'
  | 'system';

export const LANDSCAPE_LAYERS: LandscapeLayer[] = [
  'experience',
  'journey',
  'process',
  'capability',
  'api',
  'data',
  'system'
];

export interface LandscapeLayerMeta {
  key: LandscapeLayer;
  label: string;
  /** what a node of this layer stands for, shown in the toolbar */
  hint: string;
  icon: string;
  color: string;
  fill: string;
  /** false for layers whose elements only exist inside another element */
  creatable: boolean;
}

export const LANDSCAPE_LAYER_META: { [key in LandscapeLayer]: LandscapeLayerMeta } = {
  experience: {
    key: 'experience',
    label: 'Experience',
    hint: 'What the customer expects and gets',
    icon: 'fa-smile',
    color: '#6f42c1',
    fill: '#f1ecfa',
    creatable: false
  },
  journey: {
    key: 'journey',
    label: 'Journey',
    hint: 'End to end path of a customer',
    icon: 'fa-map-signs',
    color: '#0d6efd',
    fill: '#e7f0ff',
    creatable: true
  },
  process: {
    key: 'process',
    label: 'Process',
    hint: 'Steps the organisation performs',
    icon: 'fa-cube',
    color: '#0a9396',
    fill: '#e4f4f4',
    creatable: true
  },
  capability: {
    key: 'capability',
    label: 'Capability',
    hint: 'What the business is able to do',
    icon: 'fa-sitemap',
    color: '#ca6702',
    fill: '#fbf0e2',
    creatable: true
  },
  api: {
    key: 'api',
    label: 'Function',
    hint: 'API calls and functions in use',
    icon: 'fa-plug',
    color: '#bb3e03',
    fill: '#fbeae4',
    creatable: true
  },
  data: {
    key: 'data',
    label: 'Data',
    hint: 'Business objects being processed',
    icon: 'fa-database',
    color: '#2f9e44',
    fill: '#e9f6ec',
    creatable: true
  },
  system: {
    key: 'system',
    label: 'System',
    hint: 'Applications that implement it',
    icon: 'fa-server',
    color: '#495057',
    fill: '#eef0f2',
    creatable: true
  }
};

/**
 * Kinds of relation between two landscape nodes. Every kind maps to a field of
 * the underlying entities - the entities stay the single source of truth.
 */
export type LandscapeEdgeKind =
  | 'expectation-of-journey'   // expectation -> journey
  | 'expectation-of-step'      // expectation -> process behind the journey step
  | 'journey-step'             // journey -> process
  | 'sub-process'              // process -> process
  | 'process-function'         // process -> api call
  | 'function-capability'      // api call -> capability
  | 'capability-parent'        // capability -> parent capability
  | 'function-input'           // data -> api call
  | 'function-output'          // api call -> data
  | 'data-reference'           // data -> data
  | 'implemented-by';          // process | capability | api -> system

export interface LandscapeNode {
  /** composite id: `<layer>:<entityId>` */
  id: string;
  layer: LandscapeLayer;
  entityId: string;
  label: string;
  /** second line of the node, e.g. group, role or fulfilment */
  sublabel?: string;
  /** true for elements still in draft */
  draft?: boolean;
  /** layout in world coordinates */
  x: number;
  y: number;
  width: number;
  height: number;
  selected?: boolean;
  /** true when the position was placed by hand instead of the auto layout */
  pinned?: boolean;
  /** dimmed when a focus or filter is active */
  dimmed?: boolean;
  /** highlighted as part of the blast radius of another element */
  impacted?: boolean;
}

export interface LandscapeEdge {
  id: string;
  from: string; // node id
  to: string;   // node id
  kind: LandscapeEdgeKind;
  label?: string;
  selected?: boolean;
  dimmed?: boolean;
}

export interface LandscapeGraph {
  nodes: LandscapeNode[];
  edges: LandscapeEdge[];
}

/** Positions and settings of the landscape view, persisted per view id */
export interface LandscapeView {
  id: string;
  /** manually placed nodes, keyed by node id */
  positions: { [nodeId: string]: { x: number; y: number } };
  hiddenLayers: LandscapeLayer[];
  panX: number;
  panY: number;
  zoom: number;
}

export const DEFAULT_LANDSCAPE_VIEW_ID = 'default';

/**
 * Who is looking at the model. The stored model is the same for everyone -
 * the persona only decides which parts of it are put in front of the user.
 */
export type Persona = 'business' | 'it';

export interface PersonaMeta {
  key: Persona;
  label: string;
  hint: string;
  icon: string;
  /** layers this persona sees by default, the others start hidden */
  layers: LandscapeLayer[];
}

export const PERSONA_META: { [key in Persona]: PersonaMeta } = {
  business: {
    key: 'business',
    label: 'Business',
    hint: 'Customer experience, journeys, processes and capabilities',
    icon: 'fa-user-tie',
    layers: ['experience', 'journey', 'process', 'capability']
  },
  it: {
    key: 'it',
    label: 'IT',
    hint: 'Processes, functions, data objects and systems',
    icon: 'fa-server',
    layers: ['process', 'capability', 'api', 'data', 'system']
  }
};

export const PERSONAS: Persona[] = ['business', 'it'];

/** One element that would be affected if the analysed element changed */
export interface LandscapeImpact {
  node: LandscapeNode;
  /** number of relations between the analysed element and this one */
  distance: number;
}

export function landscapeNodeId(layer: LandscapeLayer, entityId: string): string {
  return `${layer}:${entityId}`;
}

export function parseLandscapeNodeId(nodeId: string): { layer: LandscapeLayer; entityId: string } | null {
  const index = nodeId.indexOf(':');
  if (index < 0) return null;
  const layer = nodeId.substring(0, index) as LandscapeLayer;
  if (LANDSCAPE_LAYERS.indexOf(layer) < 0) return null;
  return { layer, entityId: nodeId.substring(index + 1) };
}
