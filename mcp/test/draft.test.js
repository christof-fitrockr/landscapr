/**
 * Modelling from a description: the assistant reads what somebody wrote, decides
 * what the elements are, and hands the reading over in one call. These tests
 * check that what comes out is a connected model - and that running it again on
 * a model that has grown since does not damage it.
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
const modelPath = join(mkdtempSync(join(tmpdir(), 'landscapr-draft-')), 'model.json');

let client;

const call = async (name, args = {}) => {
  const response = await client.callTool({ name, arguments: args });
  const text = response.content.map(entry => entry.text).join('\n');
  if (response.isError) throw new Error(text);
  return JSON.parse(text);
};

const failing = async (name, args) => {
  const response = await client.callTool({ name, arguments: args });
  assert.equal(response.isError, true, `${name} should have refused this`);
  return response.content.map(entry => entry.text).join('\n');
};

const model = () => JSON.parse(readFileSync(modelPath, 'utf8'));
const named = (section, name) => model()[section].find(element => element.name === name);

/**
 * What an assistant would hand over after reading:
 *
 *   "A customer reports a complaint in the portal. Service checks it against the
 *    contract; if it is covered a credit note is raised in SAP, otherwise the
 *    customer is told why not. We do not have anything for the check yet -
 *    somebody reads the contract by hand."
 */
const complaint = {
  systems: [{ name: 'Service Portal', description: 'Where customers report complaints' }, { name: 'SAP' }],
  capabilities: [{ name: 'Handle Complaints', description: 'Take a complaint and settle it' }],
  data: [{ name: 'Complaint', group: 'Service', attributes: [{ name: 'reference' }, { name: 'raisedBy', type: 'Reference', references: 'Customer' }] }],
  functions: [
    { name: 'submitComplaint', status: 'Ready', systems: ['Service Portal'], capability: 'Handle Complaints', produces: ['Complaint'] },
    { name: 'raiseCreditNote', status: 'Planned', systems: ['SAP'], capability: 'Handle Complaints' }
  ],
  processes: [{
    name: 'Settle a complaint',
    description: 'From the complaint a customer reports to the credit note or the refusal',
    role: 'Service',
    steps: [
      { function: 'submitComplaint' },
      { function: 'checkAgainstContract', successors: [
        { label: 'covered', function: 'raiseCreditNote' },
        { label: 'not covered', function: 'explainRefusal' }
      ] }
    ]
  }],
  journeys: [{
    name: 'Complaint',
    description: 'What the customer goes through after something went wrong',
    steps: [{ process: 'Settle a complaint' }, { process: 'Receive the credit note' }]
  }]
};

describe('modelling from a description', () => {
  before(async () => {
    client = new Client({ name: 'test', version: '1.0.0' });
    await client.connect(new StdioClientTransport({
      command: process.execPath,
      args: [serverPath, '--file', modelPath]
    }));
    await call('landscapr_create', { type: 'role', elements: [{ name: 'Service' }] });
    await call('landscapr_create', { type: 'data', elements: [{ name: 'Customer' }] });
  });

  after(async () => {
    await client.close();
  });

  it('offers the draft tool and the prompts that lead to it', async () => {
    const { tools } = await client.listTools();
    assert.ok(tools.some(tool => tool.name === 'landscapr_draft'));

    const { prompts } = await client.listPrompts();
    assert.deepEqual(prompts.map(prompt => prompt.name), ['model_from_description', 'extend_from_description']);
    assert.ok(prompts[0].arguments.some(argument => argument.name === 'description' && argument.required));

    const prompt = await client.getPrompt({
      name: 'model_from_description',
      arguments: { description: 'A customer reports a complaint in the portal.', kind: 'process' }
    });
    const text = prompt.messages[0].content.text;
    assert.match(text, /A customer reports a complaint in the portal\./);
    assert.match(text, /landscapr_draft/);
    // it tells the assistant to look before it writes
    assert.match(text, /landscapr_search/);
  });

  it('says what it needs when a prompt is asked for without a description', async () => {
    await assert.rejects(() => client.getPrompt({ name: 'model_from_description', arguments: {} }), /description/);
  });

  it('shows what a draft would do without doing it', async () => {
    const preview = await call('landscapr_draft', { ...complaint, dryRun: true });
    assert.equal(preview.dryRun, true);
    assert.ok(preview.created.process.includes('Settle a complaint'));
    assert.equal(model().processes.length, 0);
    assert.equal(model().applications.length, 0);
  });

  it('turns the reading of a description into a connected model', async () => {
    const report = await call('landscapr_draft', complaint);

    assert.deepEqual(report.created.system, ['Service Portal', 'SAP']);
    assert.deepEqual(report.created.journey, ['Complaint']);
    // named in a step and in a journey, so created along the way
    assert.ok(report.created.function.includes('checkAgainstContract'));
    assert.ok(report.created.process.includes('Receive the credit note'));
    assert.ok(report.reused.data.includes('Customer'));

    const document = model();
    const process = document.processes.find(entry => entry.name === 'Settle a complaint');
    const submit = document.apiCalls.find(entry => entry.name === 'submitComplaint');
    const check = document.apiCalls.find(entry => entry.name === 'checkAgainstContract');
    const portal = document.applications.find(entry => entry.name === 'Service Portal');
    const journey = document.journeys[0];

    // the process runs the steps in the order the description told them
    assert.equal(process.steps.length, 2);
    assert.equal(process.steps[0].apiCallReference, submit.id);
    assert.equal(process.steps[1].apiCallReference, check.id);
    assert.equal(process.steps[1].successors.length, 2);
    assert.equal(process.steps[1].successors[0].edgeTitle, 'covered');
    assert.equal(process.role, document.roles.find(role => role.name === 'Service').id);

    // the function belongs to the system that provides it and to the capability it serves
    assert.deepEqual(submit.implementedBy, [portal.id]);
    assert.equal(submit.capabilityId, document.capabilities[0].id);
    assert.equal(submit.outputData[0].dataId, document.data.find(entry => entry.name === 'Complaint').id);
    // a status is stored as the number the app reads
    assert.equal(submit.implementationStatus, 3);

    // the journey step points at the process
    assert.equal(journey.layout.nodes.length, 2);
    assert.equal(journey.layout.nodes[0].processId, process.id);
    assert.equal(journey.layout.edges.length, 1);

    // the data object took its attributes and the reference resolved to the object it names
    const complaintData = document.data.find(entry => entry.name === 'Complaint');
    assert.equal(complaintData.items.length, 2);
    assert.equal(complaintData.items[1].dataId, document.data.find(entry => entry.name === 'Customer').id);
  });

  it('declares what nobody has built yet as a gap instead of inventing it', async () => {
    assert.equal(named('apiCalls', 'checkAgainstContract').implementationStatus, 0);

    const roadmap = await call('landscapr_gaps', { scope: 'roadmap' });
    const item = roadmap.openItems.find(entry => entry.name === 'checkAgainstContract');
    assert.ok(item, 'the missing check should be on the roadmap');
    assert.ok(item.wouldHelp.some(place => place.startsWith('Settle a complaint')));
  });

  it('reports how well supported what it just modelled is', async () => {
    const report = await call('landscapr_draft', {
      processes: [{ name: 'Settle a complaint' }],
      dryRun: true
    });
    assert.ok(report.support.withGap.includes('Settle a complaint'));
    assert.equal(report.support.processes, 1);
  });

  it('leaves the model alone when the same description is drafted again', async () => {
    const before = JSON.stringify(model());
    const report = await call('landscapr_draft', complaint);

    assert.equal(report.created, undefined);
    assert.ok(report.reused.process.includes('Settle a complaint'));
    assert.ok(report.leftAlone.some(entry => /keeps the 2 steps/.test(entry)));
    assert.equal(JSON.stringify(model()), before);
  });

  it('fills a blank but never overwrites what somebody wrote', async () => {
    await call('landscapr_update', {
      type: 'system',
      element: 'SAP',
      properties: { description: 'The one written by the architect' }
    });

    const report = await call('landscapr_draft', {
      systems: [{ name: 'SAP', description: 'Something an assistant made up', cluster: 'Backend', owner: 'Finance IT' }]
    });

    assert.equal(named('applications', 'SAP').description, 'The one written by the architect');
    assert.equal(named('applications', 'SAP').systemCluster, 'Backend');
    assert.ok(report.leftAlone.some(entry => /SAP.*keeps its description/.test(entry)));
    assert.ok(report.filledIn.some(entry => /SAP.*systemCluster/.test(entry)));
  });

  it('adds a system to a function that already has one instead of replacing it', async () => {
    await call('landscapr_draft', { functions: [{ name: 'raiseCreditNote', systems: ['Service Portal'] }] });
    assert.equal(named('apiCalls', 'raiseCreditNote').implementedBy.length, 2);
  });

  it('rewrites a flow only when it is asked to', async () => {
    const steps = [{ function: 'submitComplaint' }, { function: 'checkAgainstContract' }, { function: 'raiseCreditNote' }];

    await call('landscapr_draft', { processes: [{ name: 'Settle a complaint', steps }] });
    assert.equal(named('processes', 'Settle a complaint').steps.length, 2);

    const report = await call('landscapr_draft', {
      processes: [{ name: 'Settle a complaint', steps }],
      replaceFlows: true
    });
    assert.equal(named('processes', 'Settle a complaint').steps.length, 3);
    assert.ok(report.wrote.some(entry => /Settle a complaint.*3 steps/.test(entry)));
  });

  it('creates what a draft only names in passing', async () => {
    const report = await call('landscapr_draft', {
      processes: [{
        name: 'Send the credit note',
        role: 'Accounting',
        systems: ['Output Management'],
        steps: [{ function: 'printCreditNote' }]
      }]
    });

    // the role, the system and the function were never declared - the description named them
    assert.ok(report.created.role.includes('Accounting'));
    assert.ok(report.created.system.includes('Output Management'));
    assert.ok(report.declaredAsGap.includes('printCreditNote'));

    const process = named('processes', 'Send the credit note');
    assert.equal(process.role, named('roles', 'Accounting').id);
    assert.deepEqual(process.implementedBy, [named('applications', 'Output Management').id]);
  });

  it('takes a role with a colour when the description gives one', async () => {
    await call('landscapr_draft', {
      roles: [{ name: 'Workshop', color: '#ca6702', description: 'Does the work on the car' }],
      processes: [{ name: 'Repair the car', role: 'Workshop', steps: [{ function: 'logRepair' }] }]
    });
    assert.equal(named('roles', 'Workshop').color, '#ca6702');
    assert.equal(named('processes', 'Repair the car').role, named('roles', 'Workshop').id);
  });

  it('refuses a draft that says nothing, and says what to do instead', async () => {
    const message = await failing('landscapr_draft', {});
    assert.match(message, /describe_types|name at least one/);
  });

  it('refuses a field it does not know and lists the ones it does', async () => {
    const message = await failing('landscapr_draft', { processes: [{ name: 'X', actor: 'Service' }] });
    assert.match(message, /has no "actor"/);
    assert.match(message, /role/);
  });

  it('refuses a step that says nothing at all', async () => {
    const message = await failing('landscapr_draft', {
      processes: [{ name: 'Empty steps', steps: [{}] }],
      replaceFlows: true
    });
    assert.match(message, /Name the function it calls/);
  });

  it('holds the model together after everything it wrote', async () => {
    const report = await call('landscapr_validate');
    assert.equal(report.problems.filter(problem => problem.kind === 'danglingReference').length, 0);
    assert.equal(report.problems.filter(problem => problem.kind === 'duplicateName').length, 0);
  });
});
