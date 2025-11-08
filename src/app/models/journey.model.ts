import { Process } from './process';

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
}

export type JourneyItem = Process | Journey;

export interface Connection {
  from: string; // id of a JourneyItem
  to: string; // id of a JourneyItem
  label?: string;
}
