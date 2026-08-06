import { Component, EventEmitter, Output } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';

import { Scenario, ScenarioStatus, SCENARIO_STATUS_LABELS, SCENARIO_STATUSES } from '../models/scenario.model';

export interface ScenarioValues {
  name: string;
  description: string;
  targetDate: string;
  status: ScenarioStatus;
}

@Component({
  selector: 'app-scenario-edit-modal',
  templateUrl: './scenario-edit-modal.component.html'
})
export class ScenarioEditModalComponent {

  /** true when an existing target picture is edited instead of created */
  isEdit = false;
  /** a realised target picture is a record of the past, not a plan any more */
  isRealised = false;

  values: ScenarioValues = {
    name: '',
    description: '',
    targetDate: '',
    status: ScenarioStatus.Draft
  };

  statuses = SCENARIO_STATUSES.map(status => ({ value: status, label: SCENARIO_STATUS_LABELS[status] }));

  @Output() saved = new EventEmitter<ScenarioValues>();

  constructor(public bsModalRef: BsModalRef) {}

  load(scenario: Scenario): void {
    this.values = {
      name: scenario.name || '',
      description: scenario.description || '',
      targetDate: scenario.targetDate || '',
      status: scenario.status ?? ScenarioStatus.Draft
    };
    this.isEdit = true;
    this.isRealised = scenario.status === ScenarioStatus.Realised;
  }

  setStatus(status: ScenarioStatus): void {
    this.values.status = status;
  }

  isValid(): boolean {
    return !!(this.values.name || '').trim();
  }

  save(): void {
    if (!this.isValid()) return;
    this.saved.emit({ ...this.values, name: this.values.name.trim() });
    this.bsModalRef.hide();
  }

  cancel(): void {
    this.bsModalRef.hide();
  }
}
