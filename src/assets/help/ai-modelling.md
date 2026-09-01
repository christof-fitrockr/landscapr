# Modelling with an AI assistant

Everything you can model in LandscapR by hand, you can also model by asking for it. LandscapR ships an
**MCP server** (`mcp/` in the repository) that puts the model in front of an AI assistant such as Claude,
Claude Code, Cursor or any other tool that speaks the Model Context Protocol.

The assistant does not get a copy and it does not get a chat log - it works on **the same JSON model file**
that the app reads and writes. So you can say

> *"Add a journey 'Order spare parts' with the four steps we discussed, hang the functions we already have
> off them and tell me where the gaps are"*

and the result is a model you open in LandscapR like any other.

## What the assistant can do

| Ask for | The assistant uses |
|---|---|
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
