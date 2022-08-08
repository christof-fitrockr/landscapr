export class Application {
  id: string;
  name: string;
  description: string;
  contact: string;
  url: string;
  systemCluster: string;
  tags: string[];
  status: DataStatus

}

export enum DataStatus {
  Draft,
  Validated
}

