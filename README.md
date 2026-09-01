# Landscapr

Landscapr is a browser-based modelling tool for the enterprise architecture around a customer journey.
It keeps customer journeys, business processes, functions, data objects, business capabilities and
systems in **one connected model** that is versioned in a GitHub repository.

## Purpose

Journeys usually live in a presentation, processes in a process tool, interfaces in an API portal and
applications in a spreadsheet. Those artefacts drift apart, and the questions that matter cannot be
answered from any single one of them:

- Which processes does a customer touch on a given journey?
- Which systems and APIs are affected if we retire this application?
- Which capability has no system support — and which one has four?
- Which processes still run without any functional support, and what do we have to build to change that?
- Where does the promise we make to the customer differ from what they actually get?

Landscapr answers those questions by holding the layers in one model with explicit links between them,
and by turning changes to that model into a reviewable, traceable process.

Its goals are:

1. **One connected model** instead of isolated diagrams — every view is generated from the same data.
2. **Impact analysis in both directions** — each object shows what it uses and where it is used.
3. **Experience management** — the experience layer on a journey records what the customer expects, what
   they actually get, and the measured gap between the two.
4. **Gap management** — the gap view shows which processes are carried by people because no function
   supports them, and turns that into a roadmap of the functions still to build.
5. **Governed change** — you edit on your own branch and submit a pull request; nothing is overwritten by
   accident.
6. **A shared language for business and IT** — both edit the same model from their own perspective.

## The Model

| Layer | Object | Answers |
|-------|--------|---------|
| Experience | **Journey** | What path does the customer take, and how well is each step delivered? |
| Business | **Process** | Which workflows and steps deliver the journey? |
| Business | **Capability** | What is the business able to do, independent of how? |
| Technical | **Api Call (Function)** | Which concrete function executes a step? |
| Technical | **Data** | Which business objects and attributes flow through it? |
| Technical | **System** | Which application provides the function and implements the capability? |

A journey step references a process, a process step references a subprocess or a function, a function
belongs to a system and consumes and produces data, and a system implements capabilities. Those links
drive the generated views: capability maps, process flows, swimlanes, ER diagrams, journey diagrams and
the PowerPoint export.

## How It Works

- **Client-only application.** Landscapr is an Angular single-page app. The working copy of the model is
  held in the browser's IndexedDB (Dexie), so the app stays fast and keeps working offline.
- **GitHub as the database.** The whole model is a single JSON file in a repository. You connect with a
  Personal Access Token, load a file, edit it and save it back as a commit.
- **Branch, review, merge.** Edit mode creates a personal branch. Saving pushes a commit, submitting opens
  a pull request, and the built-in merge resolver reconciles local and remote changes.
- **Local fallback.** Without GitHub, the model can be downloaded to and uploaded from a local JSON file.

In-app documentation lives under **Help** (`src/assets/help/*.md`); start with the *Overview* chapter.

## Modelling With an AI Assistant

Everything the app can model can also be modelled by asking for it. `mcp/` holds an **MCP server** that puts
the model in front of an AI assistant (Claude, Claude Code, Cursor, anything that speaks the Model Context
Protocol). It works on the same JSON file — journeys, processes, capabilities, functions, data objects,
systems, roles and target pictures — and it can answer the questions the model is kept for: what breaks if we
retire this system, which processes run without functional support, what still has to be built.

```bash
npm run mcp:install                              # once
node mcp/src/index.js --file ./landscape.json    # a downloaded model
LANDSCAPR_GITHUB_TOKEN=ghp_... \
  node mcp/src/index.js --repo owner/name --path model.json --branch main
```

You can also just describe how something works — a paragraph, a list of steps, a meeting note — and let the
assistant turn that reading into processes with their steps, journeys with their steps and the functions
behind them. What the description says nobody has built yet becomes a **declared gap**, which is exactly what
the gap view is for. Nothing is modelled twice and nothing you wrote by hand is overwritten.

With a repository the assistant commits on a branch and opens a pull request, so its changes reach the
published model through the same review as everybody else's. `--read-only` starts a server that answers
questions and refuses changes.

**[mcp/CONNECT.md](mcp/CONNECT.md) is the setup guide** — install, point the server at a file or a repository,
register it with Claude Code, Claude Desktop or Cursor, and check that it answers. A checkout of this
repository already carries a project-scoped `.mcp.json`, so Claude Code offers the server without any
registration; set `LANDSCAPR_MODEL_FILE` to the model you want it to work on.

The **Repositories** page prints the ready-made configuration for the repository and file you have selected,
and `mcp/README.md` plus the in-app chapter *Help → AI Modelling (MCP)* describe the tools in full.

## Development

This project was generated with [Angular CLI](https://github.com/angular/angular-cli).

| Command | Purpose |
|---------|---------|
| `npm start` | Dev server on `http://localhost:4200/`, reloads on source changes |
| `npm run build` | Production build into `dist/` |
| `npm run buildDev` | Development build |
| `npm test` | Unit tests via [Karma](https://karma-runner.github.io) |
| `npm run lint` | TSLint |
| `npm run e2e` | End-to-end tests via Protractor |
| `npm run generate-licenses` | Regenerate `src/assets/licenses.json` |
| `npm run mcp:install` | Install the dependencies of the MCP server in `mcp/` |
| `npm run mcp:test` | Tests of the MCP server |

`set-version.js` runs before start and build and writes the build timestamp into
`src/environments/version.ts`.
