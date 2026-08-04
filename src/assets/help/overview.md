# Overview: What Landscapr Is and Why It Exists

Landscapr is a modelling tool for the **enterprise architecture around a customer journey**. It lets you
describe, in one connected model, what your customers experience, which business processes deliver that
experience, which functions and data those processes rely on, and which systems and capabilities carry
them.

Everything you model lives in a **single JSON file that is versioned in a GitHub repository**. The model is
therefore not a set of drawings in a wiki — it is a data set with a history, branches, reviews and
approvals, just like source code.

## The Problem It Solves

Most organisations already describe their landscape somewhere: journeys in a presentation, processes in a
process tool, interfaces in an API portal, applications in a spreadsheet, data models in yet another tool.
Those artefacts age at different speeds, contradict each other, and nobody can answer the questions that
actually matter:

- Which processes does a customer touch when they book a service appointment?
- Which systems and APIs break if we retire this application?
- Which business capability has no system support at all — and which one has four?
- Where does the promise we make to the customer differ from what they really get?

Landscapr answers those questions by keeping the layers **in one model with explicit links between them**,
and by making changes to the model a reviewable, traceable process.

## Purpose

1. **One connected model instead of isolated diagrams.** Journeys, processes, functions, data, capabilities
   and systems reference each other, so every view is generated from the same truth.
2. **Impact analysis in both directions.** Every object shows what it uses and where it is used, so you can
   trace from a customer step down to an API — and from a system back up to the customers it affects.
3. **Experience management, not just process documentation.** The experience layer above a journey records
   what the customer expects, what they actually get, and the measured gap between the two.
4. **Governed change.** Editing happens on your own branch; changes reach the shared model through a pull
   request that someone reviews. Nothing is overwritten by accident.
5. **Usable by business and IT alike.** Business users work in journeys, processes and capabilities;
   architects work in APIs, data and systems. Both edit the same model, in their own language.

## The Model

| Layer | Object | Answers |
|-------|--------|---------|
| Experience | **Journey** | What path does the customer take, and how well is each step delivered? |
| Business | **Process** | Which workflows and steps deliver the journey? |
| Business | **Capability** | What is the business able to do, independent of how? |
| Technical | **Api Call (Function)** | Which concrete function executes a step? |
| Technical | **Data** | Which business objects and attributes flow through it? |
| Technical | **System** | Which application provides the function and implements the capability? |

The layers are connected: a journey step points to a process, a process step points to a subprocess or a
function, a function belongs to a system and consumes and produces data, and a system implements
capabilities. Those links are what makes the reverse lookups ("Used By", "Implemented By", "Usage")
possible.

## How It Works

- **Browser application.** Landscapr runs entirely in your browser. Your working copy of the model is held
  in the browser's local database, so the app stays fast and works while you are offline.
- **GitHub as the database.** Connect with a Personal Access Token, load a model file from a repository,
  edit it, and save it back as a commit. The sync badge in the navigation bar tells you whether your local
  copy is ahead of, behind or diverged from the remote branch.
- **Branch, review, merge.** Edit mode puts you on a personal branch. When you are done, you submit a pull
  request; the merge resolver helps you reconcile your work with changes made by others.
- **Views and export.** Capability maps, process flows, swimlanes, ER diagrams and journey diagrams are
  generated from the model, and journeys can be exported to PowerPoint for stakeholder communication.

## What Landscapr Is Not

- It is **not a runtime or an integration platform** — it describes the landscape, it does not operate it.
- It is **not a ticketing or project tool** — it holds the target picture and the current state, not the
  work items to get there.
- It is **not an API gateway or a code generator** — API definitions here are catalogue entries used for
  architecture reasoning, not deployable specifications.

## Where to Start

1. **Repositories** – connect to GitHub, load a model file and start edit mode.
2. **How To: Workflow** – the recommended cycle of work, save, submit.
3. **Journeys** – model the customer path and the experience layer.
4. **Process**, **Api Call**, **Capability**, **System** – deepen the model layer by layer.
