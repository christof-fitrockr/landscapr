import { Component, Input } from '@angular/core';

import { SUPPORT_STATE_BAND, SupportBand, SupportState } from '../models/gap.model';

/**
 * The mark that goes next to a support state. It is drawn here rather than
 * taken from the icon font on purpose: the icon library swaps every <i> for an
 * <svg> once, so a class that is bound to changing data would freeze at the
 * value it had when the row was first drawn - and a step would keep the tick of
 * whichever step happened to be there before it.
 *
 * The shape is what carries the state for a reader who cannot tell the colours
 * apart, so it always ships together with the word next to it.
 */
@Component({
  selector: 'app-gap-icon',
  template: `
<svg class="gap-icon" [attr.width]="size" [attr.height]="size" viewBox="0 0 16 16" fill="none"
     stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"
     [attr.aria-hidden]="true" [ngSwitch]="state">

  <g *ngSwitchCase="'live'">
    <circle cx="8" cy="8" r="6.2"></circle>
    <path d="M5.2 8.2 7.2 10.2 10.9 6"></path>
  </g>

  <g *ngSwitchCase="'planned'">
    <circle cx="8" cy="8" r="6.2"></circle>
    <path d="M8 4.6V8l2.3 2.3"></path>
  </g>

  <g *ngSwitchCase="'declared'">
    <path d="M4 14.4V2.4h7.6l-1.1 2.7 1.1 2.7H4"></path>
  </g>

  <g *ngSwitchCase="'manual'">
    <path d="M5 8.4V3.5a1.2 1.2 0 0 1 2.4 0v3.9M7.4 7.4V2.9a1.2 1.2 0 0 1 2.4 0v4.6M9.8 8V4.5a1.2 1.2 0 0 1 2.4 0V10a4.2 4.2 0 0 1-4.2 4.2H7.2A4.2 4.2 0 0 1 3 10l1.1-1.9"></path>
  </g>

  <g *ngSwitchDefault>
    <circle cx="8" cy="8" r="6.2"></circle>
    <path d="M8 4.7v3.7M8 11.2h.01"></path>
  </g>
</svg>
  `,
  styles: [`
    :host { display: inline-flex; align-items: center; }
    .gap-icon { flex: none; }
  `]
})
export class GapIconComponent {

  @Input() state: SupportState = 'missing';
  @Input() size = 14;

  /** Convenience for the places that only know the verdict of a whole process */
  @Input() set band(band: SupportBand) {
    const stateOfBand: { [key in SupportBand]: SupportState } = {
      seamless: 'live',
      planned: 'planned',
      gap: 'missing',
      manual: 'manual'
    };
    this.state = stateOfBand[band] || 'missing';
  }

  /** Kept so a caller can ask the other way round without importing the map */
  bandOf(state: SupportState): SupportBand {
    return SUPPORT_STATE_BAND[state];
  }
}
