export class Application {
  id: string;
  repoId: string;
  name: string;
  description: string;
  contact: string;
  url: string;
  systemCluster: string;
  tags: string[];
  /** Jira issues that carry the work on this system, e.g. 'ABC-12, ABC-13' */
  jiraTicket?: string;

  status: DataStatus
}

export enum DataStatus {
  Draft,
  Validated
}

