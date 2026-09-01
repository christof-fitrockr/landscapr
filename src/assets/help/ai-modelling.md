# Modelling with an AI assistant

Everything you can model in LandscapR by hand, you can also model by asking for it. LandscapR ships an
**MCP server** (`mcp/` in the repository) that puts the model in front of an AI assistant such as Claude,
Claude Code, Cursor or any other tool that speaks the Model Context Protocol.

The assistant does not get a copy and it does not get a chat log - it works on **the same JSON model file**
that the app reads and writes. So you can say

> *"Add a journey 'Order spare parts' with the four steps we discussed, hang the functions we already have
> off them and tell me where the gaps are"*

and the result is a model you open in LandscapR like any other.

## Model it by describing it

The shortest way in is to describe how something works and let the assistant model it. A paragraph, a list of
steps, the notes from a workshop - the assistant reads it, decides what the elements are, and writes them in
one go:

> *"Der Kunde meldet eine Reklamation im Portal. Der Service prueft sie gegen den Vertrag; ist sie gedeckt,
> wird in SAP eine Gutschrift erzeugt, sonst bekommt der Kunde eine Begruendung. Fuer die Pruefung haben wir
> noch nichts - das liest heute jemand von Hand im Vertrag nach."*

Out of that come the process **Reklamation bearbeiten** with its steps, the journey the customer walks, the
functions behind the steps, the systems `Service Portal` and `SAP` - and `vertragPruefen` as a **declared
gap**, because the description says it does not exist yet. It shows up in the gap view and on the roadmap
straight away.

In Claude Code the two ready-made instructions are slash commands:

| Command | For |
|---|---|
| `/landscapr:model_from_description` | describe how something works and get processes, process steps, journeys and functions out of it |
| `/landscapr:extend_from_description` | work a change into what is already modelled |

Or simply say it: *"Lies diese Beschreibung und modelliere den Prozess und die Journey daraus."*

**It cannot run over what you built.** An element that exists is reused, not modelled a second time under a
slightly different name. A draft fills in blanks and adds to lists, but where you have written something else
it keeps yours and says so. Steps that a process already has are kept unless the assistant is explicitly asked
to replace them. And you can always ask for the preview first - the assistant then reports what it *would*
create before anything is written.

## What the assistant can do

| Ask for | The assistant uses |
|---|---|
| Model a description in one go | `landscapr_draft` |
| See what is already modelled | `landscapr_overview`, `landscapr_list`, `landscapr_search`, `landscapr_get` |
| Learn the rules of the model | `landscapr_describe_types` |
| Add journeys, processes, capabilities, functions, data objects, systems, roles, target pictures | `landscapr_create`, `landscapr_update`, `landscapr_delete` |
| Connect them | `landscapr_link`, `landscapr_unlink` |
| Write the flow of a process | `landscapr_set_process_flow` |
| Write the steps of a journey | `landscapr_set_journey_flow` |
| Record what the customer expects and gets | `landscapr_set_experience` |
| Describe the attributes of a data object | `landscapr_set_data_items` |
| Answer "what breaks if we retire this?" | `landscapr_impact` |
| Answer "where is the business carried by people?" | `landscapr_gaps` |
| Check that the model still holds together | `landscapr_validate` |
| Save the work | `landscapr_save`, `landscapr_reload` |

What the description leaves open stays open: a step whose function nobody has built yet is named anyway and
becomes a declared gap, and where a person does the work on purpose the process is marked as manual by design,
so it is not counted against you.

Elements are named, not numbered: the assistant says `implementedBy: ["CRM"]`, and the server turns it into
the id the model stores. A status is a word - `Ready`, `Planned`, `Gap` - not a number. If a name does not
exist, the call fails and says so instead of inventing a link.

## Set it up

```bash
cd mcp
npm install
```

Then tell your assistant about the server. Two ways to point it at a model:

**On the repository, the way the app works.** The assistant reads the model file from GitHub and commits its
changes back - on a branch, and with a pull request if you ask for one.

```json
{
  "mcpServers": {
    "landscapr": {
      "command": "node",
      "args": ["/path/to/landscapr/mcp/src/index.js",
               "--repo", "your-org/your-model-repo",
               "--path", "model.json",
               "--branch", "main"],
      "env": { "LANDSCAPR_GITHUB_TOKEN": "ghp_..." }
    }
  }
}
```

**On a file.** Download the model under **Repositories → Download local**, let the assistant work on it, and
upload it again.

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

The **Repositories** page shows the ready-made snippet for the repository, file and branch you have selected,
so you can copy it straight into your assistant's configuration.

For Claude Code the same thing in one line:

```bash
claude mcp add landscapr -- node /path/to/landscapr/mcp/src/index.js --file /path/to/landscape.json
```

## Nothing is overwritten by accident

The assistant follows the same rules you do:

- **A file is written as it goes.** Every change lands in the JSON file straight away. Start the server with
  `--no-autosave` if you would rather ask for `landscapr_save` yourself.
- **A repository is never written until you say so.** Changes stay in the session until the assistant is asked
  to save; that is a commit, on the branch you name, and a pull request when you want one - your reviewers see
  it exactly like a change made in the app.
- **`--read-only`** starts a server that answers questions and refuses every change. Useful when you only want
  the assistant to read the landscape.
- A deleted element takes its links with it, so the model never keeps a reference into nothing.

## While you both work

The app keeps its working copy in the browser, the assistant works on the file. They meet in the repository:

1. Let the assistant commit its work on a branch and open a pull request.
2. Review it - in LandscapR under **Changes waiting for review**, or on GitHub.
3. Load the model again in the app once it is merged.

If you changed the model in the app in the meantime, ask the assistant for `landscapr_reload` before it
carries on, so it works on what is really there.
