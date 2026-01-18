import { DataStatus } from './api-call';

export class Data {
  id: string;
  name: string;
  description: string;
  group: string;
  state: DataStatus;
  link: string;
  items: DataItem[];
  isSubObject?: boolean;
  parentId?: string;
  x?: number;
  y?: number;
}

export class DataItem {
  id: string;
  name: string;
  description: string;
  state: DataStatus;
  type: DataType;

  // If primitive
  primitiveType?: string; // e.g. 'String', 'Integer', 'Boolean'

  // If reference
  dataId?: string;

  // Manual layout
  edgePoints?: {x: number, y: number}[];
  sourceSide?: 'left' | 'right';
  targetSide?: 'left' | 'right';
}

export enum DataType {
  Primitive = 'Primitive',
  Reference = 'Reference',
  SubObject = 'SubObject'
}
