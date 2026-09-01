/**
 * Every link the model holds, as one list of edges.
 *
 * The links live in the elements themselves - a step names a function, a
 * function names a system. Reading them into one graph is what makes the two
 * questions of an architecture answerable: what does this use, and who would
 * notice if it changed.
 */
import { TYPES } from './schema.js';

/** @typedef {{fromType: string, fromId: string, kind: string, toType: string, toId: string}} Edge */

export function edgesOf(store) {
  /** @type {Edge[]} */
  const edges = [];
  const push = (fromType, fromId, kind, toType, toId) => {
    if (fromId && toId) edges.push({ fromType, fromId, kind, toType, toId });
  };

  for (const journey of store.elements('journey')) {
    const nodes = (journey.layout && journey.layout.nodes) || [];
    const seen = new Set();
    nodes.forEach(node => {
      if (node.type === 'process' && node.processId && !seen.has(node.processId)) {
        seen.add(node.processId);
        push('journey', journey.id, 'journey-step', 'process', node.processId);
      }
    });
  }

  for (const process of store.elements('process')) {
    (process.steps || []).forEach(step => {
      const targets = [step, ...(step.successors || [])];
      targets.forEach(target => {
        if (target.processReference) push('process', process.id, 'sub-process', 'process', target.processReference);
        if (target.apiCallReference) push('process', process.id, 'process-function', 'function', target.apiCallReference);
      });
    });
    (process.apiCallIds || []).forEach(id => push('process', process.id, 'process-function', 'function', id));
    (process.implementedBy || []).forEach(id => push('process', process.id, 'implemented-by', 'system', id));
    if (process.role) push('process', process.id, 'performed-by', 'role', String(process.role));
  }

  for (const fn of store.elements('function')) {
    if (fn.capabilityId) push('function', fn.id, 'function-capability', 'capability', fn.capabilityId);
    (fn.implementedBy || []).forEach(id => push('function', fn.id, 'implemented-by', 'system', id));
    (fn.inputData || []).forEach(ref => push('function', fn.id, 'function-input', 'data', ref && ref.dataId));
    (fn.outputData || []).forEach(ref => push('function', fn.id, 'function-output', 'data', ref && ref.dataId));
  }

  for (const capability of store.elements('capability')) {
    if (capability.parentId) push('capability', capability.id, 'capability-parent', 'capability', capability.parentId);
    (capability.implementedBy || []).forEach(id => push('capability', capability.id, 'implemented-by', 'system', id));
  }

  for (const data of store.elements('data')) {
    (data.items || []).forEach(item => {
      if (item.dataId) push('data', data.id, 'data-reference', 'data', item.dataId);
    });
  }

  return edges;
}

const key = (type, id) => `${type}:${id}`;

/** What an element uses and who uses it, one step out */
export function neighboursOf(store, typeName, id, edges = edgesOf(store)) {
  const uses = edges.filter(edge => edge.fromType === typeName && edge.fromId === id);
  const usedBy = edges.filter(edge => edge.toType === typeName && edge.toId === id);
  return { uses, usedBy };
}

/**
 * Everything that would notice if this element changed, walked out to a given
 * depth. Direction 'up' follows who uses it, 'down' what it uses.
 */
export function reach(store, typeName, id, { depth = 3, direction = 'up' } = {}) {
  const edges = edgesOf(store);
  const seen = new Map([[key(typeName, id), 0]]);
  let frontier = [{ type: typeName, id }];

  for (let step = 1; step <= depth && frontier.length; step++) {
    const next = [];
    for (const node of frontier) {
      const matching = direction === 'up'
        ? edges.filter(edge => edge.toType === node.type && edge.toId === node.id)
        : edges.filter(edge => edge.fromType === node.type && edge.fromId === node.id);

      for (const edge of matching) {
        const other = direction === 'up'
          ? { type: edge.fromType, id: edge.fromId }
          : { type: edge.toType, id: edge.toId };
        const otherKey = key(other.type, other.id);
        if (seen.has(otherKey)) continue;
        seen.set(otherKey, step);
        next.push(other);
      }
    }
    frontier = next;
  }

  seen.delete(key(typeName, id));

  return Array.from(seen.entries()).map(([entry, distance]) => {
    const [type, entityId] = [entry.slice(0, entry.indexOf(':')), entry.slice(entry.indexOf(':') + 1)];
    const element = store.byId(type, entityId);
    return {
      type,
      id: entityId,
      name: element ? (element.name || '(unnamed)') : `unknown ${type}`,
      distance
    };
  }).sort((a, b) => a.distance - b.distance || a.type.localeCompare(b.type) || a.name.localeCompare(b.name));
}

/** Links that point at something the model does not carry */
export function danglingEdges(store) {
  return edgesOf(store)
    .filter(edge => !store.byId(edge.toType, edge.toId))
    .map(edge => {
      const from = store.byId(edge.fromType, edge.fromId);
      return {
        from: `${TYPES[edge.fromType].label} "${from ? from.name : edge.fromId}"`,
        fromId: edge.fromId,
        relation: edge.kind,
        missing: `${TYPES[edge.toType].label} ${edge.toId}`
      };
    });
}
