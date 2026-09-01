/**
 * Reading and writing the elements of the model - the plain modelling verbs:
 * describe, list, get, create, update, delete.
 */
import { TYPES, TYPE_NAMES, describeType, resolveTypeName } from '../schema.js';
import { newElement } from '../factory.js';
import { neighboursOf } from '../relations.js';
import { result, typeProperty, TYPE_ENUM } from '../tool-helpers.js';

const referenceProperty = {
  type: 'string',
  description: 'The element, by name or by id. Names are matched without case, ids always win.'
};

export function elementTools(store) {
  return [
    {
      name: 'landscapr_describe_types',
      description:
        'The contract of the model: every kind of element, the fields it carries, the values a status field accepts ' +
        'and which parts are edited with their own tool. Read this before modelling something for the first time.',
      inputSchema: {
        type: 'object',
        properties: {
          type: { ...typeProperty, description: 'One kind of element. Leave it out to get all of them.' }
        }
      },
      handler: async ({ type }) => {
        const names = type ? [resolveTypeName(type)] : TYPE_NAMES;
        return result({
          model: 'A journey step points at a process, a process step calls a function or a subprocess, ' +
            'a function belongs to a system and consumes and produces data, and a system implements capabilities.',
          types: names.map(describeType)
        });
      }
    },

    {
      name: 'landscapr_list',
      description: 'Lists the elements of one kind, one line each. Use it to see what is already modelled before adding to it.',
      inputSchema: {
        type: 'object',
        properties: {
          type: typeProperty,
          search: { type: 'string', description: 'Only elements whose name or description contains this text' },
          limit: { type: 'integer', description: 'How many to return, 50 by default', minimum: 1, maximum: 500 },
          offset: { type: 'integer', description: 'Where to start, for paging through a long list', minimum: 0 }
        },
        required: ['type']
      },
      handler: async ({ type, search, limit = 50, offset = 0 }) => {
        const typeName = resolveTypeName(type);
        const needle = (search || '').trim().toLowerCase();
        const all = store.elements(typeName).filter(element => {
          if (!needle) return true;
          return `${element.name || ''} ${element.description || ''}`.toLowerCase().includes(needle);
        });

        return result({
          type: typeName,
          total: all.length,
          shown: Math.min(limit, Math.max(all.length - offset, 0)),
          elements: all.slice(offset, offset + limit).map(element => store.row(typeName, element))
        });
      }
    },

    {
      name: 'landscapr_get',
      description:
        'One element in full, with the links it holds resolved into names and with everything that points at it - ' +
        'the answer to "what does this use, and who would notice if it changed".',
      inputSchema: {
        type: 'object',
        properties: {
          type: typeProperty,
          element: referenceProperty
        },
        required: ['type', 'element']
      },
      handler: async ({ type, element }) => {
        const typeName = resolveTypeName(type);
        const found = store.find(typeName, element);
        const { uses, usedBy } = neighboursOf(store, typeName, found.id);

        const view = store.readable(typeName, found);
        const structural = {};

        if (typeName === 'process') {
          structural.steps = (found.steps || []).map((step, index) => describeStep(store, step, index));
        }
        if (typeName === 'journey') {
          structural.steps = journeySteps(store, found);
          structural.connections = ((found.layout && found.layout.edges) || []).map(edge => ({
            from: edge.from, to: edge.to, label: edge.label || undefined
          }));
          structural.expectations = ((found.layout && found.layout.expectations) || []).map(expectation => ({
            ...expectation,
            step: labelOfNode(found, expectation.nodeId)
          }));
        }
        if (typeName === 'data') {
          structural.attributes = (found.items || []).map(item => ({
            id: item.id,
            name: item.name,
            type: item.type,
            primitiveType: item.primitiveType || undefined,
            references: item.dataId ? store.nameOfReference('data', item.dataId) : undefined,
            description: item.description || undefined
          }));
        }
        if (typeName === 'scenario') {
          structural.plannedChanges = Object.entries(found.changes || {}).map(([nodeId, change]) => ({
            element: nodeId,
            state: change.state,
            note: change.note || undefined
          }));
        }

        return result({
          element: view,
          ...structural,
          usedBy: usedBy.map(edge => ({
            relation: edge.kind,
            type: edge.fromType,
            name: nameOf(store, edge.fromType, edge.fromId),
            id: edge.fromId
          })),
          uses: uses.map(edge => ({
            relation: edge.kind,
            type: edge.toType,
            name: nameOf(store, edge.toType, edge.toId),
            id: edge.toId
          }))
        });
      }
    },

    {
      name: 'landscapr_search',
      description: 'Looks for a text across every kind of element, so you can find something without knowing where it lives.',
      inputSchema: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'What to look for, matched in names, descriptions and tags' },
          types: {
            type: 'array',
            description: 'Only these kinds of element. All of them by default.',
            items: { type: 'string', enum: TYPE_ENUM }
          },
          limit: { type: 'integer', description: 'How many hits per kind, 10 by default', minimum: 1, maximum: 100 }
        },
        required: ['text']
      },
      handler: async ({ text, types, limit = 10 }) => {
        const needle = String(text).trim().toLowerCase();
        const names = (types && types.length ? types : TYPE_NAMES).map(resolveTypeName);
        const hits = {};
        let total = 0;

        for (const typeName of names) {
          const matching = store.elements(typeName).filter(element =>
            `${element.name || ''} ${element.description || ''} ${(element.tags || []).join(' ')}`
              .toLowerCase().includes(needle));
          if (!matching.length) continue;
          total += matching.length;
          hits[typeName] = matching.slice(0, limit).map(element => store.row(typeName, element));
        }

        return result({ text, total, hits });
      }
    },

    {
      name: 'landscapr_create',
      description:
        'Adds elements to the model. Give the fields by name - references may name the element they point at, ' +
        'e.g. implementedBy: ["CRM"]. Several elements of the same kind can be created in one call.',
      inputSchema: {
        type: 'object',
        properties: {
          type: typeProperty,
          elements: {
            type: 'array',
            description: 'The elements to create, each as an object of fields. See landscapr_describe_types.',
            items: { type: 'object', additionalProperties: true },
            minItems: 1
          }
        },
        required: ['type', 'elements']
      },
      handler: async ({ type, elements }) => {
        store.assertWritable();
        const typeName = resolveTypeName(type);
        const created = [];

        for (const properties of elements) {
          const element = newElement(store, typeName, properties);

          const clash = store.elements(typeName)
            .find(other => (other.name || '').toLowerCase() === (element.name || '').toLowerCase());
          if (clash) {
            throw new Error(`A ${typeName} called "${element.name}" already exists (${clash.id}). ` +
              'Update that one, or give this one a name of its own.');
          }

          store.add(typeName, element);
          if (typeName === 'capability' && element.parentId) {
            attachToParent(store, element);
          }
          created.push(store.row(typeName, element));
        }

        await store.touched();
        return result({ created: created.length, type: typeName, elements: created, unsavedChanges: store.dirty });
      }
    },

    {
      name: 'landscapr_update',
      description: 'Changes fields of one element. Only the fields you give are touched, everything else stays as it is.',
      inputSchema: {
        type: 'object',
        properties: {
          type: typeProperty,
          element: referenceProperty,
          properties: {
            type: 'object',
            description: 'The fields to change. See landscapr_describe_types for what a kind of element carries.',
            additionalProperties: true
          }
        },
        required: ['type', 'element', 'properties']
      },
      handler: async ({ type, element, properties }) => {
        store.assertWritable();
        const typeName = resolveTypeName(type);
        const found = store.find(typeName, element);
        const previousParent = typeName === 'capability' ? found.parentId : null;

        const coerced = store.coerce(typeName, properties, { self: found });
        Object.assign(found, coerced);

        if (typeName === 'capability' && previousParent !== found.parentId) {
          detachFromParent(store, found, previousParent);
          if (found.parentId) attachToParent(store, found);
        }
        if (typeName === 'scenario') {
          found.updatedAt = Date.now();
        }

        await store.touched();
        return result({ updated: store.readable(typeName, found), unsavedChanges: store.dirty });
      }
    },

    {
      name: 'landscapr_delete',
      description:
        'Removes an element and every reference to it, so the model never keeps a link into nothing. ' +
        'Ask for it with dryRun first to see what the removal would touch.',
      inputSchema: {
        type: 'object',
        properties: {
          type: typeProperty,
          element: referenceProperty,
          dryRun: { type: 'boolean', description: 'Only report what would be removed, change nothing' }
        },
        required: ['type', 'element']
      },
      handler: async ({ type, element, dryRun = false }) => {
        store.assertWritable();
        const typeName = resolveTypeName(type);
        const found = store.find(typeName, element);
        const { usedBy } = neighboursOf(store, typeName, found.id);

        const affected = usedBy.map(edge => ({
          relation: edge.kind,
          type: edge.fromType,
          name: nameOf(store, edge.fromType, edge.fromId)
        }));

        if (dryRun) {
          return result({
            wouldDelete: { type: typeName, id: found.id, name: found.name },
            wouldDetachFrom: affected
          });
        }

        detachEverywhere(store, typeName, found.id);
        store.remove(typeName, found.id);
        await store.touched();

        return result({
          deleted: { type: typeName, id: found.id, name: found.name },
          detachedFrom: affected,
          unsavedChanges: store.dirty
        });
      }
    }
  ];
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

export function nameOf(store, typeName, id) {
  const element = store.byId(typeName, id);
  return element ? (element.name || '(unnamed)') : `unknown ${typeName} (${id})`;
}

function describeStep(store, step, index) {
  const entry = { position: index + 1 };
  if (step.processReference) entry.subprocess = nameOf(store, 'process', step.processReference);
  if (step.apiCallReference) entry.function = nameOf(store, 'function', step.apiCallReference);
  if (!step.processReference && !step.apiCallReference) entry.empty = true;
  if (step.successors && step.successors.length) {
    entry.successors = step.successors.map(successor => ({
      label: successor.edgeTitle || undefined,
      subprocess: successor.processReference ? nameOf(store, 'process', successor.processReference) : undefined,
      function: successor.apiCallReference ? nameOf(store, 'function', successor.apiCallReference) : undefined
    }));
  }
  return entry;
}

function journeySteps(store, journey) {
  const nodes = (journey.layout && journey.layout.nodes) || [];
  return nodes.map(node => ({
    id: node.id,
    kind: node.type,
    label: node.type === 'process' && node.processId ? nameOf(store, 'process', node.processId) : (node.label || ''),
    process: node.processId || undefined,
    x: node.x,
    y: node.y
  }));
}

function labelOfNode(journey, nodeId) {
  const node = ((journey.layout && journey.layout.nodes) || []).find(entry => entry.id === nodeId);
  return node ? (node.label || node.id) : nodeId;
}

export function attachToParent(store, capability) {
  const parent = store.byId('capability', capability.parentId);
  if (!parent) return;
  parent.childrenIds = parent.childrenIds || [];
  if (!parent.childrenIds.includes(capability.id)) parent.childrenIds.push(capability.id);
}

export function detachFromParent(store, capability, parentId) {
  const parent = parentId ? store.byId('capability', parentId) : null;
  if (parent && parent.childrenIds) {
    parent.childrenIds = parent.childrenIds.filter(id => id !== capability.id);
  }
}

/** Takes every reference to an element out of the model */
export function detachEverywhere(store, typeName, id) {
  if (typeName === 'system') {
    ['process', 'function', 'capability'].forEach(owner => {
      store.elements(owner).forEach(element => {
        if (element.implementedBy) element.implementedBy = element.implementedBy.filter(entry => entry !== id);
      });
    });
  }

  if (typeName === 'function') {
    store.elements('process').forEach(process => {
      process.apiCallIds = (process.apiCallIds || []).filter(entry => entry !== id);
      (process.steps || []).forEach(step => {
        if (step.apiCallReference === id) step.apiCallReference = '';
        (step.successors || []).forEach(successor => {
          if (successor.apiCallReference === id) successor.apiCallReference = '';
        });
      });
      process.steps = (process.steps || []).filter(step =>
        step.processReference || step.apiCallReference || (step.successors || []).length);
    });
  }

  if (typeName === 'process') {
    store.elements('process').forEach(process => {
      (process.steps || []).forEach(step => {
        if (step.processReference === id) step.processReference = '';
        (step.successors || []).forEach(successor => {
          if (successor.processReference === id) successor.processReference = '';
        });
      });
      process.steps = (process.steps || []).filter(step =>
        step.processReference || step.apiCallReference || (step.successors || []).length);
    });
    store.elements('journey').forEach(journey => removeJourneyNodes(journey, node => node.processId === id));
  }

  if (typeName === 'capability') {
    store.elements('function').forEach(fn => {
      if (fn.capabilityId === id) fn.capabilityId = '';
    });
    const capability = store.byId('capability', id);
    if (capability) detachFromParent(store, capability, capability.parentId);
    store.elements('capability').forEach(child => {
      if (child.parentId === id) child.parentId = undefined;
    });
  }

  if (typeName === 'data') {
    store.elements('function').forEach(fn => {
      fn.inputData = (fn.inputData || []).filter(reference => reference.dataId !== id);
      fn.outputData = (fn.outputData || []).filter(reference => reference.dataId !== id);
    });
    store.elements('data').forEach(data => {
      data.items = (data.items || []).filter(item => item.dataId !== id);
    });
  }

  if (typeName === 'role') {
    store.elements('process').forEach(process => {
      if (String(process.role) === String(id)) process.role = '';
    });
  }
}

/** Drops nodes of a journey and the connections that hang off them */
export function removeJourneyNodes(journey, matches) {
  if (!journey.layout) return;
  const doomed = new Set((journey.layout.nodes || []).filter(matches).map(node => node.id));
  if (!doomed.size) return;
  journey.layout.nodes = (journey.layout.nodes || []).filter(node => !doomed.has(node.id));
  journey.layout.edges = (journey.layout.edges || []).filter(edge => !doomed.has(edge.from) && !doomed.has(edge.to));
  journey.layout.expectations = (journey.layout.expectations || []).filter(expectation => !doomed.has(expectation.nodeId));
}
