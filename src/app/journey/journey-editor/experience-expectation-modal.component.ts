import { Component, EventEmitter, Output } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { ExperienceExpectation, ExperienceFulfilment } from '../../models/journey.model';

export interface ExperienceExpectationDraft {
  title: string;
  expectation: string;
  outcome: string;
  fulfilment: ExperienceFulfilment;
  persona: string;
  metric: string;
  target: string;
  actual: string;
}

@Component({
  selector: 'app-experience-expectation-modal',
  templateUrl: './experience-expectation-modal.component.html'
})
export class ExperienceExpectationModalComponent {
  /** Label of the journey step the expectation belongs to (read only context) */
  stepLabel = '';
  /** True when an existing expectation is edited (enables the delete button) */
  isEdit = false;
  /** Persona names already used in this journey, offered as suggestions */
  personaSuggestions: string[] = [];

  model: ExperienceExpectationDraft = {
    title: '',
    expectation: '',
    outcome: '',
    fulfilment: 'unknown',
    persona: '',
    metric: '',
    target: '',
    actual: ''
  };

  fulfilments: { key: ExperienceFulfilment; label: string; hint: string }[] = [
    { key: 'exceeded', label: 'Exceeded', hint: 'The customer gets more than expected' },
    { key: 'met', label: 'Met', hint: 'The expectation is fulfilled' },
    { key: 'partly', label: 'Partly', hint: 'The expectation is only partly fulfilled' },
    { key: 'missed', label: 'Missed', hint: 'The expectation is not fulfilled' },
    { key: 'unknown', label: 'Unknown', hint: 'Not measured / not assessed yet' }
  ];

  @Output() saved = new EventEmitter<ExperienceExpectationDraft>();
  @Output() removed = new EventEmitter<void>();

  constructor(public bsModalRef: BsModalRef) {}

  /** Prefills the form from an existing expectation */
  load(expectation: ExperienceExpectation): void {
    this.model = {
      title: expectation.title || '',
      expectation: expectation.expectation || '',
      outcome: expectation.outcome || '',
      fulfilment: expectation.fulfilment || 'unknown',
      persona: expectation.persona || '',
      metric: expectation.metric || '',
      target: expectation.target || '',
      actual: expectation.actual || ''
    };
  }

  setFulfilment(value: ExperienceFulfilment): void {
    this.model.fulfilment = value;
  }

  usePersona(persona: string): void {
    this.model.persona = persona;
  }

  isValid(): boolean {
    return !!(this.model.title || '').trim() || !!(this.model.expectation || '').trim();
  }

  save(): void {
    if (!this.isValid()) {
      return;
    }
    this.saved.emit(this.model);
    this.bsModalRef.hide();
  }

  remove(): void {
    this.removed.emit();
    this.bsModalRef.hide();
  }

  cancel(): void {
    this.bsModalRef.hide();
  }
}
