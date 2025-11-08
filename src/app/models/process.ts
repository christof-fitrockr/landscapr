export class Process {
  id: string;
  repoId: string;
  name: string;
  description: string;
  status: Status;
  input: string;
  output: string;
  tags: string[];
  role: number;
  steps: Step[]
  apiCallIds: string[];
  favorite: boolean;
  implementedBy: string[];
}

export enum Role {
  Customer = 0,
  Vehicle = 1,
  ServiceWithCustomer = 2,
  Service= 3,
  Workshop = 4,
  Parts = 5
}

export class ProcessWithStep {
  process: Process;
  stepDetails: Step;
}

export enum Status {
  Draft,
  Validated
}

export class Step {
  processReference: string;
  successors: StepSuccessor[];
}

export class StepSuccessor {
  edgeTitle: string;
  processReference: string;
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
