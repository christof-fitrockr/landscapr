/**
 * From a description to a model.
 *
 * Somebody describes how something works - a process, a journey a customer
 * walks, the functions behind it - and this turns that reading into elements
 * that are connected the way the model expects: a journey step points at a
 * process, a process step calls a function or a subprocess, a function belongs
 * to a system and serves a capability.
 *
 * Two rules make it safe to use on a model that already exists:
 * an element of that name is reused rather than created twice, and nothing that
 * is already filled in is overwritten - a draft fills the blanks and reports
 * what it left alone.
 */
import { gapReport } from '../gaps.js';
import { ensure, newElement } from '../factory.js';
import { ENUMS, TYPES } from '../schema.js';
import { ModelStore } from '../store.js';
import { localId, percent, result } from '../tool-helpers.js';

/** Friendly names in a draft, and the field of the model each one writes */
const ALIASES = {
  role: {},
  system: { cluster: 'systemCluster', owner: 'contact' },
  capability: { parent: 'parentId', systems: 'implementedBy', implementedBy: 'implementedBy' },
  function: {
    status: 'implementationStatus',
    kind: 'apiType',
    capability: 'capabilityId',
    systems: 'implementedBy',
    consumes: 'inputData',
    produces: 'outputData'
  },
  process: { systems: 'implementedBy', functions: 'apiCallIds' },
  journey: {},
  data: { state: 'state' }
};

/** What a draft may say about an element, beside the parts that have their own shape */
const DRAFT_FIELDS = {
  role: ['name', 'description', 'color'],
  system: ['name', 'description', 'contact', 'owner', 'url', 'systemCluster', 'cluster', 'tags', 'status'],
  capability: ['name', 'description', 'parent', 'parentId', 'systems', 'implementedBy', 'tags', 'status'],
  data: ['name', 'description', 'group', 'link', 'state', 'jiraTicket'],
  function: ['name', 'description', 'status', 'implementationStatus', 'kind', 'apiType', 'capability', 'capabilityId',
    'systems', 'implementedBy', 'consumes', 'inputData', 'produces', 'outputData', 'apiGroup', 'documentation',
    'input', 'output', 'tags', 'jiraTicket'],
  process: ['name', 'description', 'role', 'status', 'input', 'output', 'systems', 'implementedBy', 'tags',
    'supportPlan', 'jiraTicket'],
  journey: ['name', 'description', 'status', 'tags', 'jiraTicket']
};

const namedThing = (what, extra = {}) => ({
  type: 'object',
  properties: {
    name: { type: 'string', description: `Name of the ${what}` },
    description: { type: 'string', description: `What the ${what} is, in the words of the description you read` },
    ...extra
  },
  required: ['name']
});

export function draftTools(store) {
  return [
    {
      name: 'landscapr_draft',
      description:
        'Turns a description into model. Read what the user wrote - a process, a customer journey, an interface ' +
        'landscape - decide what the elements are, and hand the reading over in one call: systems, capabilities, ' +
        'data objects, functions, processes with their steps, journeys with their steps. Everything is linked up ' +
        'the way the model expects, anything named in passing is created, and an element that already exists is ' +
        'reused rather than duplicated - a draft fills blanks, it never overwrites what somebody has already ' +
        'written. A step whose function is not in the model yet becomes a declared gap, which is exactly what the ' +
        'gap view is there to show. Use dryRun to see what a draft would do before it does it.',
      inputSchema: {
        type: 'object',
        properties: {
          roles: {
            type: 'array',
            description: 'Who performs the processes - the swimlanes of the process views. A role a process names is created anyway; say it here to give it a description or a colour.',
            items: namedThing('role', {
              color: { type: 'string', description: 'Colour of the swimlane, a CSS colour like "#0d6efd"' }
            })
          },
          systems: {
            type: 'array',
            description: 'The applications the description mentions',
            items: namedThing('system', {
              cluster: { type: 'string', description: 'Cluster it belongs to' },
              owner: { type: 'string', description: 'Who owns it' },
              url: { type: 'string', description: 'Link to it' }
            })
          },
          capabilities: {
            type: 'array',
            description: 'What the business is able to do, independent of how',
            items: namedThing('capability', {
              parent: { type: 'string', description: 'The capability this one sits under' },
              systems: { type: 'array', description: 'Systems that implement it', items: { type: 'string' } }
            })
          },
          data: {
            type: 'array',
            description: 'The business objects that flow through it',
            items: namedThing('data object', {
              group: { type: 'string', description: 'Group it belongs to' },
              attributes: {
                type: 'array',
                description: 'What the object carries',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string', description: 'Name of the attribute' },
                    description: { type: 'string', description: 'What it holds' },
                    type: { type: 'string', description: 'Primitive by default', enum: Object.keys(ENUMS.dataItemType) },
                    primitiveType: { type: 'string', description: 'For a Primitive: String, Integer, Boolean, Date, ...' },
                    references: { type: 'string', description: 'For a Reference or SubObject: the data object it points at' }
                  },
                  required: ['name']
                }
              }
            })
          },
          functions: {
            type: 'array',
            description: 'The functions and API calls that execute the steps',
            items: namedThing('function', {
              status: {
                type: 'string',
                description: 'Ready when it exists and runs, InDevelopment or Planned when it is on its way, Gap when it is missing. Gap by default, because a description usually says what should happen, not what already does.',
                enum: Object.keys(ENUMS.implementationStatus)
              },
              kind: { type: 'string', description: 'System, Business, ThirdParty or Analytics', enum: Object.keys(ENUMS.apiType) },
              capability: { type: 'string', description: 'The capability it serves' },
              systems: { type: 'array', description: 'Systems that provide it', items: { type: 'string' } },
              consumes: { type: 'array', description: 'Data objects it takes in', items: { type: 'string' } },
              produces: { type: 'array', description: 'Data objects it hands back', items: { type: 'string' } },
              apiGroup: { type: 'string', description: 'Group it belongs to' },
              input: { type: 'string', description: 'What it takes, in words' },
              output: { type: 'string', description: 'What it returns, in words' }
            })
          },
          processes: {
            type: 'array',
            description: 'The workflows the organisation performs',
            items: namedThing('process', {
              role: { type: 'string', description: 'The role that carries it, e.g. "Customer" or "Service"' },
              input: { type: 'string', description: 'What it needs to start' },
              output: { type: 'string', description: 'What it delivers' },
              systems: { type: 'array', description: 'Systems that carry it', items: { type: 'string' } },
              steps: {
                type: 'array',
                description: 'What the process does, in the order it does it. One entry per step.',
                items: {
                  type: 'object',
                  properties: {
                    function: { type: 'string', description: 'The function this step calls. Name it even when it does not exist yet - it is then created as a declared gap.' },
                    subprocess: { type: 'string', description: 'The process this step hands over to, instead of a function' },
                    successors: {
                      type: 'array',
                      description: 'What can follow this step, e.g. the branches of a decision',
                      items: {
                        type: 'object',
                        properties: {
                          label: { type: 'string', description: 'The condition on the branch, e.g. "rejected"' },
                          function: { type: 'string', description: 'The function the branch calls' },
                          subprocess: { type: 'string', description: 'The process the branch hands over to' }
                        }
                      }
                    }
                  }
                }
              },
              supportPlan: {
                type: 'object',
                description: 'Say this when the description makes clear that a person does the work',
                properties: {
                  intent: { type: 'string', description: 'manualByDesign takes it out of the gap count on purpose', enum: Object.keys(ENUMS.supportIntent) },
                  note: { type: 'string', description: 'Why it is done by hand, or what is missing' },
                  priority: { type: 'string', enum: Object.keys(ENUMS.gapPriority), description: 'How urgent closing it is' },
                  horizon: { type: 'string', description: 'When it should be closed, e.g. "Q3 2027"' },
                  owner: { type: 'string', description: 'Who owns closing it' }
                }
              }
            })
          },
          journeys: {
            type: 'array',
            description: 'The paths a customer walks',
            items: namedThing('journey', {
              steps: {
                type: 'array',
                description: 'The steps of the journey, in the order the customer walks them',
                items: {
                  type: 'object',
                  properties: {
                    process: { type: 'string', description: 'The process behind this step. Created when it is not in the model yet.' },
                    decision: { type: 'string', description: 'Instead of a process: a branching point, with the question as its label' },
                    group: { type: 'string', description: 'Instead of a process: a box drawn around steps, with its label' },
                    id: { type: 'string', description: 'Id of the step, so a connection can refer to it. Given automatically when left out.' }
                  }
                }
              },
              connections: {
                type: 'array',
                description: 'How the steps follow each other. Left out means one after the other, in the order given.',
                items: {
                  type: 'object',
                  properties: {
                    from: { type: 'string', description: 'The step the arrow starts at, by step id or process name' },
                    to: { type: 'string', description: 'The step the arrow points at' },
                    label: { type: 'string', description: 'What the arrow says, e.g. "rejected"' }
                  },
                  required: ['from', 'to']
                }
              }
            })
          },
          replaceFlows: {
            type: 'boolean',
            description: 'Write the steps of a process or journey that already has some. Off by default, so a draft never throws away a flow somebody modelled by hand.'
          },
          dryRun: { type: 'boolean', description: 'Report what the draft would do and change nothing' }
        }
      },
      handler: async input => {
        if (!input.dryRun) store.assertWritable();

        const empty = ['roles', 'systems', 'capabilities', 'data', 'functions', 'processes', 'journeys']
          .every(section => !(input[section] || []).length);
        if (empty) {
          throw new Error('The draft is empty. Read the description, decide what the elements are, and name at least ' +
            'one process, journey or function. landscapr_describe_types says what each kind carries.');
        }

        const target = input.dryRun ? preview(store) : store;
        const report = apply(target, input);

        if (!input.dryRun) {
          await store.touched();
        }

        return result({
          ...(input.dryRun ? { dryRun: true, nothingChanged: true } : { unsavedChanges: store.dirty }),
          ...report
        });
      }
    }
  ];
}

// -----------------------------------------------------------------------------
// Applying a draft
// -----------------------------------------------------------------------------

function apply(store, input) {
  const log = new Log();

  (input.roles || []).forEach(draft => write(store, log, 'role', draft));
  (input.systems || []).forEach(draft => write(store, log, 'system', draft));
  (input.capabilities || []).forEach(draft => write(store, log, 'capability', draft, ['parent', 'parentId']));
  (input.data || []).forEach(draft => write(store, log, 'data', draft, ['attributes']));
  (input.capabilities || []).forEach(draft => {
    if (!draft.parent && !draft.parentId) return;
    const capability = store.find('capability', draft.name);
    if (capability.parentId) {
      log.kept(`Capability "${capability.name}" already sits under another one`);
      return;
    }
    const parent = log.found('capability', ensure(store, 'capability', draft.parent || draft.parentId));
    capability.parentId = parent.id;
    parent.childrenIds = parent.childrenIds || [];
    if (!parent.childrenIds.includes(capability.id)) parent.childrenIds.push(capability.id);
  });
  (input.data || []).forEach(draft => writeAttributes(store, log, draft));

  (input.functions || []).forEach(draft => write(store, log, 'function', draft, [], { implementationStatus: 'Gap' }));

  (input.processes || []).forEach(draft => write(store, log, 'process', draft, ['steps']));
  (input.processes || []).forEach(draft => writeProcessFlow(store, log, draft, input.replaceFlows === true));

  (input.journeys || []).forEach(draft => write(store, log, 'journey', draft, ['steps', 'connections']));
  (input.journeys || []).forEach(draft => writeJourneyFlow(store, log, draft, input.replaceFlows === true));

  return { ...log.report(), ...support(store, input) };
}

/** Creates or fills in one element, without ever overwriting what is already there */
function write(store, log, typeName, draft, ownShape = [], defaults = {}) {
  const properties = propertiesOf(typeName, draft, ownShape);
  ensureReferences(store, log, typeName, properties);
  const existing = store.find(typeName, draft.name, { required: false });

  if (!existing) {
    const element = newElement(store, typeName, { ...defaults, ...properties });
    store.add(typeName, element);
    log.created(typeName, element.name);
    return element;
  }

  log.reused(typeName, existing.name);

  for (const [field, value] of Object.entries(store.coerce(typeName, properties, { self: existing }))) {
    if (field === 'name') continue;
    if (isEmpty(value)) continue;

    if (Array.isArray(value)) {
      // a list grows, so a draft can add a system to a function that already has one
      const before = (existing[field] || []).length;
      existing[field] = mergeLists(existing[field], value);
      if (existing[field].length !== before) log.filled(typeName, existing.name, field);
      continue;
    }

    if (isEmpty(existing[field])) {
      existing[field] = value;
      log.filled(typeName, existing.name, field);
    } else if (JSON.stringify(existing[field]) !== JSON.stringify(value)) {
      log.kept(`${label(typeName)} "${existing.name}" keeps its ${field}`);
    }
  }

  return existing;
}

/** The fields of a draft, under the names the model stores them by */
function propertiesOf(typeName, draft, ownShape) {
  const allowed = DRAFT_FIELDS[typeName];
  const aliases = ALIASES[typeName] || {};
  const properties = {};

  for (const [key, value] of Object.entries(draft)) {
    if (ownShape.includes(key)) continue;
    if (!allowed.includes(key)) {
      throw new Error(`A ${typeName} in a draft has no "${key}". It can say: ${allowed.join(', ')}` +
        (ownShape.length ? `, and ${ownShape.join(', ')}.` : '.'));
    }
    if (value === undefined || value === null) continue;
    properties[aliases[key] || key] = value;
  }

  if (!String(properties.name || '').trim()) {
    throw new Error(`A ${typeName} in the draft has no name.`);
  }

  return properties;
}

/**
 * Anything a draft names in passing - the system behind a function, the role that
 * carries a process - is part of the description too, so it is created rather
 * than turned into an error.
 */
function ensureReferences(store, log, typeName, properties) {
  for (const field of TYPES[typeName].fields) {
    if (field.kind !== 'ref' && field.kind !== 'refList') continue;
    const value = properties[field.name];
    if (isEmpty(value)) continue;

    const entries = field.kind === 'ref' ? [value] : (Array.isArray(value) ? value : [value]);
    entries.forEach(entry => {
      const named = nameIn(entry);
      if (!named) return;
      if (store.find(field.refType, named, { required: false })) return;
      // a function nobody has built yet is exactly what a declared gap is for
      const defaults = field.refType === 'function' ? { implementationStatus: 'Gap' } : {};
      const found = ensure(store, field.refType, named, defaults);
      if (found.created && field.refType === 'function') log.declaredGap(found.element.name);
      log.found(field.refType, found);
    });
  }
}

/** The name inside a reference, which may be "Customer", "Customer.email" or an object */
function nameIn(entry) {
  if (entry && typeof entry === 'object') {
    return entry.dataId || entry.data || entry.name || null;
  }
  const text = String(entry || '').trim();
  if (!text) return null;
  const dot = text.indexOf('.');
  return dot > 0 ? text.slice(0, dot) : text;
}

function writeAttributes(store, log, draft) {
  if (!(draft.attributes || []).length) return;
  const data = store.find('data', draft.name);

  if ((data.items || []).length) {
    log.kept(`Data "${data.name}" keeps the attributes it has`);
    return;
  }

  data.items = draft.attributes.map(attribute => {
    const type = attribute.type || (attribute.references ? 'Reference' : 'Primitive');
    const item = {
      id: localId('item'),
      name: String(attribute.name).trim(),
      description: attribute.description || '',
      state: ENUMS.dataStatus.Draft,
      type
    };

    if (type === 'Primitive') {
      item.primitiveType = attribute.primitiveType || 'String';
      return item;
    }

    if (!attribute.references) {
      throw new Error(`Attribute "${item.name}" of "${data.name}" is a ${type} and has to say which data object it points at.`);
    }
    const found = ensure(store, 'data', attribute.references, { group: data.group || '' });
    if (found.created && type === 'SubObject') {
      found.element.isSubObject = true;
      found.element.parentId = data.id;
    }
    item.dataId = log.found('data', found).id;
    return item;
  });

  log.wrote(`Data "${data.name}"`, data.items.length + ' attributes');
}

function writeProcessFlow(store, log, draft, replace) {
  if (!(draft.steps || []).length) return;
  const process = store.find('process', draft.name);

  if ((process.steps || []).length && !replace) {
    log.kept(`Process "${process.name}" keeps the ${process.steps.length} steps it has - ask for replaceFlows to write them`);
    return;
  }

  const called = new Set();
  const functionOf = reference => {
    const found = ensure(store, 'function', reference, { implementationStatus: 'Gap' });
    if (found.created) log.declaredGap(found.element.name);
    const element = log.found('function', found);
    called.add(element.id);
    return element.id;
  };
  const subprocessOf = reference => log.found('process', ensure(store, 'process', reference)).id;

  process.steps = draft.steps.map((step, index) => {
    if (step.function && step.subprocess) {
      throw new Error(`Step ${index + 1} of "${process.name}" names both a function and a subprocess. A step does one or the other.`);
    }
    if (!step.function && !step.subprocess && !(step.successors || []).length) {
      throw new Error(`Step ${index + 1} of "${process.name}" says nothing. Name the function it calls - if there is none yet, ` +
        'name it anyway and it becomes a declared gap.');
    }
    return {
      processReference: step.subprocess ? subprocessOf(step.subprocess) : '',
      apiCallReference: step.function ? functionOf(step.function) : '',
      successors: (step.successors || []).map(successor => ({
        edgeTitle: successor.label || '',
        processReference: successor.subprocess ? subprocessOf(successor.subprocess) : '',
        apiCallReference: successor.function ? functionOf(successor.function) : ''
      }))
    };
  });

  process.apiCallIds = mergeLists(process.apiCallIds, Array.from(called));
  log.wrote(`Process "${process.name}"`, process.steps.length + ' steps');
}

function writeJourneyFlow(store, log, draft, replace) {
  if (!(draft.steps || []).length) return;
  const journey = store.find('journey', draft.name);
  const previous = journey.layout || { nodes: [], edges: [], panX: 0, panY: 0, zoom: 1 };

  if ((previous.nodes || []).length && !replace) {
    log.kept(`Journey "${journey.name}" keeps the ${previous.nodes.length} steps it has - ask for replaceFlows to write them`);
    return;
  }

  const nodes = draft.steps.map((step, index) => {
    const kind = step.process ? 'process' : (step.decision ? 'decision' : (step.group ? 'group' : null));
    if (!kind) {
      throw new Error(`Step ${index + 1} of "${journey.name}" names neither a process, a decision nor a group.`);
    }

    const size = kind === 'process' ? { width: 120, height: 60 }
      : kind === 'decision' ? { width: 24, height: 24 }
        : { width: 200, height: 120 };

    const node = {
      id: step.id || localId(kind === 'process' ? 'proc' : kind === 'decision' ? 'dec' : 'grp'),
      type: kind,
      x: 80 + index * 200,
      y: kind === 'decision' ? 178 : 160,
      ...size
    };

    if (kind === 'process') {
      const element = log.found('process', ensure(store, 'process', step.process));
      node.processId = element.id;
      node.label = element.name;
    } else {
      node.label = step.decision || step.group;
    }

    return node;
  });

  const byReference = new Map();
  nodes.forEach(node => {
    byReference.set(node.id, node);
    if (node.label) byReference.set(node.label.toLowerCase(), node);
  });

  const edges = (draft.connections || []).length
    ? draft.connections.map(connection => ({
      id: localId('e'),
      from: stepOf(byReference, connection.from, journey.name).id,
      to: stepOf(byReference, connection.to, journey.name).id,
      label: connection.label || undefined
    }))
    : nodes.slice(1).map((node, index) => ({ id: localId('e'), from: nodes[index].id, to: node.id }));

  journey.layout = {
    nodes,
    edges,
    panX: previous.panX || 0,
    panY: previous.panY || 0,
    zoom: previous.zoom || 1,
    expectations: previous.expectations || [],
    showExperienceLayer: previous.showExperienceLayer || false
  };

  log.wrote(`Journey "${journey.name}"`, nodes.length + ' steps');
}

function stepOf(byReference, reference, journeyName) {
  const node = byReference.get(reference) || byReference.get(String(reference).toLowerCase());
  if (!node) {
    throw new Error(`"${reference}" is not one of the steps of "${journeyName}".`);
  }
  return node;
}

/** How well supported the processes of this draft are, so the reader sees the gaps at once */
function support(store, input) {
  const names = new Set((input.processes || []).map(draft => draft.name.toLowerCase()));
  (input.journeys || []).forEach(journey =>
    (journey.steps || []).forEach(step => step.process && names.add(step.process.toLowerCase())));
  if (!names.size) return {};

  const drafted = gapReport(store).processes.filter(process => names.has(process.processName.toLowerCase()));
  if (!drafted.length) return {};

  const counted = drafted.reduce((sum, process) => sum + process.counted, 0);
  const live = drafted.reduce((sum, process) => sum + process.live, 0);
  const open = drafted.reduce((sum, process) => sum + process.open, 0);

  return {
    support: {
      processes: drafted.length,
      coverage: percent(counted ? live / counted : 1),
      open,
      withGap: drafted.filter(process => process.band === 'gap').map(process => process.processName)
    }
  };
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

/** What a draft did, in the words of somebody reading the result */
class Log {
  constructor() {
    this.createdByType = {};
    this.reusedByType = {};
    this.filledIn = [];
    this.left = [];
    this.written = [];
    this.gaps = [];
  }

  created(typeName, name) {
    this.remember(this.createdByType, typeName, name);
  }

  reused(typeName, name) {
    if ((this.createdByType[typeName] || []).includes(name)) return;
    this.remember(this.reusedByType, typeName, name);
  }

  /** What an element named in passing turned out to be: something new, or something that was there */
  found(typeName, { element, created }) {
    if (created) {
      this.created(typeName, element.name);
    } else {
      this.reused(typeName, element.name);
    }
    return element;
  }

  remember(where, typeName, name) {
    const list = where[typeName] = where[typeName] || [];
    if (!list.includes(name)) list.push(name);
  }

  filled(typeName, name, field) {
    this.filledIn.push(`${label(typeName)} "${name}": ${field}`);
  }

  kept(text) {
    this.left.push(text);
  }

  wrote(what, howMuch) {
    this.written.push(`${what}: ${howMuch}`);
  }

  declaredGap(name) {
    this.gaps.push(name);
  }

  report() {
    const report = {};
    if (Object.keys(this.createdByType).length) report.created = this.createdByType;
    if (Object.keys(this.reusedByType).length) report.reused = this.reusedByType;
    if (this.written.length) report.wrote = this.written;
    if (this.filledIn.length) report.filledIn = this.filledIn;
    if (this.left.length) report.leftAlone = this.left;
    if (this.gaps.length) report.declaredAsGap = this.gaps;
    return report;
  }
}

const LABELS = {
  system: 'System', capability: 'Capability', data: 'Data', function: 'Function',
  process: 'Process', journey: 'Journey', role: 'Role', scenario: 'Target picture'
};

function label(typeName) {
  return LABELS[typeName] || typeName;
}

function isEmpty(value) {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string') return !value.trim();
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

function mergeLists(existing, added) {
  const list = [...(existing || [])];
  added.forEach(entry => {
    const known = list.some(other => JSON.stringify(other) === JSON.stringify(entry));
    if (!known) list.push(entry);
  });
  return list;
}

/** A copy of the model to try a draft on, so dryRun really changes nothing */
function preview(store) {
  const scratch = new ModelStore({
    kind: 'preview',
    describe: () => ({ kind: 'preview' }),
    read: async () => ({ payload: null }),
    write: async () => ({})
  });
  scratch.model = JSON.parse(JSON.stringify(store.model));
  scratch.loaded = true;
  return scratch;
}
