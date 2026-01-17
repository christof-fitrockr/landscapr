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

export interface JourneyLayout {
  nodes: JourneyLayoutNode[];
  edges: JourneyLayoutEdge[];
  panX: number;
  panY: number;
  zoom: number;
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
