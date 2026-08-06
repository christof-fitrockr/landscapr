/**
 * A target picture: what the business should look like, described as the
 * planned difference to the model as it is today.
 *
 * The model that is stored stays the state of affairs. A scenario never
 * overwrites it - it carries only the elements that are planned to be added,
 * changed or dropped, so planning cannot damage reality and several target
 * pictures can exist next to each other.
 */

export type PlannedState = 'added' | 'removed' | 'modified';

export interface PlannedChange {
  /** what is planned for this element */
  state: PlannedState;
  /** the planned version of the element, absent when it is planned to go */
  entity?: any;
  /** why it is planned, shown to whoever reads the target picture */
  note?: string;
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  /** when the target picture should be reality, free text like "Q3 2027" */
  targetDate: string;
  status: ScenarioStatus;
  /** planned changes keyed by landscape node id */
  changes: { [nodeId: string]: PlannedChange };
  createdAt: number;
  updatedAt: number;
}

export enum ScenarioStatus {
  Draft = 0,
  Agreed = 1
}

export const SCENARIO_STATUS_LABELS: { [key in ScenarioStatus]: string } = {
  [ScenarioStatus.Draft]: 'Draft',
  [ScenarioStatus.Agreed]: 'Agreed'
};

/** Counts of what a target picture changes, for the summary line */
export interface ScenarioSummary {
  added: number;
  removed: number;
  modified: number;
  total: number;
}

export function scenarioSummary(scenario: Scenario | null): ScenarioSummary {
  const changes = Object.values(scenario?.changes || {});
  return {
    added: changes.filter(change => change.state === 'added').length,
    removed: changes.filter(change => change.state === 'removed').length,
    modified: changes.filter(change => change.state === 'modified').length,
    total: changes.length
  };
}
