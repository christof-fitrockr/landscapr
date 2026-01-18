import { DataStatus } from './api-call';

export class Data {
  id: string;
  name: string;
  description: string;
  group: string;
  state: DataStatus;
  link: string;
  items: DataItem[];
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
}

export enum DataType {
  Primitive = 'Primitive',
  Reference = 'Reference'
}
