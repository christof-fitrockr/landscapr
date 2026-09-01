# Landscapr MCP server

Puts the Landscapr model in front of an AI assistant. Journeys, processes, capabilities, functions, data
objects, systems, roles and target pictures - the same elements the app edits, in the same JSON file, under
the same rules about what may point at what.

The assistant does not get a copy of the model. It works on the file the app reads, so what it models shows up
in Landscapr, and what you model in Landscapr is what it sees.

## Install

```bash
cd mcp
npm install
```

Node 18 or newer. The only dependency is the MCP SDK.

## Point it at a model

**A file on disk** - the JSON the app downloads under *Repositories → Download local*:

```bash
node src/index.js --file ../landscape.json
```

**The repository the model is versioned in** - the way the app itself keeps it:

```bash
LANDSCAPR_GITHUB_TOKEN=ghp_... node src/index.js --repo your-org/your-model-repo --path model.json --branch main
```

| Option | What it does |
|---|---|
| `--file <path>` | the model as a local JSON file |
| `--repo <owner/name>` | the repository the model is versioned in |
| `--path <path>` | the model file inside the repository, `model.json` by default |
| `--branch <name>` | the branch to read, `main` by default |
| `--read-only` | answer questions, refuse every change |
| `--no-autosave` | with `--file`: wait for `landscapr_save` instead of writing every change |

The same settings as environment variables: `LANDSCAPR_MODEL_FILE`, `LANDSCAPR_GITHUB_REPO`,
`LANDSCAPR_GITHUB_PATH`, `LANDSCAPR_GITHUB_BRANCH`, `LANDSCAPR_GITHUB_TOKEN` (or `GITHUB_TOKEN`),
`LANDSCAPR_READ_ONLY`.

## Register it with an assistant

Claude Desktop, Cursor and anything else that reads an `mcpServers` block:

```json
{
  "mcpServers": {
    "landscapr": {
      "command": "node",
      "args": ["/path/to/landscapr/mcp/src/index.js", "--file", "/path/to/landscape.json"]
    }
  }
}
```

Claude Code:

```bash
claude mcp add landscapr -- node /path/to/landscapr/mcp/src/index.js --file /path/to/landscape.json
```

The **Repositories** page in the app prints the snippet for the repository, file and branch you have selected.

## The tools

| Tool | What it is for |
|---|---|
| `landscapr_overview` | what the model holds, where it comes from, how well the processes are supported |
| `landscapr_describe_types` | the contract of the model: fields, statuses, which parts have their own tool |
| `landscapr_list`, `landscapr_get`, `landscapr_search` | read what is modelled, with the links resolved into names |
| `landscapr_create`, `landscapr_update`, `landscapr_delete` | the elements themselves |
| `landscapr_link`, `landscapr_unlink` | the links between them |
| `landscapr_set_process_flow` | the steps of a process, with branches and subprocesses |
| `landscapr_set_journey_flow` | the steps of a journey and how they follow each other |
| `landscapr_set_experience` | what the customer expects at a step, what they get, how well it matches |
| `landscapr_set_data_items` | the attributes of a data object |
| `landscapr_impact` | what would be affected if an element changed or was retired |
| `landscapr_gaps` | which processes run without functional support, and what has to be built |
| `landscapr_validate` | links into nothing, names used twice, functions nobody provides |
| `landscapr_reload`, `landscapr_save` | read the model again, write it back as a commit and a pull request |

Resources: `landscapr://model` for the whole document, and one per kind of element, e.g. `landscapr://processes`.

## How it behaves

- **Names, not ids.** `implementedBy: ["CRM"]` finds the system called CRM. Ids work everywhere a name does,
  and win when both would match. An ambiguous name is refused rather than guessed.
- **Words, not numbers.** A status is `Ready`, `Planned` or `Gap`; it is stored as the number the app expects.
- **No link into nothing.** A reference to something that is not in the model fails and says what is there.
  Deleting an element takes every reference to it with it.
- **A file is written as it goes; a repository is not.** With `--repo` nothing leaves the session until
  `landscapr_save` commits it - on a branch, and with a pull request when asked, so a change made by an
  assistant is reviewed like any other.

## Tests

```bash
npm test
```

The tests drive the server over stdio the way an assistant does, model a small landscape end to end and check
that the file that comes out is the document the app reads back.
