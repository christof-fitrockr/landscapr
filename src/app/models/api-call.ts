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

  inputData: DataReference[];
  outputData: DataReference[];

  tags: string[];
  apiType: ApiType
  status: DataStatus;
}


export enum DataStatus {
  Draft,
  Validated
}


export enum ApiType {
  System = 0,
  Business = 1,
  ThirdParty = 2,
  Analytics = 3
}

export enum ApiImplementationStatus {
  Gap,
  Planned,
  InDevelopment,
  Ready
}

export interface DataReference {
  dataId: string;
  itemId?: string;
}
