import { Comment } from './comment';
import {ApiCall} from './api-call';

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
  comments?: Comment[];
}

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
  'Customer': '#bfdbfe',           // Blue 200
  'Vehicle': '#fed7aa',            // Orange 200
  'ServiceWithCustomer': '#bbf7d0', // Green 200
  'Service with Customer': '#bbf7d0', // Green 200
  'Service': '#fbcfe8',            // Pink 200
  'Workshop': '#e9d5ff',           // Purple 200
  'Parts': '#fef08a',              // Yellow 200
  'Processing': '#ddd6fe',         // Violet 200
  'Unassigned': '#e5e7eb'          // Gray 200
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
  Validated
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
