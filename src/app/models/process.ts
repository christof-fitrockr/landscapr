import { Comment } from './comment';
import {ApiCall} from './api-call';
import {GapPriority} from './gap.model';

export class Process {
  id: string;
  repoId: string;
  name: string;
  description: string;
  status: Status;
  input: string;
  output: string;
  tags: string[];
  role: string;
  steps: Step[]
  apiCallIds: string[];
  favorite: boolean;
  implementedBy: string[];
  /** Jira issues that carry the work on this process, e.g. 'ABC-12, ABC-13' */
  jiraTicket?: string;
  comments?: Comment[];
  /** what is meant to happen about the missing support, see ProcessSupportPlan */
  supportPlan?: ProcessSupportPlan;
}

/**
 * What the organisation intends to do about a process that runs without
 * functional support. It turns a finding into a statement someone stands
 * behind, which is what a management view has to show.
 */
export interface ProcessSupportPlan {
  /** 'manualByDesign' takes the process out of the gap count on purpose */
  intent: SupportIntent;
  /** what is missing and why it matters, in business words */
  note?: string;
  priority?: GapPriority;
  /** when it should be closed, free text like 'Q3 2027' */
  horizon?: string;
  owner?: string;
}

export type SupportIntent = 'automate' | 'manualByDesign';

export enum Role {
  Customer = 0,
  Vehicle = 1,
  ServiceWithCustomer = 2,
  Service= 3,
  Workshop = 4,
  Parts = 5,
  Processing = 6
}

export const ROLE_COLORS: {[key: string]: string} = {
  'Customer': 'var(--role-customer)',
  'Vehicle': 'var(--role-vehicle)',
  'ServiceWithCustomer': 'var(--role-service-with-customer)',
  'Service with Customer': 'var(--role-service-with-customer)',
  'Service': 'var(--role-service)',
  'Workshop': 'var(--role-workshop)',
  'Parts': 'var(--role-parts)',
  'Processing': 'var(--role-processing)',
  'Unassigned': 'var(--role-unassigned)'
};

export function getRoleColor(role: any): string {
  const roleName = typeof role === 'number' ? Role[role] : role;
  return ROLE_COLORS[roleName] || ROLE_COLORS['Unassigned'];
}

export class ProcessWithStep {
  process: Process;
  apiCall: ApiCall;
  stepDetails: Step;
}

export enum Status {
  Draft,
  Validated,
  ReviewNeeded
}

export class Step {
  processReference: string;
  apiCallReference: string;
  successors: StepSuccessor[];
}

export class StepSuccessor {
  edgeTitle: string;
  processReference: string;
  apiCallReference: string;
}

export class Api {
  $key: string;
  name: string;
  description: string;
  input: string;
  output: string;

}

export class ModelledProcess {
    $key: string;
    rawProcess: string;
    process: ProcessModel;
}

export class ProcessModel {
    name: string;
    swimlanes: Swimlane[];
    processSteps: ProcessStep[];
}

export class ProcessStep {
    id: string;
    name: string;
    color?: string = '#ffffff';
    calls?: FunctionCall[];
}

export class Swimlane {
    id: string;
    name: string;
}

export class FunctionCall {
    laneId?: string;
    in?: string;
    out?: string;
    fct?: string;
    sys?: string;
    color?: string;
    calls?: FunctionCall[];
}
