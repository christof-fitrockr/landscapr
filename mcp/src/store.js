/**
 * The model, held in memory while the assistant works on it.
 *
 * The store is the only place that touches the stored document: it reads it
 * through a backend, keeps every section of it intact, applies changes that
 * were checked against the schema, and writes it back the way the app expects
 * to find it.
 */
import { randomUUID } from 'node:crypto';

import {
  ENUMS, SECTIONS, TYPES, TYPE_NAMES,
  enumLabel, enumValue, fieldNamed, resolveTypeName
} from './schema.js';

const EMPTY_MODEL = () => SECTIONS.reduce((model, section) => ({ ...model, [section]: [] }), {});

export class ModelStore {
  /**
   * @param {{describe: Function, read: Function, write: Function}} backend
   * @param {{autosave?: boolean, readOnly?: boolean}} options
   */
  constructor(backend, options = {}) {
    this.backend = backend;
    this.autosave = options.autosave === true;
    this.readOnly = options.readOnly === true;
    this.model = EMPTY_MODEL();
    this.loaded = false;
    this.dirty = false;
    this.lastSave = null;
  }

  // ---------------------------------------------------------------------------
  // Reading and writing the document
  // ---------------------------------------------------------------------------

  async load() {
    const { payload } = await this.backend.read();
    this.model = this.normalise(payload);
    this.loaded = true;
    this.dirty = false;
    return this.model;
  }

  async ensureLoaded() {
    if (!this.loaded) {
      await this.load();
    }
  }

  /** Every section is an array, and anything the app writes that this server does not know is kept */
  normalise(payload) {
    const model = payload && typeof payload === 'object' ? { ...payload } : {};
    for (const section of SECTIONS) {
      const value = model[section];
      model[section] = Array.isArray(value) ? value : [];
    }
    return model;
  }

  describeSource() {
    return {
      ...this.backend.describe(),
      writable: !this.readOnly,
      autosave: this.autosave,
      unsavedChanges: this.dirty
    };
  }

  /** Called after every change: a file is written straight away, a repository waits for landscapr_save */
  async touched() {
    this.dirty = true;
    if (this.autosave && !this.readOnly) {
      await this.save();
    }
  }

  async save(options = {}) {
    if (this.readOnly) {
      throw new Error('This server runs read only. Start it without --read-only to change the model.');
    }
    const result = await this.backend.write(this.model, options);
    this.dirty = false;
    this.lastSave = { at: new Date().toISOString(), ...result };
    return this.lastSave;
  }

  assertWritable() {
    if (this.readOnly) {
      throw new Error('This server runs read only. Start it without --read-only to change the model.');
    }
  }

  // ---------------------------------------------------------------------------
  // Elements
  // ---------------------------------------------------------------------------

  elements(typeInput) {
    const typeName = resolveTypeName(typeInput);
    return this.model[TYPES[typeName].section];
  }

  counts() {
    const counts = {};
    for (const name of TYPE_NAMES) {
      counts[name] = this.model[TYPES[name].section].length;
    }
    return counts;
  }

  byId(typeInput, id) {
    return this.elements(typeInput).find(element => element.id === id) || null;
  }

  /**
   * Finds an element by id or by name. Names are how a person - and an
   * assistant - talks about the model, so they are accepted everywhere an id is.
   */
  find(typeInput, reference, { required = true } = {}) {
    const typeName = resolveTypeName(typeInput);
    const wanted = String(reference ?? '').trim();
    if (!wanted) {
      if (required) throw new Error(`No ${typeName} given.`);
      return null;
    }

    const elements = this.elements(typeName);
    const byId = elements.find(element => element.id === wanted);
    if (byId) return byId;

    const byName = elements.filter(element => (element.name || '').toLowerCase() === wanted.toLowerCase());
    if (byName.length === 1) return byName[0];
    if (byName.length > 1) {
      const ids = byName.map(element => `${element.name} (${element.id})`).join(', ');
      throw new Error(`More than one ${typeName} is called "${wanted}": ${ids}. Use the id.`);
    }

    if (!required) return null;
    const near = this.suggest(typeName, wanted);
    throw new Error(`No ${typeName} "${wanted}" in the model.${near ? ` Did you mean ${near}?` : ''}`);
  }

  suggest(typeName, wanted) {
    const needle = wanted.toLowerCase();
    const hits = this.elements(typeName)
      .filter(element => (element.name || '').toLowerCase().includes(needle) || needle.includes((element.name || '').toLowerCase()))
      .slice(0, 3)
      .map(element => `"${element.name}"`);
    return hits.length ? hits.join(', ') : '';
  }

  add(typeInput, element) {
    this.elements(typeInput).push(element);
    return element;
  }

  remove(typeInput, id) {
    const elements = this.elements(typeInput);
    const index = elements.findIndex(element => element.id === id);
    if (index < 0) return null;
    return elements.splice(index, 1)[0];
  }

  newId() {
    return randomUUID();
  }

  // ---------------------------------------------------------------------------
  // Turning what the assistant wrote into what the app stores
  // ---------------------------------------------------------------------------

  /**
   * Checks a set of properties against the schema of a type and resolves every
   * name it mentions into the id the model stores.
   *
   * @param {string} typeInput
   * @param {object} properties
   * @param {{creating?: boolean, self?: object}} options
   */
  coerce(typeInput, properties, { creating = false, self = null } = {}) {
    const typeName = resolveTypeName(typeInput);
    const type = TYPES[typeName];
    const result = {};

    for (const [key, raw] of Object.entries(properties || {})) {
      const field = fieldNamed(typeName, key);
      if (!field) {
        if (type.structural && type.structural[key]) {
          throw new Error(`"${key}" of a ${typeName} is not edited here: ${type.structural[key]}`);
        }
        if (key === 'id') {
          throw new Error('The id is given by the model and cannot be set.');
        }
        const allowed = type.fields.map(f => f.name).join(', ');
        throw new Error(`A ${typeName} has no field "${key}". Fields: ${allowed}.`);
      }
      const value = this.coerceField(typeName, field, raw, self);
      if (value !== undefined) {
        result[key] = value;
      } else {
        result[key] = this.emptyValueFor(field);
      }
    }

    if (creating) {
      for (const field of type.fields) {
        if (field.required && !String(result[field.name] ?? '').trim()) {
          throw new Error(`A ${typeName} needs a ${field.name}.`);
        }
      }
    }

    return result;
  }

  emptyValueFor(field) {
    if (field.kind === 'stringList' || field.kind === 'refList') return [];
    if (field.kind === 'boolean') return false;
    return '';
  }

  coerceField(typeName, field, raw, self) {
    const label = `${typeName}.${field.name}`;

    if (raw === null || raw === undefined) return undefined;

    switch (field.kind) {
      case 'string':
        return String(raw);

      case 'boolean':
        if (typeof raw === 'boolean') return raw;
        return ['true', 'yes', '1'].includes(String(raw).toLowerCase());

      case 'stringList':
        return this.asList(raw).map(entry => String(entry).trim()).filter(Boolean);

      case 'enum':
        return enumValue(field.enumName, raw, label);

      case 'ref': {
        const reference = String(raw).trim();
        if (!reference) return '';
        const target = this.find(field.refType, reference);
        if (self && target.id === self.id && field.name === 'parentId') {
          throw new Error(`A ${typeName} cannot be its own parent.`);
        }
        return target.id;
      }

      case 'refList':
        return this.asList(raw).map(entry => this.coerceReference(field, entry, label));

      case 'object': {
        if (typeof raw !== 'object' || Array.isArray(raw)) {
          throw new Error(`${label} is an object, not ${typeof raw}.`);
        }
        const nested = {};
        for (const [key, value] of Object.entries(raw)) {
          const sub = field.fields.find(f => f.name === key);
          if (!sub) {
            throw new Error(`${label} has no field "${key}". Fields: ${field.fields.map(f => f.name).join(', ')}.`);
          }
          const coerced = this.coerceField(typeName, sub, value, self);
          if (coerced !== undefined) nested[key] = coerced;
        }
        return nested;
      }

      default:
        return raw;
    }
  }

  /**
   * One entry of a reference list. Data references may name an attribute too,
   * either as "Customer.email" or as {data: 'Customer', item: 'email'}.
   */
  coerceReference(field, entry, label) {
    if (field.refType !== 'data') {
      const value = typeof entry === 'object' ? (entry.id || entry.name) : entry;
      return this.find(field.refType, value).id;
    }

    let dataRef;
    let itemRef;

    if (entry && typeof entry === 'object') {
      dataRef = entry.dataId || entry.data || entry.name;
      itemRef = entry.itemId || entry.item;
    } else {
      const text = String(entry);
      const dot = text.indexOf('.');
      const isId = this.byId('data', text);
      if (dot > 0 && !isId) {
        dataRef = text.slice(0, dot);
        itemRef = text.slice(dot + 1);
      } else {
        dataRef = text;
      }
    }

    const data = this.find('data', dataRef);
    const reference = { dataId: data.id };

    if (itemRef) {
      const items = data.items || [];
      const item = items.find(i => i.id === itemRef || (i.name || '').toLowerCase() === String(itemRef).toLowerCase());
      if (!item) {
        throw new Error(`"${data.name}" has no attribute "${itemRef}" (${label}).`);
      }
      reference.itemId = item.id;
    }

    return reference;
  }

  asList(raw) {
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') {
      return raw.split(',').map(entry => entry.trim()).filter(Boolean);
    }
    return [raw];
  }

  // ---------------------------------------------------------------------------
  // Turning what is stored into what a reader understands
  // ---------------------------------------------------------------------------

  /** The element with its ids replaced by the names they stand for */
  readable(typeInput, element) {
    const typeName = resolveTypeName(typeInput);
    const view = { id: element.id, type: typeName };

    for (const field of TYPES[typeName].fields) {
      const value = element[field.name];
      if (value === undefined || value === null || value === '' ||
          (Array.isArray(value) && value.length === 0)) {
        continue;
      }

      switch (field.kind) {
        case 'enum':
          view[field.name] = enumLabel(field.enumName, value);
          break;
        case 'ref': {
          const target = this.byId(field.refType, value);
          view[field.name] = target ? target.name : value;
          if (!target) view[`${field.name}_missing`] = value;
          break;
        }
        case 'refList':
          view[field.name] = (value || []).map(entry => this.nameOfReference(field.refType, entry));
          break;
        case 'object': {
          const nested = {};
          for (const sub of field.fields) {
            const subValue = value[sub.name];
            if (subValue === undefined || subValue === null || subValue === '') continue;
            nested[sub.name] = sub.kind === 'enum' ? enumLabel(sub.enumName, subValue) : subValue;
          }
          if (Object.keys(nested).length) view[field.name] = nested;
          break;
        }
        default:
          view[field.name] = value;
      }
    }

    return view;
  }

  nameOfReference(refType, entry) {
    if (refType === 'data') {
      const dataId = entry && typeof entry === 'object' ? entry.dataId : entry;
      const data = this.byId('data', dataId);
      const name = data ? data.name : `unknown data (${dataId})`;
      const itemId = entry && typeof entry === 'object' ? entry.itemId : null;
      if (itemId && data) {
        const item = (data.items || []).find(i => i.id === itemId);
        return item ? `${name}.${item.name}` : name;
      }
      return name;
    }
    const target = this.byId(refType, entry);
    return target ? target.name : `unknown ${refType} (${entry})`;
  }

  /** A one line view of an element, for lists */
  row(typeInput, element) {
    const typeName = resolveTypeName(typeInput);
    const row = { id: element.id, name: element.name || '(unnamed)' };

    if (typeName === 'process') {
      const role = this.byId('role', String(element.role));
      row.role = role ? role.name : undefined;
      row.steps = (element.steps || []).length;
      row.functions = (element.apiCallIds || []).length;
    }
    if (typeName === 'function') {
      row.status = enumLabel('implementationStatus', element.implementationStatus ?? ENUMS.implementationStatus.Ready);
      row.systems = (element.implementedBy || []).map(id => this.nameOfReference('system', id));
      const capability = element.capabilityId ? this.byId('capability', element.capabilityId) : null;
      row.capability = capability ? capability.name : undefined;
    }
    if (typeName === 'capability') {
      const parent = element.parentId ? this.byId('capability', element.parentId) : null;
      row.parent = parent ? parent.name : undefined;
      row.systems = (element.implementedBy || []).map(id => this.nameOfReference('system', id));
    }
    if (typeName === 'journey') {
      row.steps = ((element.layout && element.layout.nodes) || []).filter(node => node.type === 'process').length;
      row.expectations = ((element.layout && element.layout.expectations) || []).length;
    }
    if (typeName === 'data') {
      row.group = element.group || undefined;
      row.attributes = (element.items || []).length;
    }
    if (typeName === 'system') {
      row.cluster = element.systemCluster || undefined;
    }
    if (typeName === 'scenario') {
      row.status = enumLabel('scenarioStatus', element.status ?? 0);
      row.changes = Object.keys(element.changes || {}).length;
    }

    Object.keys(row).forEach(key => row[key] === undefined && delete row[key]);
    return row;
  }
}
