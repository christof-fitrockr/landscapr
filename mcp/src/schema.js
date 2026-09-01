/**
 * The contract of the Landscapr model, in one place.
 *
 * Every element type of the model is described here with the fields it carries,
 * how a value is written into the stored JSON and what a human readable value
 * for it looks like. The tools of this server are generated from this table, so
 * an assistant can learn the whole model from `landscapr_describe_types` and
 * never has to guess a field name or a status code.
 */

/** Status codes as the app stores them */
export const ENUMS = {
  processStatus: { Draft: 0, Validated: 1, ReviewNeeded: 2 },
  dataStatus: { Draft: 0, Validated: 1 },
  implementationStatus: { Gap: 0, Planned: 1, InDevelopment: 2, Ready: 3 },
  apiType: { System: 0, Business: 1, ThirdParty: 2, Analytics: 3 },
  scenarioStatus: { Draft: 0, Agreed: 1, Realised: 2 },
  supportIntent: { automate: 'automate', manualByDesign: 'manualByDesign' },
  gapPriority: { high: 'high', medium: 'medium', low: 'low' },
  fulfilment: { exceeded: 'exceeded', met: 'met', partly: 'partly', missed: 'missed', unknown: 'unknown' },
  dataItemType: { Primitive: 'Primitive', Reference: 'Reference', SubObject: 'SubObject' }
};

const str = (name, description, extra = {}) => ({ name, kind: 'string', description, ...extra });
const bool = (name, description) => ({ name, kind: 'boolean', description });
const tags = () => ({ name: 'tags', kind: 'stringList', description: 'Free tags, e.g. ["core", "customer facing"]', default: [] });
const jira = () => str('jiraTicket', 'Jira issues that carry the work on this element, e.g. "ABC-12, ABC-13"');
const enumField = (name, enumName, description, def) =>
  ({ name, kind: 'enum', enumName, description, default: def });
const ref = (name, type, description) => ({ name, kind: 'ref', refType: type, description });
const refList = (name, type, description) => ({ name, kind: 'refList', refType: type, description, default: [] });

/**
 * The element types. `section` is the key of the stored JSON document, so a
 * type maps one to one onto what the app reads back from the repository.
 */
export const TYPES = {
  journey: {
    section: 'journeys',
    label: 'Journey',
    aliases: ['journeys'],
    summary: 'The end to end path a customer takes. Its steps point at processes.',
    fields: [
      str('name', 'Name of the journey', { required: true }),
      str('description', 'What the journey covers, in business words'),
      enumField('status', 'dataStatus', 'Draft while it is being written, Validated once it is agreed', 'Draft'),
      tags(),
      jira()
    ],
    structural: {
      layout: 'The steps and connections of the journey. Use landscapr_set_journey_flow.',
      'layout.expectations': 'The experience layer. Use landscapr_set_experience.',
      comments: 'Comments written in the app.'
    },
    defaults: { items: [], connections: [] }
  },

  process: {
    section: 'processes',
    label: 'Process',
    aliases: ['processes'],
    summary: 'A workflow the organisation performs. Its steps call functions or subprocesses.',
    fields: [
      str('name', 'Name of the process', { required: true }),
      str('description', 'What the process does'),
      enumField('status', 'processStatus', 'Draft, Validated or ReviewNeeded', 'Draft'),
      str('input', 'What the process needs to start'),
      str('output', 'What the process delivers'),
      ref('role', 'role', 'The role that carries the process, by role name or id'),
      refList('apiCallIds', 'function', 'Functions this process uses, by function name or id'),
      refList('implementedBy', 'system', 'Systems that carry this process, by system name or id'),
      bool('favorite', 'Pinned on the dashboard'),
      tags(),
      jira(),
      {
        name: 'supportPlan',
        kind: 'object',
        description: 'What is meant to happen about missing functional support - this is what the gap view reports',
        fields: [
          enumField('intent', 'supportIntent', 'automate = a function should be built, manualByDesign = a person does this on purpose and it is not counted as a gap', 'automate'),
          str('note', 'What is missing and why it matters'),
          enumField('priority', 'gapPriority', 'high, medium or low'),
          str('horizon', 'When it should be closed, free text like "Q3 2027"'),
          str('owner', 'Who owns closing it')
        ]
      }
    ],
    structural: {
      steps: 'The flow of the process. Use landscapr_set_process_flow.',
      comments: 'Comments written in the app.'
    },
    defaults: { steps: [], apiCallIds: [], implementedBy: [], tags: [], favorite: false }
  },

  capability: {
    section: 'capabilities',
    label: 'Capability',
    aliases: ['capabilities'],
    summary: 'What the business is able to do, independent of how. Capabilities form a tree.',
    fields: [
      str('name', 'Name of the capability', { required: true }),
      str('description', 'What the business can do here'),
      ref('parentId', 'capability', 'Parent capability, by name or id. Leave empty for a top level capability'),
      refList('implementedBy', 'system', 'Systems that implement this capability, by system name or id'),
      enumField('status', 'dataStatus', 'Draft or Validated', 'Draft'),
      tags(),
      jira()
    ],
    structural: { childrenIds: 'Kept in step with parentId automatically.' },
    defaults: { implementedBy: [], tags: [] }
  },

  function: {
    section: 'apiCalls',
    label: 'Function',
    aliases: ['apiCall', 'apicall', 'api', 'apiCalls', 'functions'],
    summary: 'A concrete function or API call that executes a step. Provided by a system, consumes and produces data.',
    fields: [
      str('name', 'Name of the function', { required: true }),
      str('description', 'What the function does'),
      enumField('implementationStatus', 'implementationStatus',
        'Gap = it does not exist and is declared missing, Planned, InDevelopment, Ready = it is live. Drives the gap view', 'Ready'),
      enumField('apiType', 'apiType', 'System, Business, ThirdParty or Analytics', 'System'),
      ref('capabilityId', 'capability', 'The capability this function serves, by name or id'),
      refList('implementedBy', 'system', 'Systems that provide this function, by system name or id'),
      str('apiGroup', 'Group the function belongs to, used to cluster the API map'),
      str('documentation', 'Link to the documentation of the function'),
      str('input', 'What the function takes, in words'),
      str('output', 'What the function returns, in words'),
      refList('inputData', 'data', 'Data objects the function consumes, by name or id'),
      refList('outputData', 'data', 'Data objects the function produces, by name or id'),
      enumField('status', 'dataStatus', 'Draft or Validated', 'Draft'),
      tags(),
      jira()
    ],
    defaults: { implementedBy: [], inputData: [], outputData: [], tags: [] }
  },

  data: {
    section: 'data',
    label: 'Data',
    aliases: ['dataObject', 'dataObjects'],
    summary: 'A business object that flows through the landscape, with its attributes.',
    fields: [
      str('name', 'Name of the data object', { required: true }),
      str('description', 'What the object stands for'),
      str('group', 'Group the object belongs to, used to cluster the ER diagram'),
      enumField('state', 'dataStatus', 'Draft or Validated', 'Draft'),
      str('link', 'Link to the definition of the object'),
      jira()
    ],
    structural: { items: 'The attributes of the object. Use landscapr_set_data_items.' },
    defaults: { items: [] }
  },

  system: {
    section: 'applications',
    label: 'System',
    aliases: ['application', 'applications', 'systems', 'app'],
    summary: 'An application that provides functions and implements capabilities.',
    fields: [
      str('name', 'Name of the system', { required: true }),
      str('description', 'What the system is for'),
      str('contact', 'Who owns the system'),
      str('url', 'Link to the system'),
      str('systemCluster', 'Cluster the system belongs to, used to group the landscape'),
      enumField('status', 'dataStatus', 'Draft or Validated', 'Draft'),
      tags(),
      jira()
    ],
    defaults: { tags: [] }
  },

  role: {
    section: 'roles',
    label: 'Role',
    aliases: ['roles'],
    summary: 'Who performs a process. Roles are the swimlanes of the process views.',
    fields: [
      str('name', 'Name of the role', { required: true }),
      str('description', 'What the role does'),
      str('color', 'Colour of the swimlane, a CSS colour like "#0d6efd"')
    ],
    defaults: { color: 'var(--role-unassigned)' }
  },

  scenario: {
    section: 'scenarios',
    label: 'Target picture',
    aliases: ['scenarios', 'targetPicture'],
    summary: 'A planned state of the landscape, held as the difference to the model of today.',
    fields: [
      str('name', 'Name of the target picture', { required: true }),
      str('description', 'What the target picture is about'),
      str('targetDate', 'When it should be reality, free text like "Q3 2027"'),
      enumField('status', 'scenarioStatus', 'Draft, Agreed or Realised', 'Draft')
    ],
    structural: { changes: 'The planned changes, edited in the app on the landscape canvas.' },
    defaults: { changes: {}, createdAt: () => Date.now(), updatedAt: () => Date.now() }
  }
};

/** All sections of the stored model document, in the order the app writes them */
export const SECTIONS = [
  'processes', 'apiCalls', 'capabilities', 'applications',
  'journeys', 'data', 'roles', 'landscapeViews', 'scenarios'
];

export const TYPE_NAMES = Object.keys(TYPES);

const ALIAS_INDEX = (() => {
  const index = new Map();
  for (const [name, type] of Object.entries(TYPES)) {
    index.set(name.toLowerCase(), name);
    index.set(type.section.toLowerCase(), name);
    (type.aliases || []).forEach(alias => index.set(alias.toLowerCase(), name));
  }
  return index;
})();

/** Resolves 'apiCall', 'apiCalls' or 'function' to the one type name used here */
export function resolveTypeName(input) {
  const key = String(input || '').trim().toLowerCase();
  const name = ALIAS_INDEX.get(key);
  if (!name) {
    throw new Error(`Unknown element type "${input}". Known types: ${TYPE_NAMES.join(', ')}.`);
  }
  return name;
}

export function fieldNamed(typeName, fieldName) {
  return TYPES[typeName].fields.find(f => f.name === fieldName) || null;
}

/** Turns a stored enum value back into the word a reader expects */
export function enumLabel(enumName, value) {
  const table = ENUMS[enumName];
  if (!table) return value;
  const hit = Object.entries(table).find(([, stored]) => stored === value);
  return hit ? hit[0] : value;
}

/** Accepts 'Ready', 'ready' or 3 and stores what the app expects */
export function enumValue(enumName, input, fieldName) {
  const table = ENUMS[enumName];
  const words = Object.keys(table);
  if (input === null || input === undefined || input === '') return undefined;

  const direct = Object.entries(table).find(([word, stored]) =>
    word.toLowerCase() === String(input).toLowerCase() || stored === input || String(stored) === String(input));
  if (direct) return direct[1];

  throw new Error(`"${input}" is not a valid value for ${fieldName}. Allowed: ${words.join(', ')}.`);
}

/** The human readable contract of one type, for landscapr_describe_types */
export function describeType(typeName) {
  const type = TYPES[typeName];
  const describeField = field => {
    const entry = { name: field.name, type: field.kind, description: field.description };
    if (field.required) entry.required = true;
    if (field.kind === 'enum') entry.values = Object.keys(ENUMS[field.enumName]);
    if (field.kind === 'ref' || field.kind === 'refList') entry.references = field.refType;
    if (field.kind === 'object') entry.fields = field.fields.map(describeField);
    return entry;
  };

  return {
    type: typeName,
    label: type.label,
    storedIn: type.section,
    summary: type.summary,
    alsoKnownAs: type.aliases || [],
    fields: type.fields.map(describeField),
    editedWithOwnTool: type.structural || {}
  };
}
