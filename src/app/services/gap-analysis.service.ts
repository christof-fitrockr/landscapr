import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { ApiCall, ApiImplementationStatus } from '../models/api-call';
import {
  ActivitySupport,
  GAP_PRIORITY_ORDER,
  GapPriority,
  GapReport,
  JourneyGap,
  NO_JOURNEY_ID,
  NO_JOURNEY_NAME,
  OpenItem,
  ProcessGap,
  SupportBand,
  SupportReason,
  SupportState,
  sumGaps
} from '../models/gap.model';
import { Process, Step } from '../models/process';
import { LandscapeService, LandscapeSource } from './landscape.service';
import { ModelPayload } from './model-diff.service';

/**
 * Reads the model the way a management audience asks about it: which processes
 * does a person have to carry because no function supports them, and what has
 * to be built to make the journey seamless.
 *
 * The analysis is a pure function of the entities. Nothing is stored, so the
 * answer always matches the model the reader is looking at - including a target
 * picture, which is just another state of the same entities.
 */
@Injectable({ providedIn: 'root' })
export class GapAnalysisService {

  constructor(private landscapeService: LandscapeService) {}

  /** The gap report for the model as it is today */
  report(): Observable<GapReport> {
    return this.landscapeService.load().pipe(map(source => this.analyse(source)));
  }

  /**
   * The same analysis for a state of the model that is held as a payload -
   * used for a target picture, where the planned state is compared with today.
   */
  analysePayload(payload: ModelPayload): GapReport {
    return this.analyse({
      journeys: (payload.journeys || []) as any,
      processes: (payload.processes || []) as any,
      capabilities: (payload.capabilities || []) as any,
      apiCalls: (payload.apiCalls || []) as any,
      data: (payload.data || []) as any,
      applications: (payload.applications || []) as any,
      roles: (payload.roles || []) as any
    });
  }

  // ---------------------------------------------------------------------------
  // Analysis
  // ---------------------------------------------------------------------------

  analyse(source: LandscapeSource): GapReport {
    const processes = source.processes || [];
    const apiCallsById = new Map<string, ApiCall>((source.apiCalls || []).map(a => [a.id, a] as [string, ApiCall]));
    const processesById = new Map<string, Process>(processes.map(p => [p.id, p] as [string, Process]));
    const systemNames = new Map<string, string>((source.applications || []).map(s => [s.id, s.name] as [string, string]));
    const roleNames = new Map<string, string>((source.roles || []).map(r => [String(r.id), r.name] as [string, string]));

    const journeysOfProcess = this.journeysByProcess(source);

    // a subprocess step takes the verdict of the process it points at, so the
    // bands have to be resolved depth first, with a guard against a cycle
    const bandCache = new Map<string, SupportBand>();
    const resolving = new Set<string>();

    const bandOf = (process: Process): SupportBand => {
      if (bandCache.has(process.id)) {
        return bandCache.get(process.id);
      }
      if (resolving.has(process.id)) {
        // a process that reaches itself cannot say anything about its own
        // support, so it stays out of the verdict of its parent
        return 'manual';
      }
      resolving.add(process.id);
      const band = this.bandFrom(process, this.activitiesOf(process, apiCallsById, processesById, systemNames, bandOf));
      resolving.delete(process.id);
      bandCache.set(process.id, band);
      return band;
    };

    const gaps: ProcessGap[] = processes.map(process => {
      const activities = this.activitiesOf(process, apiCallsById, processesById, systemNames, bandOf);
      const counted = activities.filter(a => a.state !== 'manual');
      const live = counted.filter(a => a.state === 'live').length;
      const planned = counted.filter(a => a.state === 'planned').length;
      const open = counted.filter(a => a.state === 'declared' || a.state === 'missing').length;
      const plan = process.supportPlan;
      const journeys = journeysOfProcess.get(process.id) || [];

      return {
        processId: process.id,
        processName: process.name || '(unnamed)',
        roleName: this.roleNameOf(process, roleNames),
        band: bandOf(process),
        activities,
        counted: counted.length,
        live,
        planned,
        open,
        manual: activities.length - counted.length,
        coverage: counted.length ? live / counted.length : 1,
        plannedCoverage: counted.length ? (live + planned) / counted.length : 1,
        journeyIds: journeys.map(j => j.id),
        journeyNames: journeys.map(j => j.name),
        note: plan ? plan.note : undefined,
        priority: plan ? plan.priority : undefined,
        horizon: plan ? plan.horizon : undefined,
        owner: plan ? plan.owner : undefined
      };
    });

    const journeys = this.journeyGaps(source, gaps);
    const openItems = this.openItems(gaps);

    return {
      processes: gaps,
      journeys,
      openItems,
      totals: sumGaps(gaps, journeys.filter(j => j.journeyId !== NO_JOURNEY_ID).length, openItems.length)
    };
  }

  // ---------------------------------------------------------------------------
  // Activities of one process
  // ---------------------------------------------------------------------------

  /**
   * Everything a process does, one entry each: its steps in order, followed by
   * the functions that are assigned to the process as a whole but never called
   * from a step. A step that points at a subprocess counts as one activity and
   * takes that subprocess' verdict - so a parent is never dominated by the
   * number of steps its children happen to have.
   */
  private activitiesOf(
    process: Process,
    apiCalls: Map<string, ApiCall>,
    processes: Map<string, Process>,
    systemNames: Map<string, string>,
    bandOf: (p: Process) => SupportBand
  ): ActivitySupport[] {
    const manualByDesign = process.supportPlan && process.supportPlan.intent === 'manualByDesign';
    const activities: ActivitySupport[] = [];
    const seenApiCalls = new Set<string>();

    (process.steps || []).forEach((step: Step, index: number) => {
      if (step.processReference) {
        const child = processes.get(step.processReference);
        activities.push(this.subprocessActivity(index, step.processReference, child, manualByDesign, bandOf));
        return;
      }

      if (step.apiCallReference) {
        seenApiCalls.add(step.apiCallReference);
        activities.push(this.functionActivity(
          'step:' + index,
          step.apiCallReference,
          apiCalls.get(step.apiCallReference),
          systemNames,
          manualByDesign
        ));
        return;
      }

      activities.push({
        key: 'step:' + index,
        label: 'Step ' + (index + 1),
        state: manualByDesign ? 'manual' : 'missing',
        reason: manualByDesign ? 'byDesign' : 'noFunction',
        systemNames: []
      });
    });

    (process.apiCallIds || []).forEach(id => {
      if (seenApiCalls.has(id)) {
        return;
      }
      seenApiCalls.add(id);
      activities.push(this.functionActivity('function:' + id, id, apiCalls.get(id), systemNames, manualByDesign));
    });

    if (activities.length === 0) {
      // a process without a single step or function is the plainest gap there is
      activities.push({
        key: 'process',
        label: process.name || '(unnamed)',
        state: manualByDesign ? 'manual' : 'missing',
        reason: manualByDesign ? 'byDesign' : 'noFunction',
        systemNames: []
      });
    }

    return activities;
  }

  private functionActivity(
    key: string,
    apiCallId: string,
    apiCall: ApiCall | undefined,
    systemNames: Map<string, string>,
    manualByDesign: boolean
  ): ActivitySupport {
    if (!apiCall) {
      return {
        key,
        label: 'Unknown function',
        state: manualByDesign ? 'manual' : 'missing',
        reason: manualByDesign ? 'byDesign' : 'unknownFunction',
        apiCallId,
        systemNames: []
      };
    }

    const systems = (apiCall.implementedBy || [])
      .map(id => systemNames.get(id))
      .filter(name => !!name);

    let state: SupportState;
    let reason: SupportReason;

    switch (apiCall.implementationStatus) {
      case ApiImplementationStatus.Gap:
        state = 'declared';
        reason = 'declaredGap';
        break;
      case ApiImplementationStatus.Planned:
      case ApiImplementationStatus.InDevelopment:
        state = 'planned';
        reason = 'planned';
        break;
      default:
        // Ready, and anything a model written before the field existed carries
        state = systems.length ? 'live' : 'declared';
        reason = systems.length ? 'ready' : 'noSystem';
        break;
    }

    if (manualByDesign) {
      state = 'manual';
      reason = 'byDesign';
    }

    return {
      key,
      label: apiCall.name || '(unnamed function)',
      state,
      reason,
      apiCallId,
      apiCallName: apiCall.name,
      systemNames: systems
    };
  }

  private subprocessActivity(
    index: number,
    subprocessId: string,
    child: Process | undefined,
    manualByDesign: boolean,
    bandOf: (p: Process) => SupportBand
  ): ActivitySupport {
    const band: SupportBand = child ? bandOf(child) : 'gap';
    const stateOfBand: { [key in SupportBand]: SupportState } = {
      seamless: 'live',
      planned: 'planned',
      gap: 'declared',
      manual: 'manual'
    };

    return {
      key: 'step:' + index,
      label: child ? (child.name || '(unnamed)') : 'Unknown subprocess',
      state: manualByDesign ? 'manual' : stateOfBand[band],
      reason: manualByDesign ? 'byDesign' : (child ? (band === 'gap' ? 'declaredGap' : (band === 'planned' ? 'planned' : 'ready')) : 'noFunction'),
      subprocessId,
      subprocessName: child ? child.name : undefined,
      systemNames: []
    };
  }

  private bandFrom(process: Process, activities: ActivitySupport[]): SupportBand {
    if (process.supportPlan && process.supportPlan.intent === 'manualByDesign') {
      return 'manual';
    }
    const counted = activities.filter(a => a.state !== 'manual');
    if (counted.length === 0) {
      return 'manual';
    }
    if (counted.some(a => a.state === 'declared' || a.state === 'missing')) {
      return 'gap';
    }
    if (counted.some(a => a.state === 'planned')) {
      return 'planned';
    }
    return 'seamless';
  }

  private roleNameOf(process: Process, roleNames: Map<string, string>): string {
    const name = roleNames.get(String(process.role));
    return name || 'Unassigned';
  }

  // ---------------------------------------------------------------------------
  // Journeys
  // ---------------------------------------------------------------------------

  /** Which journeys walk through a given process */
  private journeysByProcess(source: LandscapeSource): Map<string, { id: string; name: string }[]> {
    const byProcess = new Map<string, { id: string; name: string }[]>();

    (source.journeys || []).forEach(journey => {
      const nodes = (journey.layout && journey.layout.nodes) || [];
      const reached = new Set<string>();
      nodes.forEach(node => {
        if (node.type === 'process' && node.processId) {
          reached.add(node.processId);
        }
      });
      reached.forEach(processId => {
        const list = byProcess.get(processId) || [];
        list.push({ id: journey.id, name: journey.name || '(unnamed journey)' });
        byProcess.set(processId, list);
      });
    });

    return byProcess;
  }

  /**
   * A journey rolls up the processes it reaches. A process on two journeys
   * counts on both - each journey is told about its own path, not about a
   * share of some total.
   */
  private journeyGaps(source: LandscapeSource, gaps: ProcessGap[]): JourneyGap[] {
    const byId = new Map<string, ProcessGap>(gaps.map(g => [g.processId, g] as [string, ProcessGap]));

    const journeys: JourneyGap[] = (source.journeys || []).map(journey => {
      const nodes = (journey.layout && journey.layout.nodes) || [];
      const processIds: string[] = [];
      const seen = new Set<string>();
      nodes.forEach(node => {
        if (node.type === 'process' && node.processId && !seen.has(node.processId) && byId.has(node.processId)) {
          seen.add(node.processId);
          processIds.push(node.processId);
        }
      });
      return this.rollUp(journey.id, journey.name || '(unnamed journey)', processIds, byId);
    });

    const onAJourney = new Set<string>();
    journeys.forEach(j => j.processIds.forEach(id => onAJourney.add(id)));
    const orphans = gaps.filter(g => !onAJourney.has(g.processId)).map(g => g.processId);
    if (orphans.length) {
      journeys.push(this.rollUp(NO_JOURNEY_ID, NO_JOURNEY_NAME, orphans, byId));
    }

    return journeys;
  }

  private rollUp(id: string, name: string, processIds: string[], byId: Map<string, ProcessGap>): JourneyGap {
    let counted = 0;
    let live = 0;
    let planned = 0;
    let open = 0;

    processIds.forEach(processId => {
      const gap = byId.get(processId);
      if (!gap) {
        return;
      }
      counted += gap.counted;
      live += gap.live;
      planned += gap.planned;
      open += gap.open;
    });

    return {
      journeyId: id,
      journeyName: name,
      processIds,
      counted,
      live,
      planned,
      open,
      coverage: counted ? live / counted : 1,
      plannedCoverage: counted ? (live + planned) / counted : 1
    };
  }

  // ---------------------------------------------------------------------------
  // The roadmap
  // ---------------------------------------------------------------------------

  /**
   * The list of things that have to be built. Activities that wait for the same
   * function become one entry - building it once closes all of them - while an
   * activity with no function in the model gets an entry of its own, because
   * nobody has decided yet what that function is.
   */
  openItems(gaps: ProcessGap[]): OpenItem[] {
    const items = new Map<string, OpenItem>();

    gaps.forEach(gap => {
      gap.activities.forEach(activity => {
        if (activity.state !== 'declared' && activity.state !== 'missing') {
          return;
        }
        // a subprocess is not a piece of work of its own - it is closed by the
        // items of the process it points at, which carries them itself
        if (activity.subprocessId) {
          return;
        }

        const key = activity.apiCallId ? 'api:' + activity.apiCallId : 'step:' + gap.processId + ':' + activity.key;
        const existing = items.get(key);

        if (existing) {
          existing.places.push({ processId: gap.processId, processName: gap.processName, activityLabel: activity.label });
          this.addUnique(existing.journeyNames, gap.journeyNames);
          this.addUnique(existing.roleNames, [gap.roleName]);
          if (GAP_PRIORITY_ORDER[gap.priority || 'medium'] < GAP_PRIORITY_ORDER[existing.priority]) {
            existing.priority = gap.priority || 'medium';
          }
          if (!existing.horizon && gap.horizon) {
            existing.horizon = gap.horizon;
          }
          return;
        }

        items.set(key, {
          key,
          name: activity.apiCallName || activity.label,
          modelled: !!activity.apiCallId,
          apiCallId: activity.apiCallId,
          priority: (gap.priority || 'medium') as GapPriority,
          horizon: gap.horizon,
          owner: gap.owner,
          note: gap.note,
          places: [{ processId: gap.processId, processName: gap.processName, activityLabel: activity.label }],
          journeyNames: gap.journeyNames.slice(),
          roleNames: [gap.roleName]
        });
      });
    });

    return Array.from(items.values()).sort((a, b) =>
      GAP_PRIORITY_ORDER[a.priority] - GAP_PRIORITY_ORDER[b.priority] ||
      (a.horizon || '~').localeCompare(b.horizon || '~') ||
      a.name.localeCompare(b.name)
    );
  }

  private addUnique(target: string[], values: string[]): void {
    values.forEach(value => {
      if (value && target.indexOf(value) < 0) {
        target.push(value);
      }
    });
  }
}
