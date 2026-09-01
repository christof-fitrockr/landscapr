/**
 * The gap view of the model, the same reading the app shows under Process Gaps:
 * which processes a person has to carry because no function supports them, and
 * what has to be built to make the journey seamless.
 *
 * Nothing here is stored. Every number is derived from the elements, so the
 * answer always matches the model the reader is looking at.
 */
import { ENUMS } from './schema.js';

const STATE_OF_BAND = { seamless: 'live', planned: 'planned', gap: 'declared', manual: 'manual' };
const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

export const NO_JOURNEY_ID = '__no_journey__';
export const NO_JOURNEY_NAME = 'Not on a journey';

export function gapReport(store) {
  const processes = store.elements('process');
  const functions = new Map(store.elements('function').map(fn => [fn.id, fn]));
  const processesById = new Map(processes.map(process => [process.id, process]));
  const systemNames = new Map(store.elements('system').map(system => [system.id, system.name]));
  const roleNames = new Map(store.elements('role').map(role => [String(role.id), role.name]));

  const journeysOfProcess = journeysByProcess(store);

  const bandCache = new Map();
  const resolving = new Set();

  const bandOf = process => {
    if (bandCache.has(process.id)) return bandCache.get(process.id);
    if (resolving.has(process.id)) return 'manual';
    resolving.add(process.id);
    const band = bandFrom(process, activitiesOf(process, functions, processesById, systemNames, bandOf));
    resolving.delete(process.id);
    bandCache.set(process.id, band);
    return band;
  };

  const gaps = processes.map(process => {
    const activities = activitiesOf(process, functions, processesById, systemNames, bandOf);
    const counted = activities.filter(activity => activity.state !== 'manual');
    const live = counted.filter(activity => activity.state === 'live').length;
    const planned = counted.filter(activity => activity.state === 'planned').length;
    const open = counted.filter(activity => activity.state === 'declared' || activity.state === 'missing').length;
    const plan = process.supportPlan;
    const journeys = journeysOfProcess.get(process.id) || [];

    return {
      processId: process.id,
      processName: process.name || '(unnamed)',
      roleName: roleNames.get(String(process.role)) || 'Unassigned',
      band: bandOf(process),
      activities,
      counted: counted.length,
      live,
      planned,
      open,
      manual: activities.length - counted.length,
      coverage: counted.length ? live / counted.length : 1,
      plannedCoverage: counted.length ? (live + planned) / counted.length : 1,
      journeyIds: journeys.map(journey => journey.id),
      journeyNames: journeys.map(journey => journey.name),
      note: plan ? plan.note : undefined,
      priority: plan ? plan.priority : undefined,
      horizon: plan ? plan.horizon : undefined,
      owner: plan ? plan.owner : undefined
    };
  });

  const journeys = journeyGaps(store, gaps);
  const openItems = openItemsOf(gaps);
  const realJourneys = journeys.filter(journey => journey.journeyId !== NO_JOURNEY_ID).length;

  return { processes: gaps, journeys, openItems, totals: totalsOf(gaps, realJourneys, openItems.length) };
}

function activitiesOf(process, functions, processes, systemNames, bandOf) {
  const manualByDesign = !!(process.supportPlan && process.supportPlan.intent === 'manualByDesign');
  const activities = [];
  const seen = new Set();

  (process.steps || []).forEach((step, index) => {
    if (step.processReference) {
      const child = processes.get(step.processReference);
      const band = child ? bandOf(child) : 'gap';
      activities.push({
        key: 'step:' + index,
        label: child ? (child.name || '(unnamed)') : 'Unknown subprocess',
        state: manualByDesign ? 'manual' : STATE_OF_BAND[band],
        reason: manualByDesign ? 'byDesign' : (child ? (band === 'gap' ? 'declaredGap' : (band === 'planned' ? 'planned' : 'ready')) : 'noFunction'),
        subprocessId: step.processReference,
        subprocessName: child ? child.name : undefined,
        systemNames: []
      });
      return;
    }

    if (step.apiCallReference) {
      seen.add(step.apiCallReference);
      activities.push(functionActivity('step:' + index, step.apiCallReference, functions.get(step.apiCallReference), systemNames, manualByDesign));
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
    if (seen.has(id)) return;
    seen.add(id);
    activities.push(functionActivity('function:' + id, id, functions.get(id), systemNames, manualByDesign));
  });

  if (activities.length === 0) {
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

function functionActivity(key, functionId, fn, systemNames, manualByDesign) {
  if (!fn) {
    return {
      key,
      label: 'Unknown function',
      state: manualByDesign ? 'manual' : 'missing',
      reason: manualByDesign ? 'byDesign' : 'unknownFunction',
      apiCallId: functionId,
      systemNames: []
    };
  }

  const systems = (fn.implementedBy || []).map(id => systemNames.get(id)).filter(Boolean);
  let state;
  let reason;

  switch (fn.implementationStatus) {
    case ENUMS.implementationStatus.Gap:
      state = 'declared';
      reason = 'declaredGap';
      break;
    case ENUMS.implementationStatus.Planned:
    case ENUMS.implementationStatus.InDevelopment:
      state = 'planned';
      reason = 'planned';
      break;
    default:
      state = systems.length ? 'live' : 'declared';
      reason = systems.length ? 'ready' : 'noSystem';
      break;
  }

  if (manualByDesign) {
    state = 'manual';
    reason = 'byDesign';
  }

  return { key, label: fn.name || '(unnamed function)', state, reason, apiCallId: functionId, apiCallName: fn.name, systemNames: systems };
}

function bandFrom(process, activities) {
  if (process.supportPlan && process.supportPlan.intent === 'manualByDesign') return 'manual';
  const counted = activities.filter(activity => activity.state !== 'manual');
  if (counted.length === 0) return 'manual';
  if (counted.some(activity => activity.state === 'declared' || activity.state === 'missing')) return 'gap';
  if (counted.some(activity => activity.state === 'planned')) return 'planned';
  return 'seamless';
}

function journeysByProcess(store) {
  const byProcess = new Map();
  store.elements('journey').forEach(journey => {
    const nodes = (journey.layout && journey.layout.nodes) || [];
    const reached = new Set();
    nodes.forEach(node => {
      if (node.type === 'process' && node.processId) reached.add(node.processId);
    });
    reached.forEach(processId => {
      const list = byProcess.get(processId) || [];
      list.push({ id: journey.id, name: journey.name || '(unnamed journey)' });
      byProcess.set(processId, list);
    });
  });
  return byProcess;
}

function journeyGaps(store, gaps) {
  const byId = new Map(gaps.map(gap => [gap.processId, gap]));

  const journeys = store.elements('journey').map(journey => {
    const nodes = (journey.layout && journey.layout.nodes) || [];
    const processIds = [];
    const seen = new Set();
    nodes.forEach(node => {
      if (node.type === 'process' && node.processId && !seen.has(node.processId) && byId.has(node.processId)) {
        seen.add(node.processId);
        processIds.push(node.processId);
      }
    });
    return rollUp(journey.id, journey.name || '(unnamed journey)', processIds, byId);
  });

  const onAJourney = new Set();
  journeys.forEach(journey => journey.processIds.forEach(id => onAJourney.add(id)));
  const orphans = gaps.filter(gap => !onAJourney.has(gap.processId)).map(gap => gap.processId);
  if (orphans.length) {
    journeys.push(rollUp(NO_JOURNEY_ID, NO_JOURNEY_NAME, orphans, byId));
  }

  return journeys;
}

function rollUp(id, name, processIds, byId) {
  let counted = 0;
  let live = 0;
  let planned = 0;
  let open = 0;

  processIds.forEach(processId => {
    const gap = byId.get(processId);
    if (!gap) return;
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

function openItemsOf(gaps) {
  const items = new Map();

  gaps.forEach(gap => {
    gap.activities.forEach(activity => {
      if (activity.state !== 'declared' && activity.state !== 'missing') return;
      if (activity.subprocessId) return;

      const key = activity.apiCallId ? 'api:' + activity.apiCallId : 'step:' + gap.processId + ':' + activity.key;
      const existing = items.get(key);
      const place = { processId: gap.processId, processName: gap.processName, activityLabel: activity.label };

      if (existing) {
        existing.places.push(place);
        addUnique(existing.journeyNames, gap.journeyNames);
        addUnique(existing.roleNames, [gap.roleName]);
        if (PRIORITY_ORDER[gap.priority || 'medium'] < PRIORITY_ORDER[existing.priority]) {
          existing.priority = gap.priority || 'medium';
        }
        if (!existing.horizon && gap.horizon) existing.horizon = gap.horizon;
        return;
      }

      items.set(key, {
        key,
        name: activity.apiCallName || activity.label,
        modelled: !!activity.apiCallId,
        apiCallId: activity.apiCallId,
        priority: gap.priority || 'medium',
        horizon: gap.horizon,
        owner: gap.owner,
        note: gap.note,
        places: [place],
        journeyNames: gap.journeyNames.slice(),
        roleNames: [gap.roleName]
      });
    });
  });

  return Array.from(items.values()).sort((a, b) =>
    PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] ||
    (a.horizon || '~').localeCompare(b.horizon || '~') ||
    a.name.localeCompare(b.name));
}

function totalsOf(gaps, journeyCount, openItems) {
  const totals = {
    processes: gaps.length,
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

  const affected = new Set();

  gaps.forEach(gap => {
    totals.activities += gap.counted;
    totals.live += gap.live;
    totals.planned += gap.planned;
    totals.open += gap.open;
    totals.manual += gap.manual;
    if (gap.band === 'gap') {
      totals.processesWithGap++;
      gap.journeyIds.forEach(id => affected.add(id));
    }
    if (gap.band === 'manual') totals.processesManual++;
  });

  totals.coverage = totals.activities ? totals.live / totals.activities : 1;
  totals.plannedCoverage = totals.activities ? (totals.live + totals.planned) / totals.activities : 1;
  totals.journeysAffected = affected.size;

  return totals;
}

function addUnique(target, values) {
  values.forEach(value => {
    if (value && target.indexOf(value) < 0) target.push(value);
  });
}
