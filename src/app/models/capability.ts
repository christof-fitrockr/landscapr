
export class Capability {
  id: string;
  repoId: string;
  name: string;
  description: string;
  implementedBy: string[];
  capabilityId?: string;
  // New: hierarchical capabilities
  parentId?: string; // optional parent capability id (undefined/null for root)
  childrenIds?: string[]; // optional denormalized children list for convenience
  status: DataStatus;
  tags:string[];
}


export enum DataStatus {
  Draft,
  Validated
}
