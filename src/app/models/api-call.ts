export class ApiCall {
  id: string;
  repoId: string;
  name: string;
  implementationStatus: ApiImplementationStatus;
  description: string;
  // Deprecated: kept for backward compatibility. Use `documentation` instead
  docLinkUrl: string
  capabilityId: string;

  // New: optional grouping of APIs
  apiGroup?: string;
  // New: documentation link for the API
  documentation?: string;

  implementedBy: string[];

  input: string;
  output: string;

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
