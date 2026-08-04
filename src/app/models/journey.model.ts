import { Process } from './process';
import { Comment } from './comment';

export interface JourneyLayoutNode {
  id: string;
  type: 'process' | 'decision' | 'group';
  label?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  // for process nodes
  processId?: string;
}

export interface JourneyLayoutEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
  fromOffset?: { x: number; y: number };
  toOffset?: { x: number; y: number };
}

/**
 * How well the outcome a customer actually gets matches the expectation
 * they bring into a journey step. Drives the colour coding and the
 * experience curve of the experience layer.
 */
export type ExperienceFulfilment = 'exceeded' | 'met' | 'partly' | 'missed' | 'unknown';

/**
 * A single customer expectation attached to a step of the journey.
 * It carries what the customer expects, the outcome they actually get and
 * how well both match - the core building blocks of experience management.
 */
export interface ExperienceExpectation {
  id: string;
  nodeId: string; // id of the JourneyLayoutNode this expectation belongs to
  title: string;
  expectation: string; // what the customer expects at this step
  outcome: string; // the result the customer actually gets
  fulfilment: ExperienceFulfilment;
  persona?: string; // the individual customer / segment this result applies to
  metric?: string; // name of the measure used to verify the outcome
  target?: string; // target value of the measure
  actual?: string; // measured value of the measure
}

export interface JourneyLayout {
  nodes: JourneyLayoutNode[];
  edges: JourneyLayoutEdge[];
  panX: number;
  panY: number;
  zoom: number;
  expectations?: ExperienceExpectation[];
  showExperienceLayer?: boolean;
}

export interface Journey {
  id: string;
  name: string;
  description: string;
  items: JourneyItem[];
  connections: Connection[];
  layout?: JourneyLayout;
  comments?: Comment[];
  status: DataStatus;
  tags: string[];
}

export enum DataStatus {
  Draft,
  Validated
}

export type JourneyItem = Process | Journey;

export interface Connection {
  from: string; // id of a JourneyItem
  to: string; // id of a JourneyItem
  label?: string;
}
