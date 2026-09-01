/** Small helpers shared by the tools */

/** A tool answer: readable JSON, which is what an assistant works with best */
export function result(data) {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

export const TYPE_ENUM = ['journey', 'process', 'capability', 'function', 'data', 'system', 'role', 'scenario'];

export const typeProperty = {
  type: 'string',
  description: 'The kind of element. "function" is what the app also calls an Api Call, "system" is an application.',
  enum: TYPE_ENUM
};

export function percent(value) {
  return Math.round((value || 0) * 100) + '%';
}

/** ids the app itself hands out for the parts of a journey layout */
export function localId(prefix) {
  return prefix + '_' + Math.random().toString(36).substring(2, 9);
}
