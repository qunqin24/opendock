# dibs

dibs is a task store that several coding agents share. Pi, Claude Code, Codex, opencode and Cursor read and write the same JSONL file per project, so a task one agent creates shows up in the others. Agents reach the store through the `dibs` CLI, an MCP server (`dibs mcp`), or the Pi extension, and the optional Things 3 adapter syncs it with Things.

## Quick start

dibs needs [Node.js](https://nodejs.org) 26 or later. Run the CLI without installing it:

```sh
npx -y @dibs.ai/dibs init
npx -y @dibs.ai/dibs create "Write tests"
npx -y @dibs.ai/dibs list
```

To keep a `dibs` command on your PATH, run `npm i -g @dibs.ai/dibs`.

Run the commands from any folder. Without a `.dibs/` folder, the CLI uses a temp store keyed on the current folder, so tasks persist across calls in that folder. Run `init` to initialize a durable store in the project. It creates an empty store without a `Hello World` task and preserves existing tasks.

For guided agent setup, run `dibs init --agent <host>` (host names are listed below). See [Init and doctor](#init-and-doctor) for consent, connection, and verification details.

Then connect your agent:

| Agent | What it gets | Setup |
|---|---|---|
| Pi | Task tools, `/todos` command, task panel | [plugins/pi](plugins/pi/README.md) |
| Claude Code | `dibs` skill, MCP tools, task panel | [plugins/claude-code](plugins/claude-code/README.md) |
| Codex | `dibs` skill, MCP tools | [plugins/codex](plugins/codex/README.md) |
| opencode | `dibs` skill, MCP tools, task panel | [plugins/opencode](plugins/opencode/README.md) |
| Cursor | `dibs` skill, MCP tools | [plugins/cursor](plugins/cursor/README.md) |

Pi loads dibs as a library. Every other agent runs the CLI through `npx -y @dibs.ai/dibs`.

## CLI

```sh
npx -y @dibs.ai/dibs --help
```

| Command | Effect |
|---|---|
| `init [--from dex] [--adapter things\|none] [--connect] [--install-agent]` | Initialize durable storage and guide optional setup (see [Init and doctor](#init-and-doctor)); import Dex tasks once with `--from dex` |
| `doctor [--agent <host>]` | Read-only installation and storage checks; warnings exit 0, errors exit 1 |
| `list [--query q] [--human u\|me]` | List tasks |
| `ready [--human u\|me]` | List tasks with no open blockers |
| `create <name> [--description d] [--parent id] [--blocked-by a,b] [--human u]` | Create a task |
| `start <id> [--force]`, `complete <id> [--result r] [--force]` | Change status; `start` and `complete` refuse a task another live owner claimed unless `--force` is given |
| `edit <id> [--name n] [--description d] [--blocked-by a,b] [--human u]` | Edit a task; `--human ""` clears the human |
| `import <file>`, `export [file]` | Read or write todo.txt |
| `sync` | Sync with the adapters enabled in config; an adapter that another process is syncing prints `skipped` and is not waited for |
| `link <id>`, `resolve <url>` | Make or follow a `dibs://<project-id>/<task-id>` link |
| `panel [current\|project\|completed] [--mine a,b]` | Print the task panel |
| `mcp` | Serve the task tools over MCP (stdio) |
| `scope project\|global`, `migrate .dibs\|.agents/dibs` | Move the store (see [Storage](#storage)) |

Every command takes `--global` (use this project's store under `~/.dibs/projects/`) and `--json`. `--agent <host>` selects the host for init setup and doctor checks without changing `DIBS_AGENT` creator identity. Ids accept a unique prefix: `start a1b` works when only one id starts with `a1b`.

The CLI finds the project by walking up from the current directory to the nearest folder that holds a `.dibs/`, `.agents/dibs/` or `.pi-do/` folder, so commands work from any subfolder. The home folder and `~/.dibs` never count. That folder is the project for trust, the store, the project name and registration. `DIBS_TRUST=1` trusts the current directory without such a folder. An untrusted directory gets the temp store.

| Variable | Effect |
|---|---|
| `DIBS_AGENT` | Names the agent that creates a task (`created_by`) |
| `DIBS_USER` | Sets your GitHub user; otherwise `git config github.user` or `gh` supplies it |
| `DIBS_TRUST=1` | Trusts the current directory |
| `DIBS_SESSION` | Names the CLI claim owner (`cli:<id>`) and keys the temp store, which otherwise uses the current folder |
| `DIBS_SCOPE`, `DIBS_FILE` | Override `scope` and `file` from config |
| `DIBS_HOME` | Moves `~/.dibs` |

`start` claims the task for the CLI session as `cli:` followed by `DIBS_SESSION`, `DIBS_AGENT` or `cli`. A CLI claim lasts until `complete` or `--force`, even after the CLI exits. `ready` hides tasks with a live claim. Pi and MCP claims last while their process lives.

## Init and doctor

`init` explicitly creates empty durable storage and preserves existing tasks. Optional `--from dex` performs the [one-time import](#dex-import). Setup behavior is implemented in [`packages/dibs/src/cli/index.ts`](packages/dibs/src/cli/index.ts) and the core [`init-adapter`](packages/dibs/src/core/init-adapter.ts), [`init-connection`](packages/dibs/src/core/init-connection.ts), and [`init-agent`](packages/dibs/src/core/init-agent.ts) modules.

In a TTY, `init` asks whether to enable Things with a yes/no prompt that defaults to no. Without a TTY, it instructs the agent to ask the user, then rerun `dibs init --adapter things` or `dibs init --adapter none`. An existing adapter choice is retained unless explicitly changed.

For enabled Things, use `dibs init --connect` to consent to connection setup. Choosing `--adapter things` also consents to that setup. A TTY can request hidden token input; without a TTY, set `DIBS_THINGS_TOKEN` privately before rerunning. Never put tokens in chat or CLI arguments. See [Things connection](packages/dibs/src/core/adapters/things/README.md#connect).

The connection probe calls only the adapter's `.list()` through `osascript`. It never syncs, creates, or updates tasks. macOS may show a real Automation permission prompt. A valid token shape and successful read do not authenticate the token for writes. Enabled Things without credentials remains pending.

`--agent pi|claude-code|codex|opencode|cursor` overrides host detection. Detection recognizes `PI_CODING_AGENT=true` or `AI_AGENT=pi`, `CLAUDECODE`, and `CODEX_THREAD_ID`, then an exact supported host name in `DIBS_AGENT`. Other hosts need an explicit selection; detection is not universal.

Ask the user before passing `--install-agent`: the flag records prior consent. Without it, interactive installation asks for consent with a default of no; noninteractive setup remains pending. Installation scope is:

- Pi and Claude Code: user configuration through their installation commands.
- Codex: user MCP configuration plus a project skill. Setup inspects `codex mcp list --json` and runs `codex mcp add` only when `dibs` is absent.
- Cursor and OpenCode: project skill and MCP files only, with no native panel installed by `init`.

Existing skill files and conflicting configuration or server entries are preserved, not overwritten. Review pending instructions for manual action. Reload Pi or restart the selected host after setup.

`init` owns installation and external connection operations, then automatically runs [`doctor`](packages/dibs/src/core/doctor.ts). Standalone `dibs doctor` executes no commands, contacts no adapters, acquires no write locks, and writes no files. It checks storage, registry, identity, bounded agent configuration evidence, and enabled Things credential shape. Warnings exit 0; errors exit 1.

Saved storage is not rolled back when connection, agent setup, or verification fails; `init` exits 1 for those errors. Pending setup can exit 0. `init --json` emits one JSON document with nested `connection`, `agentSetup`, and `doctor` results plus pending instructions. JSON mode does not prompt; inspect these results rather than treating exit 0 as completed setup.

Configuration evidence does not prove package installation or tools loaded in the current session. The agent must inspect its available tool inventory for `todo_list`, `todo_create`, `todo_edit`, `todo_status`, `todo_link`, and `todo_resolve`, without invoking task tools or syncing. Standalone doctor cannot prove runtime registration; see [`agent-verification.ts`](packages/dibs/src/core/agent-verification.ts).

Doctor warns when CLI ownership falls back to a shared name. Set a distinct `DIBS_SESSION` per agent session and reuse it across that session's CLI calls. This guidance does not change the [claim semantics](#cli).

## Tasks

Each task is one JSON object per line:

| Field | Value |
|---|---|
| `id`, `name`, `completed`, `started_at` | Always present |
| `priority` | A-Z |
| `created`, `completed_date` | YYYY-MM-DD |
| `description`, `result` | Free text |
| `parent` | Id of the parent task |
| `blocked_by` | Ids of tasks that must complete first; never synced to adapters |
| `claimed_by` | Owner of a started task: `cli:<name>` for the CLI, `<session>:<pid>` for Pi and MCP; never synced or exported |
| `created_by` | Agent name, or `@user` for a human |
| `human` | GitHub username of the human in the loop; `create` defaults it to you |

`+projects`, `@contexts` and other `key:value` tags stay in `name`. The schema is `Task` in [`packages/dibs/src/core/todo.ts`](packages/dibs/src/core/todo.ts).

Export writes each task as a [todo.txt](https://github.com/todotxt/todo.txt) line, carrying the dibs fields as `dibsid:`, `dibsstart:`, `dibsdesc:`, `dibsparent:`, `dibsresult:`, `dibsby:`, `dibshuman:` and `dibsblocked:` tags. Import reads those tags back and skips `dibsid:`s already in the store. Export does not overwrite an existing file.

## Storage

| Scope | Todos file |
|---|---|
| `project` (default for trusted projects) | `.dibs/todos/<project>.todos.jsonl`, or under `.agents/dibs/` if that folder exists |
| `global` | `~/.dibs/projects/<project>.<id>/todos/<project>.todos.jsonl` |
| `temp` (and untrusted projects) | The same layout under `$TMPDIR/dibs/<session-hash>/.dibs/`, keyed on the current folder unless `DIBS_SESSION` is set; the OS may remove it |

`<project>` is the name of the project folder (see [CLI](#cli)). Without explicit `init`, on first use dibs creates the store folder with a `config.json` and a todos file. A permanent store starts with a `Hello World` task, and so does a temp store on the run that creates `~/.dibs/`; other temp stores start empty.

The project's `config.json` holds its id and its settings, and stays in the project in both scopes. The id keys the project's record in `~/.dibs/projects/projects.jsonl` (`id`, `name`, `path`, `scope`, `created`). Only `global` scope creates a folder under `~/.dibs/projects/`.

`scope project|global` moves the `todos/` and `sync/` folders between the project and `~/.dibs/projects/<name>.<id>/`. `migrate .dibs|.agents/dibs` moves the whole project store folder. Both run only in trusted projects and refuse to overwrite existing todos.

## Configuration

`config.json` is JSONC, so comments and trailing commas are allowed. dibs reads `~/.dibs/config.json`, then the project's `config.json`, then the environment; each later source overrides the earlier one.

```json
{"adapters": {"things": {"sync": true}}, "scope": "project"}
```

| Key | Value |
|---|---|
| `adapters` | Options for `things`: `sync` (boolean) and `human` (`"me"` or a GitHub username; only tasks with that `human` sync, and tasks with no human stay local) |
| `scope` | `project` (default), `global` or `temp`; read only from the global config or `DIBS_SCOPE` |
| `file` | An explicit todos file that overrides `scope`; `~/` expands, and relative paths resolve from the working directory |

Each `config.json` that dibs writes starts with a `$schema` URL pinned to the dibs version that wrote it, so editors check every option; reads never rewrite it. The schema is [`packages/dibs/schema.json`](packages/dibs/schema.json), and Things options are in [`things.schema.json`](packages/dibs/src/core/adapters/things/things.schema.json).

Changing `scope` or `file` selects a different store without moving tasks; use export and import to carry them over. Invalid config raises an error.

## Dex import

Run `dibs init --from dex` to copy Dex tasks into a durable dibs store once. The importer in [`packages/dibs/src/core/imports/dex.ts`](packages/dibs/src/core/imports/dex.ts) only reads Dex through `dex list --all --json`; it does not write to Dex.

The `dex` CLI must be on `PATH`. Configure Dex with `.dex/config.toml` in the current folder or an ancestor, or with `$XDG_CONFIG_HOME/dex/dex.toml` (default: `~/.config/dex/dex.toml`). The importer refuses temporary Dex storage.

The import preserves task IDs, names, descriptions, parents, blockers, started/completed state, results, and creation/completion dates. Dex's numeric priority is ignored. Invalid records, missing relationship targets, and parent or blocker cycles cause an error.

Existing IDs are skipped, preserving local edits. If `sync/dex.jsonl` contains legacy links, the importer uses them to map Dex IDs and relationships to local IDs. Repeating the import adds only missing tasks.

Legacy `adapters.dex` configuration is still accepted, but enabling its `sync` setting reports an actionable error directing you to this import. Remove the Dex adapter setting after importing. See [`packages/dibs/test/dex-init.test.ts`](packages/dibs/test/dex-init.test.ts) for import and initialization checks.

## Adapters

The Things 3 adapter syncs the dibs store both ways with Things. Todoist is not implemented. Pi and the MCP server sync every enabled adapter before each task list and after each change; the CLI syncs only on `dibs sync`. When another process is already syncing an adapter, the new run skips it instead of waiting. Each README covers connecting, synced fields and limits:

- [Things 3](packages/dibs/src/core/adapters/things/README.md)

## Documentation

- Agent setup: [Pi](plugins/pi/README.md), [Claude Code](plugins/claude-code/README.md), [Codex](plugins/codex/README.md), [opencode](plugins/opencode/README.md), [Cursor](plugins/cursor/README.md)
- The skill agents follow: [`packages/dibs/skills/dibs/SKILL.md`](packages/dibs/skills/dibs/SKILL.md)
- Adapters: [Things 3](packages/dibs/src/core/adapters/things/README.md)
- Release notes: [CHANGELOG.md](CHANGELOG.md)
- Development, project structure and releases: [CONTRIBUTING.md](CONTRIBUTING.md)

dibs is MIT licensed.
