export class System {
  name: string;
  description: string;
  contact: string;
  url: string;
  systemCluster: string;
  tags: string[];
  status: DataStatus
  systemId?: string;

}

export enum DataStatus {
  Draft,
  Validated
}

