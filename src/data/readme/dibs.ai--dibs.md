# dibs

dibs is a task store that several coding agents share. Pi, Claude Code, Codex, opencode and Cursor read and write the same JSONL file per project, so a task one agent creates shows up in the others. Agents reach the store through the `dibs` CLI, an MCP server (`dibs mcp`), or the Pi extension, and optional adapters sync it with Dex and Things 3.

## Quick start

dibs needs [Node.js](https://nodejs.org) 26 or later. Run the CLI without installing it:

```sh
npx -y @dibs.ai/dibs create "Write tests"
npx -y @dibs.ai/dibs list
```

To keep a `dibs` command on your PATH, run `npm i -g @dibs.ai/dibs`.

Run the commands from any folder. Without a `.dibs/` folder, the CLI uses a temp store keyed on the current folder, so tasks persist across calls in that folder. To keep tasks in the project, create a `.dibs/` folder or set `DIBS_TRUST=1`.

Then connect your agent:

| Agent | What it gets | Setup |
|---|---|---|
| Pi | Task tools, `/todos` command, task panel | [agents/pi](agents/pi/README.md) |
| Claude Code | `dibs` skill, MCP tools, task panel | [agents/claude-code](agents/claude-code/README.md) |
| Codex | `dibs` skill, MCP tools | [agents/codex](agents/codex/README.md) |
| opencode | `dibs` skill, MCP tools, task panel | [agents/opencode](agents/opencode/README.md) |
| Cursor | `dibs` skill, MCP tools | [agents/cursor](agents/cursor/README.md) |

Pi loads dibs as a library. Every other agent runs the CLI through `npx -y @dibs.ai/dibs`.

## CLI

```sh
npx -y @dibs.ai/dibs --help
```

| Command | Effect |
|---|---|
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

Every command takes `--global` (use this project's store under `~/.dibs/projects/`) and `--json`. Ids accept a unique prefix: `start a1b` works when only one id starts with `a1b`.

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

`+projects`, `@contexts` and other `key:value` tags stay in `name`. The schema is `Task` in [`src/core/todo.ts`](src/core/todo.ts).

Export writes each task as a [todo.txt](https://github.com/todotxt/todo.txt) line, carrying the dibs fields as `dibsid:`, `dibsstart:`, `dibsdesc:`, `dibsparent:`, `dibsresult:`, `dibsby:`, `dibshuman:` and `dibsblocked:` tags. Import reads those tags back and skips `dibsid:`s already in the store. Export does not overwrite an existing file.

## Storage

| Scope | Todos file |
|---|---|
| `project` (default for trusted projects) | `.dibs/todos/<project>.todos.jsonl`, or under `.agents/dibs/` if that folder exists |
| `global` | `~/.dibs/projects/<project>.<id>/todos/<project>.todos.jsonl` |
| `temp` (and untrusted projects) | The same layout under `$TMPDIR/dibs/<session-hash>/.dibs/`, keyed on the current folder unless `DIBS_SESSION` is set; the OS may remove it |

`<project>` is the name of the project folder (see [CLI](#cli)). On first use dibs creates the store folder with a `config.json` and a todos file. A permanent store starts with a `Hello World` task, and so does a temp store on the run that creates `~/.dibs/`; other temp stores start empty.

The project's `config.json` holds its id and its settings, and stays in the project in both scopes. The id keys the project's record in `~/.dibs/projects/projects.jsonl` (`id`, `name`, `path`, `scope`, `created`). Only `global` scope creates a folder under `~/.dibs/projects/`.

`scope project|global` moves the `todos/` and `sync/` folders between the project and `~/.dibs/projects/<name>.<id>/`. `migrate .dibs|.agents/dibs` moves the whole project store folder. Both run only in trusted projects and refuse to overwrite existing todos.

## Configuration

`config.json` is JSONC, so comments and trailing commas are allowed. dibs reads `~/.dibs/config.json`, then the project's `config.json`, then the environment; each later source overrides the earlier one.

```json
{"adapters": {"dex": {"sync": true}}, "scope": "project"}
```

| Key | Value |
|---|---|
| `adapters` | Per-adapter options for `dex` and `things`: `sync` (boolean) and `human` (`"me"` or a GitHub username; only tasks with that `human` sync, and tasks with no human stay local) |
| `scope` | `project` (default), `global` or `temp`; read only from the global config or `DIBS_SCOPE` |
| `file` | An explicit todos file that overrides `scope`; `~/` expands, and relative paths resolve from the working directory |

Each `config.json` that dibs writes starts with a `$schema` URL pinned to the dibs version that wrote it, so editors check every option; reads never rewrite it. The schema is [`schema.json`](schema.json), and each adapter's options are in `src/core/adapters/<name>/<name>.schema.json`.

Changing `scope` or `file` selects a different store without moving tasks; use export and import to carry them over. Invalid config raises an error.

## Adapters

Adapters sync the dibs store both ways with another todo app. Pi and the MCP server sync every enabled adapter before each task list and after each change; the CLI syncs only on `dibs sync`. When another process is already syncing an adapter, the new run skips it instead of waiting. Each README covers connecting, synced fields and limits:

- [Dex](src/core/adapters/dex/README.md)
- [Things 3](src/core/adapters/things/README.md)

## Documentation

- Agent setup: [Pi](agents/pi/README.md), [Claude Code](agents/claude-code/README.md), [Codex](agents/codex/README.md), [opencode](agents/opencode/README.md), [Cursor](agents/cursor/README.md)
- The skill agents follow: [`agents/shared/skills/dibs/SKILL.md`](agents/shared/skills/dibs/SKILL.md)
- Adapters: [Dex](src/core/adapters/dex/README.md), [Things 3](src/core/adapters/things/README.md)
- Release notes: [CHANGELOG.md](CHANGELOG.md)
- Development, project structure and releases: [CONTRIBUTING.md](CONTRIBUTING.md)

dibs is MIT licensed.
