import { Process } from './process';

export interface Journey {
  id: string;
  name: string;
  description: string;
  items: JourneyItem[];
  connections: Connection[];
}

export type JourneyItem = Process | Journey;

export interface Connection {
  from: string; // id of a JourneyItem
  to: string; // id of a JourneyItem
  label?: string;
}
