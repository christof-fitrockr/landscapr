export class ApiCall {
  name: string;
  implementationStatus: ApiImplementationStatus;
  description: string;
  docLinkUrl: string
  capabilityId: string;

  implementedBy: string[];

  input: string;
  output: string;

  apiCallId?: string;
  tags: string[];
  implementationType: ApiImplementationType
  status: DataStatus;
}


export enum DataStatus {
  Draft,
  Validated
}


export enum ApiImplementationType {
  Internal,
  External,
  Mixed
}

export enum ApiImplementationStatus {
  Gap,
  Planned,
  InDevelopment,
  Ready
}
