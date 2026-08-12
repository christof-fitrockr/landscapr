
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
  /** Jira issues that carry the work on this capability, e.g. 'ABC-12, ABC-13' */
  jiraTicket?: string;
}


export enum DataStatus {
  Draft,
  Validated
}
