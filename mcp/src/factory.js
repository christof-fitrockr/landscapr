/**
 * Making an element that the app will recognise.
 *
 * Everything a kind of element carries by default lives in the schema, so a
 * process created here looks exactly like one created in the app - including the
 * fields nobody filled in yet, which the app expects to find.
 */
import { ENUMS, TYPES } from './schema.js';

/** Everything a new element of this kind starts out with */
export function defaultsOf(typeName) {
  const type = TYPES[typeName];
  const resolved = {};

  for (const [key, value] of Object.entries(type.defaults || {})) {
    resolved[key] = typeof value === 'function' ? value() : (Array.isArray(value) ? [...value] : value);
  }

  for (const field of type.fields) {
    if (field.default === undefined || resolved[field.name] !== undefined) continue;
    resolved[field.name] = field.kind === 'enum'
      ? ENUMS[field.enumName][field.default]
      : (Array.isArray(field.default) ? [...field.default] : field.default);
  }

  return resolved;
}

/** A new element, checked against the schema but not yet part of the model */
export function newElement(store, typeName, properties = {}) {
  const coerced = store.coerce(typeName, properties, { creating: true });
  return { id: store.newId(), ...defaultsOf(typeName), ...coerced };
}

/**
 * The element of that name, creating it when the model does not carry it yet.
 * This is what lets a description name something in passing - a system, a
 * function a step calls - without having to declare it twice.
 */
export function ensure(store, typeName, reference, properties = {}) {
  const existing = store.find(typeName, reference, { required: false });
  if (existing) {
    return { element: existing, created: false };
  }
  const element = newElement(store, typeName, { name: String(reference).trim(), ...properties });
  store.add(typeName, element);
  return { element, created: true };
}
