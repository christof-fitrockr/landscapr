
export class Capability {
  name: string;
  description: string;
  implementedBy: string[];
  capabilityId?: string;
  status: DataStatus;
  tags:string[];
}


export enum DataStatus {
  Draft,
  Validated
}
