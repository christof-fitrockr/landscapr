# Connecting an assistant to the model

This is the whole setup, end to end: install the server once, decide which model it works on, register it
with your assistant, and check that it answers.

Everything below configures the **same** server. The only real decision is where the model lives - a file on
your machine, or the repository the model is versioned in.

---

## 1. Install it once

```bash
git clone https://github.com/christof-fitrockr/landscapr.git
cd landscapr
npm run mcp:install          # or: cd mcp && npm install
```

Node 18 or newer. The only dependency is the MCP SDK; the app itself does not have to be installed or running.

Check that it starts:

```bash
node mcp/src/index.js --help
```

Note the **absolute path** to `mcp/src/index.js` - every assistant needs it, because it starts the server
from its own working directory, not from yours:

```bash
echo "$(pwd)/mcp/src/index.js"
```

---

## 2. Decide which model it works on

### A file on your machine

The plain way in, and the one to start with. In LandscapR: **Repositories → Download Local** gives you the
model as a JSON file; **Upload Local** takes it back afterwards.

```bash
node /abs/path/to/landscapr/mcp/src/index.js --file ~/models/landscape.json
```

The file is written as the assistant works. If the file does not exist yet, you start with an empty model and
it is created on the first change. Add `--no-autosave` if you would rather the assistant save deliberately.

### The repository the model is versioned in

The way the app itself works. The assistant reads the model file from GitHub and commits its changes back -
on a branch, and with a pull request when you ask for one - so its work reaches the published model through
the same review as everybody else's.

```bash
export LANDSCAPR_GITHUB_TOKEN=ghp_your_token
node /abs/path/to/landscapr/mcp/src/index.js \
  --repo your-org/your-model-repo --path model.json --branch main
```

**The token** is a GitHub Personal Access Token for the repository the model lives in - the same kind you
connect the app with. A fine-grained token needs *Contents: Read and write* on that repository, plus
*Pull requests: Read and write* if the assistant should open pull requests for you. A classic token needs the
`repo` scope. Nothing is written until the assistant is asked to save.

| Option | What it does |
|---|---|
| `--file <path>` | the model as a local JSON file |
| `--repo <owner/name>` | the repository the model is versioned in |
| `--path <path>` | the model file inside the repository, `model.json` by default |
| `--branch <name>` | the branch to read, `main` by default |
| `--read-only` | answer questions, refuse every change |
| `--no-autosave` | with `--file`: wait for `landscapr_save` instead of writing every change |

Every option can be given as an environment variable instead: `LANDSCAPR_MODEL_FILE`,
`LANDSCAPR_GITHUB_REPO`, `LANDSCAPR_GITHUB_PATH`, `LANDSCAPR_GITHUB_BRANCH`, `LANDSCAPR_GITHUB_TOKEN`
(or `GITHUB_TOKEN`), `LANDSCAPR_READ_ONLY`.

---

## 3. Register it with your assistant

### Claude Code

```bash
# a local file
claude mcp add -t stdio landscapr -- node /abs/path/to/landscapr/mcp/src/index.js --file /abs/path/to/landscape.json

# the repository the model is versioned in
claude mcp add -e LANDSCAPR_GITHUB_TOKEN=ghp_your_token -t stdio landscapr \
  -- node /abs/path/to/landscapr/mcp/src/index.js --repo your-org/your-model-repo --path model.json --branch main
```

Two things about that command line:

- Everything after `--` is the server and its own arguments, untouched. Without the `--`, Claude Code reads
  `--file` as one of its own options.
- Do not put the server name directly after `-e KEY=value` - the CLI would read it as another key-value pair.
  Keep an option such as `-t stdio` between the two, as above.

By default the server is registered for the current project and only for you. `-s user` makes it available in
all your projects, `-s project` writes it into a `.mcp.json` that you can commit for your team.

### Claude Code in this repository

This repository already carries a project-scoped `.mcp.json`, so working inside a checkout of LandscapR needs
no registration at all - Claude Code offers the server and asks you once whether to trust it. Point it at your
model beforehand:

```bash
export LANDSCAPR_MODEL_FILE=/abs/path/to/landscape.json   # defaults to ./landscape.json
claude
```

### Claude Desktop, Cursor, and other clients

They all read the same block. In Claude Desktop: **Settings → Developer → Edit Config** opens the file
(`claude_desktop_config.json`, kept in the Claude application-support folder of your user account); paste the
block, save, and restart the app. Cursor reads `~/.cursor/mcp.json` for all projects, or `.cursor/mcp.json`
inside one.

```json
{
  "mcpServers": {
    "landscapr": {
      "command": "node",
      "args": ["/abs/path/to/landscapr/mcp/src/index.js",
               "--file", "/abs/path/to/landscape.json"]
    }
  }
}
```

On the repository, with a token:

```json
{
  "mcpServers": {
    "landscapr": {
      "command": "node",
      "args": ["/abs/path/to/landscapr/mcp/src/index.js",
               "--repo", "your-org/your-model-repo",
               "--path", "model.json",
               "--branch", "main"],
      "env": { "LANDSCAPR_GITHUB_TOKEN": "ghp_your_token" }
    }
  }
}
```

Use **absolute paths** in both `command` and `args`. A desktop app does not start in your project folder, and
`~` is not expanded.

The **Repositories** page of the app prints this block ready to paste, filled in with the repository, file and
workspace you have selected.

---

## 4. Check that it answers

In Claude Code, `claude mcp list` shows the server and whether it connected; `/mcp` does the same inside a
session. In any assistant, the plainest check is to ask for something only this server can answer:

> *"What does landscapr_overview say?"*

The answer names where the model comes from and how many elements it holds. From there:

> *"Read this description and model the process and the journey from it: ..."*

---

## 5. When it does not work

| What you see | What it is |
|---|---|
| `No model to work on` | Neither `--file` nor `--repo` reached the server. Check the arguments after `--`. |
| `Cannot find module '@modelcontextprotocol/sdk'` | `npm install` has not run in `mcp/`. Run `npm run mcp:install`. |
| `No GitHub token` | `LANDSCAPR_GITHUB_TOKEN` did not reach the server. In Claude Code pass it with `-e`, in a JSON config with `env`. A desktop app does not inherit the environment of your shell. |
| `... is not there, or the token cannot see it` | The repository does not exist under that name, or the token may not read it. Check `--repo` and the token's access. |
| `... has no branch "x"` | Check `--branch`. |
| An empty model on a repository that has one | `--path` points at a file that is not there. The server treats a missing file as a model that has yet to be written. |
| `GitHub PUT ... failed (409)` | Somebody changed the file in the meantime. Ask the assistant for `landscapr_reload`, then have it apply its change again. |
| `... is not valid JSON` | The file the server was pointed at is not a LandscapR model. |
| Server does not appear at all | The path to `index.js` is wrong or relative. Use an absolute path, and check the assistant's MCP log. |
| It reads but refuses to write | The server was started with `--read-only`. |

The server writes what it is working on to stderr when it starts, which is what an assistant's MCP log shows:

```
landscapr-mcp: {"kind":"github","repository":"your-org/your-model-repo","path":"model.json","branch":"main",...}
```

---

## 6. Working next to each other

The app keeps its working copy in the browser, the assistant works on the file. They meet in the repository:

1. Let the assistant commit its work on a branch and open a pull request.
2. Review it - in LandscapR under **Changes waiting for review**, or on GitHub.
3. Load the model again in the app once it is merged.

If you changed the model in the app in the meantime, ask the assistant for `landscapr_reload` before it carries
on, so it works on what is really there.

For what the assistant can then do with the model, see [README.md](README.md) and the in-app chapter
**Help → AI Modelling (MCP)**.
