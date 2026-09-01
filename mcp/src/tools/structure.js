/**
 * The tools that model the shape of things rather than their fields: the links
 * between two elements, the flow of a process, the steps and the experience
 * layer of a journey, and the attributes of a data object.
 */
import { ENUMS } from '../schema.js';
import { localId, result } from '../tool-helpers.js';
import { attachToParent, detachFromParent, removeJourneyNodes } from './elements.js';

/** Every link the model knows, and what the two ends of it are */
const RELATIONS = {
  'journey-step': { from: 'journey', to: 'process', text: 'a journey walks through a process' },
  'process-function': { from: 'process', to: 'function', text: 'a process uses a function' },
  'process-subprocess': { from: 'process', to: 'process', text: 'a process calls another process' },
  'process-role': { from: 'process', to: 'role', text: 'a role carries a process' },
  'process-system': { from: 'process', to: 'system', text: 'a system carries a process' },
  'function-capability': { from: 'function', to: 'capability', text: 'a function serves a capability' },
  'function-system': { from: 'function', to: 'system', text: 'a system provides a function' },
  'function-input': { from: 'function', to: 'data', text: 'a function consumes a data object' },
  'function-output': { from: 'function', to: 'data', text: 'a function produces a data object' },
  'capability-parent': { from: 'capability', to: 'capability', text: 'a capability sits under another one' },
  'capability-system': { from: 'capability', to: 'system', text: 'a system implements a capability' }
};

const RELATION_LIST = Object.entries(RELATIONS)
  .map(([name, relation]) => `${name} (${relation.from} -> ${relation.to}: ${relation.text})`)
  .join('; ');

export function structureTools(store) {
  return [
    {
      name: 'landscapr_link',
      description: 'Links two elements. This is what turns single elements into one connected model. Relations: ' + RELATION_LIST,
      inputSchema: {
        type: 'object',
        properties: {
          relation: { type: 'string', description: 'Which link to make', enum: Object.keys(RELATIONS) },
          from: { type: 'string', description: 'The element the link starts at, by name or id' },
          to: { type: 'string', description: 'The element the link points at, by name or id' }
        },
        required: ['relation', 'from', 'to']
      },
      handler: async ({ relation, from, to }) => {
        store.assertWritable();
        const spec = relationOf(relation);
        const source = store.find(spec.from, from);
        const target = store.find(spec.to, to);

        const changed = link(store, relation, source, target);
        await store.touched();

        return result({
          linked: changed,
          relation,
          from: { type: spec.from, name: source.name, id: source.id },
          to: { type: spec.to, name: target.name, id: target.id },
          unsavedChanges: store.dirty
        });
      }
    },

    {
      name: 'landscapr_unlink',
      description: 'Takes a link between two elements away again. The elements themselves stay in the model.',
      inputSchema: {
        type: 'object',
        properties: {
          relation: { type: 'string', description: 'Which link to remove', enum: Object.keys(RELATIONS) },
          from: { type: 'string', description: 'The element the link starts at, by name or id' },
          to: { type: 'string', description: 'The element the link points at, by name or id' }
        },
        required: ['relation', 'from', 'to']
      },
      handler: async ({ relation, from, to }) => {
        store.assertWritable();
        const spec = relationOf(relation);
        const source = store.find(spec.from, from);
        const target = store.find(spec.to, to);

        const changed = unlink(store, relation, source, target);
        await store.touched();

        return result({ unlinked: changed, relation, from: source.name, to: target.name, unsavedChanges: store.dirty });
      }
    },

    {
      name: 'landscapr_set_process_flow',
      description:
        'Writes the flow of a process: the steps it runs, in order. A step either calls a function or hands over to ' +
        'a subprocess, and may name the alternatives that follow it. This replaces the flow the process had.',
      inputSchema: {
        type: 'object',
        properties: {
          process: { type: 'string', description: 'The process, by name or id' },
          steps: {
            type: 'array',
            description: 'The steps in the order they run',
            items: {
              type: 'object',
              properties: {
                function: { type: 'string', description: 'The function this step calls, by name or id' },
                subprocess: { type: 'string', description: 'The process this step hands over to, by name or id' },
                successors: {
                  type: 'array',
                  description: 'What can follow this step, e.g. the branches of a decision',
                  items: {
                    type: 'object',
                    properties: {
                      label: { type: 'string', description: 'The condition on the branch, e.g. "approved"' },
                      function: { type: 'string', description: 'The function the branch calls' },
                      subprocess: { type: 'string', description: 'The process the branch hands over to' }
                    }
                  }
                }
              }
            }
          },
          createMissingFunctions: {
            type: 'boolean',
            description: 'Create a function that is named but not in the model yet, as a declared gap. Off by default.'
          }
        },
        required: ['process', 'steps']
      },
      handler: async ({ process, steps, createMissingFunctions = false }) => {
        store.assertWritable();
        const found = store.find('process', process);
        const created = [];
        const calledBefore = functionsOf(found.steps);

        found.steps = steps.map((step, index) => {
          if (step.function && step.subprocess) {
            throw new Error(`Step ${index + 1} names both a function and a subprocess. A step does one or the other.`);
          }
          return {
            processReference: step.subprocess ? store.find('process', step.subprocess).id : '',
            apiCallReference: step.function ? functionId(store, step.function, createMissingFunctions, created) : '',
            successors: (step.successors || []).map(successor => ({
              edgeTitle: successor.label || '',
              processReference: successor.subprocess ? store.find('process', successor.subprocess).id : '',
              apiCallReference: successor.function ? functionId(store, successor.function, createMissingFunctions, created) : ''
            }))
          };
        });

        // the functions the steps call are what the process uses, so both stay in
        // step: what the old flow brought along goes, what the new one calls arrives,
        // and a function attached to the process itself is left alone
        const used = new Set((found.apiCallIds || []).filter(id => !calledBefore.has(id)));
        functionsOf(found.steps).forEach(id => used.add(id));
        found.apiCallIds = Array.from(used);

        await store.touched();
        return result({
          process: found.name,
          steps: found.steps.length,
          createdFunctions: created,
          unsavedChanges: store.dirty
        });
      }
    },

    {
      name: 'landscapr_set_journey_flow',
      description:
        'Writes the steps of a journey and how they follow each other. A step points at a process - that is the link ' +
        'between what the customer goes through and what the organisation does. Steps are laid out left to right ' +
        'unless you give positions yourself. This replaces the steps the journey had; its experience layer is kept ' +
        'for the steps that stay.',
      inputSchema: {
        type: 'object',
        properties: {
          journey: { type: 'string', description: 'The journey, by name or id' },
          steps: {
            type: 'array',
            description: 'The steps of the journey, in the order the customer walks them',
            items: {
              type: 'object',
              properties: {
                process: { type: 'string', description: 'The process behind this step, by name or id' },
                kind: { type: 'string', description: 'process by default; a decision is a branching point, a group is a box around steps', enum: ['process', 'decision', 'group'] },
                label: { type: 'string', description: 'Label of a decision or a group. A process step is labelled with its process.' },
                id: { type: 'string', description: 'Id of the step, so connections can refer to it. Given automatically when left out.' },
                x: { type: 'number', description: 'Position on the canvas, laid out automatically when left out' },
                y: { type: 'number', description: 'Position on the canvas, laid out automatically when left out' }
              }
            }
          },
          connections: {
            type: 'array',
            description: 'How the steps follow each other. Left out means one after the other, in the order given.',
            items: {
              type: 'object',
              properties: {
                from: { type: 'string', description: 'The step the arrow starts at, by step id, process name or label' },
                to: { type: 'string', description: 'The step the arrow points at' },
                label: { type: 'string', description: 'What the arrow says, e.g. "rejected"' }
              },
              required: ['from', 'to']
            }
          },
          createMissingProcesses: {
            type: 'boolean',
            description: 'Create a process that is named but not in the model yet. On by default, because a journey step is a process.'
          }
        },
        required: ['journey', 'steps']
      },
      handler: async ({ journey, steps, connections, createMissingProcesses = true }) => {
        store.assertWritable();
        const found = store.find('journey', journey);
        const previous = found.layout || { nodes: [], edges: [], panX: 0, panY: 0, zoom: 1 };
        const created = [];

        const nodes = steps.map((step, index) => {
          const kind = step.kind || (step.process ? 'process' : 'decision');
          const size = kind === 'process' ? { width: 120, height: 60 }
            : kind === 'decision' ? { width: 24, height: 24 }
              : { width: 200, height: 120 };

          const node = {
            id: step.id || localId(kind === 'process' ? 'proc' : kind === 'decision' ? 'dec' : 'grp'),
            type: kind,
            x: step.x !== undefined ? step.x : 80 + index * 200,
            y: step.y !== undefined ? step.y : (kind === 'decision' ? 178 : 160),
            ...size
          };

          if (kind === 'process') {
            if (!step.process) throw new Error(`Step ${index + 1} is a process step but names no process.`);
            const process = processFor(store, step.process, createMissingProcesses, created);
            node.processId = process.id;
            node.label = step.label || process.name;
          } else {
            node.label = step.label || (kind === 'decision' ? 'Condition' : 'Group');
          }

          return node;
        });

        const byReference = new Map();
        nodes.forEach(node => {
          byReference.set(node.id, node);
          if (node.label) byReference.set(node.label.toLowerCase(), node);
          if (node.processId) byReference.set(node.processId, node);
        });

        const edges = (connections && connections.length)
          ? connections.map(connection => ({
            id: localId('e'),
            from: nodeFor(byReference, connection.from).id,
            to: nodeFor(byReference, connection.to).id,
            label: connection.label || undefined
          }))
          : nodes.slice(1).map((node, index) => ({
            id: localId('e'),
            from: nodes[index].id,
            to: node.id
          }));

        const keptIds = new Set(nodes.map(node => node.id));
        const expectations = (previous.expectations || []).filter(expectation => keptIds.has(expectation.nodeId));

        found.layout = {
          nodes,
          edges,
          panX: previous.panX || 0,
          panY: previous.panY || 0,
          zoom: previous.zoom || 1,
          expectations,
          showExperienceLayer: previous.showExperienceLayer || false
        };

        await store.touched();
        return result({
          journey: found.name,
          steps: nodes.map(node => ({ id: node.id, kind: node.type, label: node.label })),
          connections: edges.length,
          createdProcesses: created,
          keptExpectations: expectations.length,
          unsavedChanges: store.dirty
        });
      }
    },

    {
      name: 'landscapr_set_experience',
      description:
        'Writes the experience layer of one journey step: what the customer expects there, what they actually get, ' +
        'and how well the two match. This is what turns a journey into experience management.',
      inputSchema: {
        type: 'object',
        properties: {
          journey: { type: 'string', description: 'The journey, by name or id' },
          step: { type: 'string', description: 'The step, by step id, by the name of the process behind it or by its label' },
          expectations: {
            type: 'array',
            description: 'The expectations at this step. Replaces the ones the step had.',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string', description: 'Short name of the expectation' },
                expectation: { type: 'string', description: 'What the customer expects here' },
                outcome: { type: 'string', description: 'What the customer actually gets' },
                fulfilment: { type: 'string', description: 'How well the outcome matches the expectation', enum: Object.keys(ENUMS.fulfilment) },
                persona: { type: 'string', description: 'The customer or segment this applies to' },
                metric: { type: 'string', description: 'The measure that verifies the outcome' },
                target: { type: 'string', description: 'Target value of the measure' },
                actual: { type: 'string', description: 'Measured value' },
                jiraTicket: { type: 'string', description: 'Jira issues that carry the work on it' }
              },
              required: ['title']
            }
          },
          show: { type: 'boolean', description: 'Show the experience layer on the journey. On by default when there are expectations.' }
        },
        required: ['journey', 'step', 'expectations']
      },
      handler: async ({ journey, step, expectations, show }) => {
        store.assertWritable();
        const found = store.find('journey', journey);
        if (!found.layout || !(found.layout.nodes || []).length) {
          throw new Error(`"${found.name}" has no steps yet. Write them with landscapr_set_journey_flow first.`);
        }

        const node = findJourneyNode(store, found, step);
        const kept = (found.layout.expectations || []).filter(expectation => expectation.nodeId !== node.id);

        const written = expectations.map(expectation => ({
          id: localId('exp'),
          nodeId: node.id,
          title: String(expectation.title).trim(),
          expectation: (expectation.expectation || '').trim(),
          outcome: (expectation.outcome || '').trim(),
          fulfilment: expectation.fulfilment || 'unknown',
          persona: expectation.persona || undefined,
          metric: expectation.metric || undefined,
          target: expectation.target || undefined,
          actual: expectation.actual || undefined,
          jiraTicket: expectation.jiraTicket || undefined
        }));

        found.layout.expectations = [...kept, ...written];
        found.layout.showExperienceLayer = show !== undefined ? show : found.layout.expectations.length > 0;

        await store.touched();
        return result({
          journey: found.name,
          step: node.label || node.id,
          expectations: written.length,
          onTheJourney: found.layout.expectations.length,
          unsavedChanges: store.dirty
        });
      }
    },

    {
      name: 'landscapr_set_data_items',
      description:
        'Writes the attributes of a data object: plain values, references to another data object, or a nested object. ' +
        'This replaces the attributes it had.',
      inputSchema: {
        type: 'object',
        properties: {
          data: { type: 'string', description: 'The data object, by name or id' },
          items: {
            type: 'array',
            description: 'The attributes of the object',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Name of the attribute' },
                description: { type: 'string', description: 'What it holds' },
                type: { type: 'string', description: 'Primitive by default', enum: Object.keys(ENUMS.dataItemType) },
                primitiveType: { type: 'string', description: 'For a Primitive: String, Integer, Boolean, Date, ...' },
                references: { type: 'string', description: 'For a Reference or a SubObject: the data object it points at, by name or id' },
                state: { type: 'string', description: 'Draft or Validated', enum: Object.keys(ENUMS.dataStatus) }
              },
              required: ['name']
            }
          },
          createMissingReferences: {
            type: 'boolean',
            description: 'Create a referenced data object that is not in the model yet. On by default.'
          }
        },
        required: ['data', 'items']
      },
      handler: async ({ data, items, createMissingReferences = true }) => {
        store.assertWritable();
        const found = store.find('data', data);
        const created = [];

        found.items = items.map(item => {
          const type = item.type || (item.references ? 'Reference' : 'Primitive');
          const entry = {
            id: localId('item'),
            name: String(item.name).trim(),
            description: item.description || '',
            state: ENUMS.dataStatus[item.state || 'Draft'],
            type
          };

          if (type === 'Primitive') {
            entry.primitiveType = item.primitiveType || 'String';
            return entry;
          }

          if (!item.references) {
            throw new Error(`Attribute "${entry.name}" is a ${type} and has to say which data object it points at.`);
          }

          let target = store.find('data', item.references, { required: false });
          if (!target) {
            if (!createMissingReferences) {
              throw new Error(`No data object "${item.references}" in the model.`);
            }
            target = {
              id: store.newId(),
              name: String(item.references).trim(),
              description: '',
              group: found.group || '',
              state: ENUMS.dataStatus.Draft,
              link: '',
              items: [],
              ...(type === 'SubObject' ? { isSubObject: true, parentId: found.id } : {})
            };
            store.add('data', target);
            created.push(target.name);
          }
          entry.dataId = target.id;
          return entry;
        });

        await store.touched();
        return result({
          data: found.name,
          attributes: found.items.length,
          createdDataObjects: created,
          unsavedChanges: store.dirty
        });
      }
    }
  ];
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

/** Every function the steps of a process call, the branches included */
function functionsOf(steps) {
  const ids = new Set();
  (steps || []).forEach(step => {
    if (step.apiCallReference) ids.add(step.apiCallReference);
    (step.successors || []).forEach(successor => {
      if (successor.apiCallReference) ids.add(successor.apiCallReference);
    });
  });
  return ids;
}

function relationOf(relation) {
  const spec = RELATIONS[relation];
  if (!spec) throw new Error(`Unknown relation "${relation}". Known: ${Object.keys(RELATIONS).join(', ')}.`);
  return spec;
}

function functionId(store, reference, createMissing, created) {
  const existing = store.find('function', reference, { required: false });
  if (existing) return existing.id;
  if (!createMissing) {
    throw new Error(`No function "${reference}" in the model. Create it first, or set createMissingFunctions.`);
  }
  const fn = {
    id: store.newId(),
    name: String(reference).trim(),
    description: '',
    implementationStatus: ENUMS.implementationStatus.Gap,
    apiType: ENUMS.apiType.System,
    capabilityId: '',
    implementedBy: [],
    input: '',
    output: '',
    inputData: [],
    outputData: [],
    tags: [],
    status: ENUMS.dataStatus.Draft
  };
  store.add('function', fn);
  created.push(fn.name);
  return fn.id;
}

function processFor(store, reference, createMissing, created) {
  const existing = store.find('process', reference, { required: false });
  if (existing) return existing;
  if (!createMissing) {
    throw new Error(`No process "${reference}" in the model. Create it first, or set createMissingProcesses.`);
  }
  const process = {
    id: store.newId(),
    name: String(reference).trim(),
    description: '',
    status: ENUMS.processStatus.Draft,
    input: '',
    output: '',
    tags: [],
    role: '',
    steps: [],
    apiCallIds: [],
    favorite: false,
    implementedBy: []
  };
  store.add('process', process);
  created.push(process.name);
  return process;
}

function nodeFor(byReference, reference) {
  const node = byReference.get(reference) || byReference.get(String(reference).toLowerCase());
  if (!node) {
    throw new Error(`"${reference}" is not one of the steps given.`);
  }
  return node;
}

function findJourneyNode(store, journey, reference) {
  const nodes = journey.layout.nodes || [];
  const wanted = String(reference).trim();

  const byId = nodes.find(node => node.id === wanted);
  if (byId) return byId;

  const process = store.find('process', wanted, { required: false });
  if (process) {
    const byProcess = nodes.find(node => node.processId === process.id);
    if (byProcess) return byProcess;
  }

  const byLabel = nodes.filter(node => (node.label || '').toLowerCase() === wanted.toLowerCase());
  if (byLabel.length === 1) return byLabel[0];
  if (byLabel.length > 1) throw new Error(`"${wanted}" is the label of more than one step. Use the step id.`);

  const known = nodes.map(node => node.label || node.id).join(', ');
  throw new Error(`"${wanted}" is not a step of "${journey.name}". Steps: ${known}.`);
}

function link(store, relation, source, target) {
  const addTo = (element, field, id) => {
    element[field] = element[field] || [];
    if (element[field].includes(id)) return false;
    element[field].push(id);
    return true;
  };

  switch (relation) {
    case 'journey-step': {
      const layout = source.layout || (source.layout = { nodes: [], edges: [], panX: 0, panY: 0, zoom: 1, expectations: [] });
      layout.nodes = layout.nodes || [];
      if (layout.nodes.some(node => node.processId === target.id)) return false;
      const previous = layout.nodes[layout.nodes.length - 1];
      const node = {
        id: localId('proc'),
        type: 'process',
        processId: target.id,
        label: target.name,
        x: previous ? previous.x + 200 : 80,
        y: previous ? previous.y : 160,
        width: 120,
        height: 60
      };
      layout.nodes.push(node);
      if (previous) {
        layout.edges = layout.edges || [];
        layout.edges.push({ id: localId('e'), from: previous.id, to: node.id });
      }
      return true;
    }
    case 'process-function':
      return addTo(source, 'apiCallIds', target.id);
    case 'process-subprocess': {
      if (source.id === target.id) throw new Error('A process cannot be a step of itself.');
      source.steps = source.steps || [];
      if (source.steps.some(step => step.processReference === target.id)) return false;
      source.steps.push({ processReference: target.id, apiCallReference: '', successors: [] });
      return true;
    }
    case 'process-role':
      if (String(source.role) === String(target.id)) return false;
      source.role = target.id;
      return true;
    case 'process-system':
    case 'function-system':
    case 'capability-system':
      return addTo(source, 'implementedBy', target.id);
    case 'function-capability':
      if (source.capabilityId === target.id) return false;
      source.capabilityId = target.id;
      return true;
    case 'function-input':
      return addDataReference(source, 'inputData', target.id);
    case 'function-output':
      return addDataReference(source, 'outputData', target.id);
    case 'capability-parent': {
      if (source.id === target.id) throw new Error('A capability cannot be its own parent.');
      if (isAncestor(store, source.id, target)) {
        throw new Error(`"${target.name}" sits under "${source.name}" already - that would close a circle.`);
      }
      detachFromParent(store, source, source.parentId);
      source.parentId = target.id;
      attachToParent(store, source);
      return true;
    }
    default:
      throw new Error(`Relation "${relation}" cannot be written.`);
  }
}

function unlink(store, relation, source, target) {
  const removeFrom = (element, field, id) => {
    const before = (element[field] || []).length;
    element[field] = (element[field] || []).filter(entry => entry !== id);
    return element[field].length !== before;
  };

  switch (relation) {
    case 'journey-step': {
      if (!source.layout) return false;
      const before = (source.layout.nodes || []).length;
      removeJourneyNodes(source, node => node.processId === target.id);
      return (source.layout.nodes || []).length !== before;
    }
    case 'process-function': {
      const changed = removeFrom(source, 'apiCallIds', target.id);
      const before = JSON.stringify(source.steps || []);
      source.steps = (source.steps || [])
        .filter(step => step.apiCallReference !== target.id)
        .map(step => ({
          ...step,
          successors: (step.successors || []).filter(successor => successor.apiCallReference !== target.id)
        }));
      return changed || JSON.stringify(source.steps) !== before;
    }
    case 'process-subprocess': {
      const before = (source.steps || []).length;
      source.steps = (source.steps || []).filter(step => step.processReference !== target.id);
      return (source.steps || []).length !== before;
    }
    case 'process-role':
      if (String(source.role) !== String(target.id)) return false;
      source.role = '';
      return true;
    case 'process-system':
    case 'function-system':
    case 'capability-system':
      return removeFrom(source, 'implementedBy', target.id);
    case 'function-capability':
      if (source.capabilityId !== target.id) return false;
      source.capabilityId = '';
      return true;
    case 'function-input':
    case 'function-output': {
      const field = relation === 'function-input' ? 'inputData' : 'outputData';
      const before = (source[field] || []).length;
      source[field] = (source[field] || []).filter(reference => reference.dataId !== target.id);
      return (source[field] || []).length !== before;
    }
    case 'capability-parent':
      if (source.parentId !== target.id) return false;
      detachFromParent(store, source, target.id);
      source.parentId = undefined;
      return true;
    default:
      throw new Error(`Relation "${relation}" cannot be written.`);
  }
}

function addDataReference(fn, field, dataId) {
  fn[field] = fn[field] || [];
  if (fn[field].some(reference => reference.dataId === dataId && !reference.itemId)) return false;
  fn[field].push({ dataId });
  return true;
}

function isAncestor(store, capabilityId, candidate) {
  let current = candidate;
  const seen = new Set();
  while (current && current.parentId && !seen.has(current.id)) {
    seen.add(current.id);
    if (current.parentId === capabilityId) return true;
    current = store.byId('capability', current.parentId);
  }
  return false;
}

export { RELATIONS };
