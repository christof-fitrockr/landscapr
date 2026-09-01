#!/usr/bin/env node
/**
 * The Landscapr MCP server.
 *
 * It puts the model an architect works on in the app in front of an AI
 * assistant: the same journeys, processes, capabilities, functions, data
 * objects, systems, roles and target pictures, in the same JSON file, with the
 * same rules about what may point at what.
 *
 * The assistant reads the model, adds to it and links it up; the app reads the
 * result back out of the repository. Neither side owns the model - the file does.
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema
} from '@modelcontextprotocol/sdk/types.js';

import { buildConfig } from './config.js';
import { ModelStore } from './store.js';
import { TYPES, TYPE_NAMES } from './schema.js';
import { getPrompt, listPrompts } from './prompts.js';
import { draftTools } from './tools/draft.js';
import { elementTools } from './tools/elements.js';
import { structureTools } from './tools/structure.js';
import { analysisTools } from './tools/analysis.js';
import { repoTools } from './tools/repo.js';

const INSTRUCTIONS = `
Landscapr keeps the architecture around a customer journey in one connected model:
a journey step points at a process, a process step calls a function or a subprocess,
a function belongs to a system and consumes and produces data, and a system implements
capabilities.

Working with it:
- Start with landscapr_overview to see what is already there, and landscapr_describe_types
  before you write a kind of element for the first time.
- When somebody describes how something works and wants it modelled, read the description
  yourself, decide what the elements are, and hand the whole reading over in one
  landscapr_draft call - it creates what is missing, reuses what exists and never overwrites
  what somebody wrote by hand. The model_from_description prompt carries the long form.
- Elements are referred to by name or by id, so you can say "CRM" instead of a uuid.
- Create the elements first, then link them - a model earns its keep through its links.
- landscapr_gaps and landscapr_impact read the model rather than change it; use them to
  answer questions about coverage and blast radius.
- With a repository nothing leaves this session until landscapr_save commits it. Commit on
  a branch and open a pull request, the way the app does, so the change is reviewed.
`.trim();

export function buildTools(store) {
  return [
    ...repoTools(store),
    ...analysisTools(store),
    ...elementTools(store),
    ...structureTools(store),
    ...draftTools(store)
  ];
}

export async function createServer(store) {
  const tools = buildTools(store);
  const byName = new Map(tools.map(tool => [tool.name, tool]));

  const server = new Server(
    { name: 'landscapr', version: '1.0.0' },
    { capabilities: { tools: {}, resources: {}, prompts: {} }, instructions: INSTRUCTIONS }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: tools.map(({ name, description, inputSchema }) => ({ name, description, inputSchema }))
  }));

  server.setRequestHandler(CallToolRequestSchema, async request => {
    const tool = byName.get(request.params.name);
    if (!tool) {
      throw new Error(`Unknown tool "${request.params.name}".`);
    }
    await store.ensureLoaded();
    try {
      return await tool.handler(request.params.arguments || {});
    } catch (error) {
      // a failed call is an answer too: the assistant needs to read what went wrong
      return {
        isError: true,
        content: [{ type: 'text', text: error instanceof Error ? error.message : String(error) }]
      };
    }
  });

  server.setRequestHandler(ListPromptsRequestSchema, async () => ({ prompts: listPrompts() }));

  server.setRequestHandler(GetPromptRequestSchema, async request =>
    getPrompt(request.params.name, request.params.arguments || {}));

  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: [
      {
        uri: 'landscapr://model',
        name: 'The whole model',
        description: 'The stored JSON document, exactly as the app reads it',
        mimeType: 'application/json'
      },
      ...TYPE_NAMES.map(name => ({
        uri: `landscapr://${TYPES[name].section}`,
        name: `${TYPES[name].label}s`,
        description: TYPES[name].summary,
        mimeType: 'application/json'
      }))
    ]
  }));

  server.setRequestHandler(ReadResourceRequestSchema, async request => {
    await store.ensureLoaded();
    const uri = request.params.uri;
    const section = uri.replace('landscapr://', '');

    if (section === 'model') {
      return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(store.model, null, 2) }] };
    }

    const typeName = TYPE_NAMES.find(name => TYPES[name].section === section);
    if (!typeName) {
      throw new Error(`Unknown resource "${uri}".`);
    }

    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(store.elements(typeName).map(element => store.readable(typeName, element)), null, 2)
      }]
    };
  });

  return server;
}

async function main() {
  const config = buildConfig();
  if (config.help) {
    process.stdout.write(config.usage + '\n');
    return;
  }

  const store = new ModelStore(config.backend, { autosave: config.autosave, readOnly: config.readOnly });

  try {
    await store.load();
    // stderr, because stdout carries the protocol
    process.stderr.write(`landscapr-mcp: ${JSON.stringify(store.describeSource())}\n`);
  } catch (error) {
    process.stderr.write(`landscapr-mcp: could not read the model - ${error.message}\n`);
    process.exitCode = 1;
    return;
  }

  const server = await createServer(store);
  await server.connect(new StdioServerTransport());
}

const isEntryPoint = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isEntryPoint) {
  main().catch(error => {
    process.stderr.write(`landscapr-mcp: ${error.stack || error.message}\n`);
    process.exit(1);
  });
}
