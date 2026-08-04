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
- Where does the promise we make to the customer differ from what they actually get?

Landscapr answers those questions by holding the layers in one model with explicit links between them,
and by turning changes to that model into a reviewable, traceable process.

Its goals are:

1. **One connected model** instead of isolated diagrams — every view is generated from the same data.
2. **Impact analysis in both directions** — each object shows what it uses and where it is used.
3. **Experience management** — the experience layer on a journey records what the customer expects, what
   they actually get, and the measured gap between the two.
4. **Governed change** — you edit on your own branch and submit a pull request; nothing is overwritten by
   accident.
5. **A shared language for business and IT** — both edit the same model from their own perspective.

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

`set-version.js` runs before start and build and writes the build timestamp into
`src/environments/version.ts`.
