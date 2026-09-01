/**
 * Drives the server the way an assistant does - over stdio, through the MCP
 * client - and checks that what ends up in the file is the document the app
 * reads back.
 */
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const serverPath = fileURLToPath(new URL('../src/index.js', import.meta.url));
const modelPath = join(mkdtempSync(join(tmpdir(), 'landscapr-mcp-')), 'model.json');

let client;

const call = async (name, args = {}) => {
  const response = await client.callTool({ name, arguments: args });
  const text = response.content.map(entry => entry.text).join('\n');
  if (response.isError) {
    throw new Error(text);
  }
  return JSON.parse(text);
};

const failing = async (name, args) => {
  const response = await client.callTool({ name, arguments: args });
  assert.equal(response.isError, true, `${name} should have refused this`);
  return response.content.map(entry => entry.text).join('\n');
};

const model = () => JSON.parse(readFileSync(modelPath, 'utf8'));

describe('the Landscapr MCP server', () => {
  before(async () => {
    client = new Client({ name: 'test', version: '1.0.0' });
    await client.connect(new StdioClientTransport({
      command: process.execPath,
      args: [serverPath, '--file', modelPath]
    }));
  });

  after(async () => {
    await client.close();
  });

  it('offers the modelling tools', async () => {
    const { tools } = await client.listTools();
    const names = tools.map(tool => tool.name);
    ['landscapr_overview', 'landscapr_describe_types', 'landscapr_create', 'landscapr_update', 'landscapr_delete',
      'landscapr_link', 'landscapr_unlink', 'landscapr_set_process_flow', 'landscapr_set_journey_flow',
      'landscapr_set_experience', 'landscapr_set_data_items', 'landscapr_gaps', 'landscapr_impact',
      'landscapr_validate', 'landscapr_save', 'landscapr_reload'].forEach(name =>
      assert.ok(names.includes(name), `${name} is missing`));
    tools.forEach(tool => assert.ok(tool.description && tool.inputSchema, `${tool.name} needs a description and a schema`));
  });

  it('describes every kind of element', async () => {
    const described = await call('landscapr_describe_types');
    assert.equal(described.types.length, 8);
    const fn = described.types.find(type => type.type === 'function');
    assert.deepEqual(fn.fields.find(field => field.name === 'implementationStatus').values,
      ['Gap', 'Planned', 'InDevelopment', 'Ready']);
  });

  it('starts from an empty model', async () => {
    const overview = await call('landscapr_overview');
    assert.equal(overview.counts.process, 0);
    assert.equal(overview.source.kind, 'file');
  });

  it('creates elements and writes the document the app reads', async () => {
    await call('landscapr_create', {
      type: 'system',
      elements: [{ name: 'CRM', description: 'Customer master' }, { name: 'Booking Engine' }]
    });
    await call('landscapr_create', {
      type: 'capability',
      elements: [{ name: 'Manage Customer', implementedBy: ['CRM'] }]
    });
    await call('landscapr_create', {
      type: 'capability',
      elements: [{ name: 'Identify Customer', parentId: 'Manage Customer' }]
    });
    await call('landscapr_create', {
      type: 'function',
      elements: [
        { name: 'getCustomer', implementationStatus: 'Ready', implementedBy: ['CRM'], capabilityId: 'Identify Customer' },
        { name: 'bookSlot', implementationStatus: 'Planned', implementedBy: ['Booking Engine'] }
      ]
    });
    await call('landscapr_create', { type: 'role', elements: [{ name: 'Customer', color: '#0d6efd' }] });

    const document = model();
    assert.equal(document.applications.length, 2);
    assert.equal(document.apiCalls.length, 2);
    // statuses are stored as the numbers the app uses, not as words
    assert.equal(document.apiCalls.find(fn => fn.name === 'bookSlot').implementationStatus, 1);
    assert.equal(document.capabilities.find(c => c.name === 'Manage Customer').childrenIds.length, 1);
    // every section the app expects is present, even the ones nothing was written to
    ['processes', 'apiCalls', 'capabilities', 'applications', 'journeys', 'data', 'roles', 'landscapeViews', 'scenarios']
      .forEach(section => assert.ok(Array.isArray(document[section]), `${section} is missing`));
  });

  it('refuses a field that is not in the model and says what is', async () => {
    const message = await failing('landscapr_create', { type: 'system', elements: [{ name: 'X', colour: 'blue' }] });
    assert.match(message, /has no field "colour"/);
    assert.match(message, /systemCluster/);
  });

  it('refuses a status it does not know', async () => {
    const message = await failing('landscapr_create',
      { type: 'function', elements: [{ name: 'y', implementationStatus: 'someday' }] });
    assert.match(message, /Gap, Planned, InDevelopment, Ready/);
  });

  it('refuses a link into nothing', async () => {
    const message = await failing('landscapr_link',
      { relation: 'function-system', from: 'getCustomer', to: 'Mainframe' });
    assert.match(message, /No system "Mainframe"/);
  });

  it('models data objects with their attributes', async () => {
    await call('landscapr_create', { type: 'data', elements: [{ name: 'Customer', group: 'Party' }] });
    const written = await call('landscapr_set_data_items', {
      data: 'Customer',
      items: [
        { name: 'id', primitiveType: 'String' },
        { name: 'email', primitiveType: 'String', description: 'Where we reach them' },
        { name: 'address', type: 'Reference', references: 'Address' }
      ]
    });
    assert.deepEqual(written.createdDataObjects, ['Address']);

    await call('landscapr_link', { relation: 'function-output', from: 'getCustomer', to: 'Customer' });
    const fn = model().apiCalls.find(entry => entry.name === 'getCustomer');
    assert.equal(fn.outputData.length, 1);
    assert.ok(fn.outputData[0].dataId);
  });

  it('names an attribute in a data reference', async () => {
    await call('landscapr_update', { type: 'function', element: 'getCustomer', properties: { inputData: ['Customer.email'] } });
    const fn = model().apiCalls.find(entry => entry.name === 'getCustomer');
    const data = model().data.find(entry => entry.name === 'Customer');
    assert.equal(fn.inputData[0].dataId, data.id);
    assert.equal(fn.inputData[0].itemId, data.items.find(item => item.name === 'email').id);
  });

  it('writes the flow of a process', async () => {
    await call('landscapr_create', {
      type: 'process',
      elements: [{ name: 'Book an appointment', role: 'Customer', status: 'Validated' }]
    });
    const flow = await call('landscapr_set_process_flow', {
      process: 'Book an appointment',
      steps: [
        { function: 'getCustomer' },
        { function: 'bookSlot', successors: [{ label: 'no slot free', function: 'offerAlternative' }] }
      ],
      createMissingFunctions: true
    });
    assert.deepEqual(flow.createdFunctions, ['offerAlternative']);

    const process = model().processes[0];
    assert.equal(process.steps.length, 2);
    assert.equal(process.steps[1].successors[0].edgeTitle, 'no slot free');
    // what the steps call is what the process uses
    assert.equal(process.apiCallIds.length, 3);
    // the role is stored as the id of the role, the way the app reads it
    assert.equal(process.role, model().roles[0].id);
  });

  it('drops the functions the old flow brought along when the flow is rewritten', async () => {
    await call('landscapr_set_process_flow', {
      process: 'Book an appointment',
      steps: [{ function: 'getCustomer' }, { function: 'bookSlot' }]
    });
    const process = model().processes[0];
    assert.equal(process.steps.length, 2);
    // offerAlternative was only reachable through the branch that is gone now
    assert.deepEqual(process.apiCallIds.length, 2);

    // put the flow back, the rest of the tests read it
    await call('landscapr_set_process_flow', {
      process: 'Book an appointment',
      steps: [
        { function: 'getCustomer' },
        { function: 'bookSlot', successors: [{ label: 'no slot free', function: 'offerAlternative' }] }
      ]
    });
    assert.equal(model().processes[0].apiCallIds.length, 3);
  });

  it('writes a journey and creates the processes its steps name', async () => {
    await call('landscapr_create', { type: 'journey', elements: [{ name: 'Service appointment' }] });
    const flow = await call('landscapr_set_journey_flow', {
      journey: 'Service appointment',
      steps: [
        { process: 'Book an appointment' },
        { process: 'Bring the car in' },
        { kind: 'decision', label: 'repair needed?' }
      ]
    });
    assert.deepEqual(flow.createdProcesses, ['Bring the car in']);

    const journey = model().journeys[0];
    assert.equal(journey.layout.nodes.length, 3);
    assert.equal(journey.layout.edges.length, 2);
    const first = journey.layout.nodes[0];
    assert.equal(first.type, 'process');
    assert.equal(first.width, 120);
    assert.equal(first.height, 60);
    assert.equal(journey.layout.zoom, 1);
  });

  it('records what the customer expects and what they get', async () => {
    const written = await call('landscapr_set_experience', {
      journey: 'Service appointment',
      step: 'Book an appointment',
      expectations: [{
        title: 'A slot within a week',
        expectation: 'I get an appointment when it suits me',
        outcome: 'The next free slot is in three weeks',
        fulfilment: 'missed',
        metric: 'Days to first free slot',
        target: '7',
        actual: '21'
      }]
    });
    assert.equal(written.expectations, 1);

    const journey = model().journeys[0];
    assert.equal(journey.layout.showExperienceLayer, true);
    assert.equal(journey.layout.expectations[0].fulfilment, 'missed');
    assert.equal(journey.layout.expectations[0].nodeId, journey.layout.nodes[0].id);
  });

  it('reads an element back with its links in words', async () => {
    const read = await call('landscapr_get', { type: 'function', element: 'getCustomer' });
    assert.equal(read.element.implementationStatus, 'Ready');
    assert.deepEqual(read.element.implementedBy, ['CRM']);
    assert.equal(read.element.capabilityId, 'Identify Customer');
    assert.ok(read.usedBy.some(entry => entry.name === 'Book an appointment'));
  });

  it('answers what breaks if a system is retired', async () => {
    const impact = await call('landscapr_impact', { type: 'system', element: 'CRM', direction: 'up', depth: 4 });
    assert.ok(impact.byKind.function.some(entry => entry.name === 'getCustomer'));
    assert.ok(impact.byKind.process.some(entry => entry.name === 'Book an appointment'));
    assert.ok(impact.byKind.journey.some(entry => entry.name === 'Service appointment'));
  });

  it('reads the gap view the way the app does', async () => {
    const summary = await call('landscapr_gaps', { scope: 'summary' });
    // bookSlot is planned, offerAlternative was created as a declared gap,
    // and "Bring the car in" has nothing at all
    assert.equal(summary.totals.processes, 2);
    assert.equal(summary.totals.processesWithGap, 2);
    assert.equal(summary.totals.planned, 1);

    const roadmap = await call('landscapr_gaps', { scope: 'roadmap' });
    assert.ok(roadmap.openItems.some(item => item.name === 'offerAlternative' && item.inTheModel));
    assert.ok(roadmap.openItems.some(item => item.name === 'Bring the car in'));
  });

  it('takes a process out of the gap count when a person does it on purpose', async () => {
    await call('landscapr_update', {
      type: 'process',
      element: 'Bring the car in',
      properties: { supportPlan: { intent: 'manualByDesign', note: 'The customer drives the car themselves' } }
    });
    const summary = await call('landscapr_gaps', { scope: 'summary' });
    assert.equal(summary.totals.processesWithGap, 1);
    assert.equal(summary.totals.processesManual, 1);
  });

  it('reports what does not hold together', async () => {
    const report = await call('landscapr_validate');
    // every link points at something that exists, so nothing is broken yet
    assert.equal(report.healthy, true);
    assert.ok(report.notes.some(note => note.kind === 'processWithoutFlow'));
  });

  it('takes every reference with it when an element is deleted', async () => {
    const dry = await call('landscapr_delete', { type: 'system', element: 'CRM', dryRun: true });
    assert.ok(dry.wouldDetachFrom.some(entry => entry.name === 'getCustomer'));
    assert.ok(model().applications.some(system => system.name === 'CRM'));

    await call('landscapr_delete', { type: 'system', element: 'CRM' });
    const document = model();
    assert.ok(!document.applications.some(system => system.name === 'CRM'));
    assert.deepEqual(document.apiCalls.find(fn => fn.name === 'getCustomer').implementedBy, []);
    assert.deepEqual(document.capabilities.find(c => c.name === 'Manage Customer').implementedBy, []);
    const report = await call('landscapr_validate');
    // nothing points into the void afterwards, but getCustomer is now ready with nobody providing it
    assert.equal(report.problems.filter(problem => problem.kind === 'danglingReference').length, 0);
    assert.ok(report.problems.some(problem => problem.kind === 'functionWithoutSystem'));
  });

  it('unlinks without deleting', async () => {
    await call('landscapr_unlink', { relation: 'capability-parent', from: 'Identify Customer', to: 'Manage Customer' });
    const document = model();
    assert.equal(document.capabilities.find(c => c.name === 'Identify Customer').parentId, undefined);
    assert.deepEqual(document.capabilities.find(c => c.name === 'Manage Customer').childrenIds, []);
  });

  it('refuses a circle of capabilities', async () => {
    await call('landscapr_link', { relation: 'capability-parent', from: 'Identify Customer', to: 'Manage Customer' });
    const message = await failing('landscapr_link',
      { relation: 'capability-parent', from: 'Manage Customer', to: 'Identify Customer' });
    assert.match(message, /circle/);
  });

  it('finds elements across the whole model', async () => {
    const found = await call('landscapr_search', { text: 'customer' });
    assert.ok(found.total >= 3);
    assert.ok(found.hits.data || found.hits.capability);
  });
});

describe('a server that only reads', () => {
  let reader;

  before(async () => {
    reader = new Client({ name: 'test-reader', version: '1.0.0' });
    await reader.connect(new StdioClientTransport({
      command: process.execPath,
      args: [serverPath, '--file', modelPath, '--read-only']
    }));
  });

  after(async () => {
    await reader.close();
  });

  it('answers questions about the model', async () => {
    const response = await reader.callTool({ name: 'landscapr_overview', arguments: {} });
    const overview = JSON.parse(response.content[0].text);
    assert.equal(overview.source.writable, false);
    assert.ok(overview.counts.process > 0);
  });

  it('refuses to change anything', async () => {
    const response = await reader.callTool({
      name: 'landscapr_create',
      arguments: { type: 'system', elements: [{ name: 'Shadow IT' }] }
    });
    assert.equal(response.isError, true);
    assert.match(response.content[0].text, /read only/);
    assert.ok(!model().applications.some(system => system.name === 'Shadow IT'));
  });

  it('hands the model out as resources', async () => {
    const { resources } = await reader.listResources();
    assert.ok(resources.some(resource => resource.uri === 'landscapr://model'));
    assert.ok(resources.some(resource => resource.uri === 'landscapr://processes'));

    const whole = await reader.readResource({ uri: 'landscapr://model' });
    assert.ok(JSON.parse(whole.contents[0].text).apiCalls.length > 0);

    const processes = await reader.readResource({ uri: 'landscapr://processes' });
    const read = JSON.parse(processes.contents[0].text);
    // a resource speaks the words a reader knows, not the numbers the file holds
    assert.equal(read[0].status, 'Validated');
    assert.equal(read[0].role, 'Customer');
  });
});
