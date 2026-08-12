/**
 * The gap view of the model: where the business is carried by people because
 * no function supports it, and what has to be built to make it seamless.
 *
 * Nothing here is stored. Every value is derived from the entities themselves -
 * a process, its steps, the functions those steps call and the systems behind
 * them - so the gap picture can never drift away from the model it describes.
 */

/** How one activity of a process is supported today */
export type SupportState =
  /** a function runs it and a system provides that function */
  | 'live'
  /** a function is planned or being built, so support is on its way */
  | 'planned'
  /** the model says a function is missing, or names one nothing implements */
  | 'declared'
  /** nothing at all - the step is done by hand and no one wrote that down */
  | 'missing'
  /** a human does it on purpose, so it is not counted as a gap */
  | 'manual';

/** The verdict for a whole process, rolled up from its activities */
export type SupportBand = 'seamless' | 'planned' | 'gap' | 'manual';

export const SUPPORT_BAND_LABELS: { [key in SupportBand]: string } = {
  seamless: 'Seamless',
  planned: 'Planned',
  gap: 'Gap',
  manual: 'By design'
};

/**
 * Three colours carry the message - green works, blue is planned, red is open.
 * A declared gap and an unmodelled one share the red: they differ in whether
 * anybody wrote them down, which the icon and the label say, not the colour.
 */
export const SUPPORT_BAND_COLORS: { [key in SupportBand]: string } = {
  seamless: 'var(--gap-seamless)',
  planned: 'var(--gap-planned)',
  gap: 'var(--gap-open)',
  manual: 'var(--gap-manual)'
};

export const SUPPORT_STATE_BAND: { [key in SupportState]: SupportBand } = {
  live: 'seamless',
  planned: 'planned',
  declared: 'gap',
  missing: 'gap',
  manual: 'manual'
};

export const SUPPORT_STATE_LABELS: { [key in SupportState]: string } = {
  live: 'Live',
  planned: 'Planned',
  declared: 'Declared gap',
  missing: 'Not modelled',
  manual: 'Manual by design'
};

/** Why an activity ended up in the state it is in, in the reader's words */
export type SupportReason =
  | 'ready'
  | 'planned'
  | 'declaredGap'
  | 'noSystem'
  | 'unknownFunction'
  | 'noFunction'
  | 'byDesign';

export const SUPPORT_REASON_TEXT: { [key in SupportReason]: string } = {
  ready: 'Live',
  planned: 'Planned',
  declaredGap: 'Declared a gap in the model',
  noSystem: 'No system implements this function',
  unknownFunction: 'The function it refers to is not in the model',
  noFunction: 'No function - done by hand',
  byDesign: 'Manual by design'
};

/** One thing a process does: a step, a called function or a subprocess */
export interface ActivitySupport {
  /** stable key inside the process, used for grouping and selection */
  key: string;
  label: string;
  state: SupportState;
  reason: SupportReason;
  apiCallId?: string;
  apiCallName?: string;
  /** systems that provide the function, empty when nothing does */
  systemNames: string[];
  /** set when the activity is a subprocess rather than a function */
  subprocessId?: string;
  subprocessName?: string;
}

/** What a process looks like once its activities are rolled up */
export interface ProcessGap {
  processId: string;
  processName: string;
  roleName: string;
  band: SupportBand;
  activities: ActivitySupport[];
  /** activities that count towards the score, so everything but manual ones */
  counted: number;
  live: number;
  planned: number;
  open: number;
  manual: number;
  /** share of counted activities that run on a live function, 0..1 */
  coverage: number;
  /** what the coverage becomes once everything planned is built, 0..1 */
  plannedCoverage: number;
  journeyIds: string[];
  journeyNames: string[];
  note?: string;
  priority?: GapPriority;
  horizon?: string;
  owner?: string;
}

export type GapPriority = 'high' | 'medium' | 'low';

export const GAP_PRIORITIES: GapPriority[] = ['high', 'medium', 'low'];

export const GAP_PRIORITY_LABELS: { [key in GapPriority]: string } = {
  high: 'High',
  medium: 'Medium',
  low: 'Low'
};

export const GAP_PRIORITY_ORDER: { [key in GapPriority]: number } = {
  high: 0,
  medium: 1,
  low: 2
};

/** A journey with the coverage of the processes it walks through */
export interface JourneyGap {
  journeyId: string;
  journeyName: string;
  processIds: string[];
  counted: number;
  live: number;
  planned: number;
  open: number;
  coverage: number;
  plannedCoverage: number;
}

/** Id of the bucket that holds processes no journey reaches */
export const NO_JOURNEY_ID = '__no_journey__';
export const NO_JOURNEY_NAME = 'Not on a journey';

/** One entry of the roadmap: a function that has to exist for a gap to close */
export interface OpenItem {
  /** groups the activities that the same piece of work would close */
  key: string;
  /** the function name, or the step that needs one when nothing is modelled */
  name: string;
  /** true when the model already carries a function for it */
  modelled: boolean;
  apiCallId?: string;
  priority: GapPriority;
  horizon?: string;
  owner?: string;
  note?: string;
  /** every place this piece of work would help */
  places: { processId: string; processName: string; activityLabel: string }[];
  journeyNames: string[];
  roleNames: string[];
}

export interface GapTotals {
  processes: number;
  /** processes whose band is gap */
  processesWithGap: number;
  processesManual: number;
  activities: number;
  live: number;
  planned: number;
  open: number;
  manual: number;
  coverage: number;
  plannedCoverage: number;
  journeysAffected: number;
  journeys: number;
  openItems: number;
}

export interface GapReport {
  processes: ProcessGap[];
  journeys: JourneyGap[];
  openItems: OpenItem[];
  totals: GapTotals;
}

/** Sums a set of processes into the numbers the management view leads with */
export function sumGaps(processes: ProcessGap[], journeyCount: number, openItems: number): GapTotals {
  const totals: GapTotals = {
    processes: processes.length,
    processesWithGap: 0,
    processesManual: 0,
    activities: 0,
    live: 0,
    planned: 0,
    open: 0,
    manual: 0,
    coverage: 0,
    plannedCoverage: 0,
    journeysAffected: 0,
    journeys: journeyCount,
    openItems
  };

  const affected = new Set<string>();

  processes.forEach(p => {
    totals.activities += p.counted;
    totals.live += p.live;
    totals.planned += p.planned;
    totals.open += p.open;
    totals.manual += p.manual;
    if (p.band === 'gap') {
      totals.processesWithGap++;
      p.journeyIds.forEach(id => affected.add(id));
    }
    if (p.band === 'manual') {
      totals.processesManual++;
    }
  });

  totals.coverage = totals.activities ? totals.live / totals.activities : 1;
  totals.plannedCoverage = totals.activities ? (totals.live + totals.planned) / totals.activities : 1;
  totals.journeysAffected = affected.size;

  return totals;
}
