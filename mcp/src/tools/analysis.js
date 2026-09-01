/**
 * The questions a model is kept for: what breaks if this changes, where is the
 * business carried by people because no function supports it, and does the
 * model still hold together.
 */
import { gapReport } from '../gaps.js';
import { danglingEdges, reach } from '../relations.js';
import { ENUMS, TYPES, TYPE_NAMES, resolveTypeName } from '../schema.js';
import { percent, result, typeProperty } from '../tool-helpers.js';

export function analysisTools(store) {
  return [
    {
      name: 'landscapr_overview',
      description:
        'What the model holds and where it comes from: the number of elements per kind, how well the processes are ' +
        'supported today, and whether there are changes that are not saved yet. A good first call.',
      inputSchema: { type: 'object', properties: {} },
      handler: async () => {
        const report = gapReport(store);
        return result({
          source: store.describeSource(),
          counts: store.counts(),
          support: {
            processes: report.totals.processes,
            withGap: report.totals.processesWithGap,
            manualByDesign: report.totals.processesManual,
            coverageToday: percent(report.totals.coverage),
            coverageOncePlannedIsBuilt: percent(report.totals.plannedCoverage),
            openItems: report.totals.openItems
          },
          journeys: report.journeys
            .filter(journey => journey.journeyId !== '__no_journey__')
            .map(journey => ({ journey: journey.journeyName, coverage: percent(journey.coverage), open: journey.open }))
        });
      }
    },

    {
      name: 'landscapr_gaps',
      description:
        'The gap view: which processes run without functional support, what that does to the journeys, and the list ' +
        'of functions that would have to be built to close it. Nothing here is stored - it is read from the model.',
      inputSchema: {
        type: 'object',
        properties: {
          scope: {
            type: 'string',
            description: 'summary for the numbers, processes for the detail per process, journeys for the roll up, roadmap for what has to be built',
            enum: ['summary', 'processes', 'journeys', 'roadmap']
          },
          band: {
            type: 'string',
            description: 'With scope=processes: only processes in this state',
            enum: ['seamless', 'planned', 'gap', 'manual']
          },
          limit: { type: 'integer', description: 'How many entries to return, 25 by default', minimum: 1, maximum: 200 }
        }
      },
      handler: async ({ scope = 'summary', band, limit = 25 }) => {
        const report = gapReport(store);

        if (scope === 'summary') {
          return result({
            totals: {
              ...report.totals,
              coverage: percent(report.totals.coverage),
              plannedCoverage: percent(report.totals.plannedCoverage)
            },
            worstProcesses: report.processes
              .filter(process => process.band === 'gap')
              .sort((a, b) => a.coverage - b.coverage || b.open - a.open)
              .slice(0, 5)
              .map(process => ({ process: process.processName, open: process.open, coverage: percent(process.coverage) }))
          });
        }

        if (scope === 'journeys') {
          return result({
            journeys: report.journeys.map(journey => ({
              journey: journey.journeyName,
              processes: journey.processIds.length,
              activities: journey.counted,
              live: journey.live,
              planned: journey.planned,
              open: journey.open,
              coverage: percent(journey.coverage),
              plannedCoverage: percent(journey.plannedCoverage)
            }))
          });
        }

        if (scope === 'roadmap') {
          return result({
            openItems: report.openItems.slice(0, limit).map(item => ({
              name: item.name,
              inTheModel: item.modelled,
              priority: item.priority,
              horizon: item.horizon,
              owner: item.owner,
              note: item.note,
              wouldHelp: item.places.map(place => `${place.processName}: ${place.activityLabel}`),
              journeys: item.journeyNames,
              roles: item.roleNames
            })),
            total: report.openItems.length
          });
        }

        const processes = report.processes
          .filter(process => !band || process.band === band)
          .sort((a, b) => a.coverage - b.coverage);

        return result({
          total: processes.length,
          processes: processes.slice(0, limit).map(process => ({
            process: process.processName,
            role: process.roleName,
            state: process.band,
            coverage: percent(process.coverage),
            live: process.live,
            planned: process.planned,
            open: process.open,
            journeys: process.journeyNames,
            plan: process.note || process.priority || process.horizon
              ? { note: process.note, priority: process.priority, horizon: process.horizon, owner: process.owner }
              : undefined,
            activities: process.activities.map(activity => ({
              step: activity.label,
              state: activity.state,
              why: activity.reason,
              systems: activity.systemNames
            }))
          }))
        });
      }
    },

    {
      name: 'landscapr_impact',
      description:
        'The blast radius of an element: everything that would be affected if it changed or was retired, walked out ' +
        'over the links of the model. Ask downwards to see what it relies on instead.',
      inputSchema: {
        type: 'object',
        properties: {
          type: typeProperty,
          element: { type: 'string', description: 'The element, by name or id' },
          direction: {
            type: 'string',
            description: 'up = who uses it and would notice a change (the default), down = what it uses itself',
            enum: ['up', 'down']
          },
          depth: { type: 'integer', description: 'How many links to follow, 3 by default', minimum: 1, maximum: 8 }
        },
        required: ['type', 'element']
      },
      handler: async ({ type, element, direction = 'up', depth = 3 }) => {
        const typeName = resolveTypeName(type);
        const found = store.find(typeName, element);
        const affected = reach(store, typeName, found.id, { depth, direction });

        const byKind = {};
        affected.forEach(entry => {
          byKind[entry.type] = byKind[entry.type] || [];
          byKind[entry.type].push({ name: entry.name, id: entry.id, steps: entry.distance });
        });

        return result({
          element: { type: typeName, name: found.name, id: found.id },
          direction,
          depth,
          affected: affected.length,
          byKind
        });
      }
    },

    {
      name: 'landscapr_validate',
      description:
        'Reads the model the way a reviewer would: links that point at nothing, names used twice, functions nobody ' +
        'provides, processes no journey reaches. Run it before saving a set of changes.',
      inputSchema: {
        type: 'object',
        properties: {
          strict: { type: 'boolean', description: 'Also report the softer findings, e.g. elements without a description' }
        }
      },
      handler: async ({ strict = false }) => {
        const problems = [];
        const notes = [];

        danglingEdges(store).forEach(edge => {
          // a model written before roles were stored carries role ids the app seeds itself
          if (edge.relation === 'performed-by' && store.elements('role').length === 0) return;
          problems.push({ kind: 'danglingReference', what: `${edge.from} -> ${edge.missing}`, relation: edge.relation });
        });

        for (const typeName of TYPE_NAMES) {
          const seen = new Map();
          store.elements(typeName).forEach(element => {
            const name = (element.name || '').trim().toLowerCase();
            if (!name) {
              problems.push({ kind: 'unnamed', what: `${TYPES[typeName].label} ${element.id}` });
              return;
            }
            if (seen.has(name)) {
              problems.push({ kind: 'duplicateName', what: `${TYPES[typeName].label} "${element.name}"`, ids: [seen.get(name), element.id] });
            }
            seen.set(name, element.id);
          });
        }

        store.elements('function').forEach(fn => {
          const ready = (fn.implementationStatus ?? ENUMS.implementationStatus.Ready) === ENUMS.implementationStatus.Ready;
          if (ready && !(fn.implementedBy || []).length) {
            problems.push({ kind: 'functionWithoutSystem', what: `Function "${fn.name}" is ready but no system provides it` });
          }
        });

        const onAJourney = new Set();
        store.elements('journey').forEach(journey => {
          ((journey.layout && journey.layout.nodes) || []).forEach(node => {
            if (node.processId) onAJourney.add(node.processId);
          });
        });
        store.elements('process').forEach(process => {
          if (!onAJourney.has(process.id)) {
            notes.push({ kind: 'processOffJourney', what: `Process "${process.name}" is not on any journey` });
          }
          if (!(process.steps || []).length && !(process.apiCallIds || []).length) {
            notes.push({ kind: 'processWithoutFlow', what: `Process "${process.name}" has no steps and no functions` });
          }
        });

        if (strict) {
          for (const typeName of TYPE_NAMES) {
            store.elements(typeName).forEach(element => {
              if (!('description' in element) || !(element.description || '').trim()) {
                notes.push({ kind: 'noDescription', what: `${TYPES[typeName].label} "${element.name}"` });
              }
            });
          }
        }

        return result({
          healthy: problems.length === 0,
          problems,
          notes: strict ? notes : notes.slice(0, 20),
          counts: { problems: problems.length, notes: notes.length }
        });
      }
    }
  ];
}
