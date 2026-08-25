# OpenCode 2 Shell Tasks

[![npm version](https://img.shields.io/npm/v/opencode2-shell-tasks.svg)](https://www.npmjs.com/package/opencode2-shell-tasks)
[![npm downloads](https://img.shields.io/npm/dm/opencode2-shell-tasks.svg)](https://www.npmjs.com/package/opencode2-shell-tasks)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

An [OpenCode 2](https://opencode.ai/v2/docs/) plugin for Claude Code-style background shell jobs, built on the **V2 plugin API** (`Plugin.define`, `ctx.tool.transform`, `ctx.session.hook`). It lets the Agent start a long command without blocking the current turn, continue other work, inspect status and logs, stop a task, and manage everything from a native TUI panel.

> This is the OpenCode 2 port of [`opencode-shell-tasks`](https://github.com/madcpt/opencode-shell-tasks), which targets OpenCode 1.x. The two plugins target different plugin API generations and are not interchangeable.

## Features

- Detached shell commands that return a task ID immediately
- Project-scoped task metadata persisted outside the repository
- Combined stdout/stderr logs with bounded tail reads
- Status and exit-code reconciliation after an OpenCode restart
- Graceful or forced process-group cancellation
- Automatic Agent wake-up: when a task finishes, the originating session receives a queued synthetic message telling the Agent to read the output and continue
- A native `/tasks` TUI panel registered automatically by the plugin
- Automatic Agent guidance to route long-running shell work to `background_bash`
- Permission-gated tools via declarative V2 `options.permission`

## Install From npm

The fastest path is the CLI, which installs the package into OpenCode's cache and adds it to your global config:

```sh
opencode2 plugin add opencode2-shell-tasks
```

Or add it manually to the `plugins` list in `~/.config/opencode/opencode.json(c)`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode2-shell-tasks"]
}
```

OpenCode 2 discovers both server and TUI entrypoints from the same package. Restart OpenCode after changing the configuration.

## Install For Agents

If you are an AI agent setting this plugin up for a user:

1. Check the environment: `opencode2 --version` must report a V2 beta release (`0.0.0-beta-*`). This plugin does not work on OpenCode 1.x.
2. Install with `opencode2 plugin add opencode2-shell-tasks`. If that command is unavailable, edit the user's existing `~/.config/opencode/opencode.json(c)` and **merge** `"plugins": ["opencode2-shell-tasks"]` into it — never replace or overwrite the whole file; preserve every unrelated setting.
3. Restart the background service: `opencode2 service restart`.
4. Verify loading: `opencode2 api get /api/plugin | jq '.data[] | select(.id == "opencode2-shell-tasks")'` — expect `"status": "active"`.
5. Verify tools work end to end by listing tasks through the plugin's own tool (e.g. call `background_tasks`) rather than assuming registration succeeded.

## Install From This Checkout

```sh
npm install
npm run build
```

Add the package directory to the `plugins` list in `opencode.json(c)` (project or global):

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    { "package": "/absolute/path/to/opencode2-shell-tasks" }
  ]
}
```

OpenCode 2 discovers both server and TUI entrypoints from the same package. Restart OpenCode after changing the configuration or rebuilding the plugin.

## Usage

Ask naturally:

```text
Run npm test in the background and keep working on the README.
```

The Agent can call these tools:

| Tool | Purpose |
|---|---|
| `background_bash` | Start a detached command. |
| `background_tasks` | List running or finished tasks. |
| `background_output` | Tail a task's combined output. |
| `background_kill` | Send `SIGTERM` or `SIGKILL` to the task process group. |

When a task reaches a terminal state, the plugin injects a queued synthetic message into the session that started it, so the Agent wakes up on its next turn, reads the output via `background_output`, and continues without being asked. No manual polling is required.

Run `/tasks` to open the native shell-details panel immediately. It does not call the model. The prompt footer shows a shell counter while any shell is active.

The plugin also injects routing guidance into the Agent's context: tests, builds, installs, downloads, sleeps, watch servers, and other commands likely to take more than a few seconds use `background_bash` automatically. Quick or interactive commands continue to use `bash`.

Panel controls:

| Key | Action |
|---|---|
| `j` / `k` or arrow keys | Switch between shells. |
| `x` | Stop the selected shell. |
| `X` | Force-stop the selected task. |
| `r` | Refresh task state. |
| `←` / `Esc` / `Enter` / `Space` | Close the details panel. |

Task state defaults to:

```text
~/.local/share/opencode/background-tasks/<project-hash>/
```

Set `OPENCODE_BACKGROUND_TASKS_DIR` to override the storage root.

## V2 Plugin API Notes

This plugin tracks the beta V2 plugin API and pins `@opencode-ai/plugin@beta`. Key mappings from the V1 implementation:

| V1 | V2 |
|---|---|
| `async ({client, directory}) => ({hooks, tool})` | `Plugin.define({id, tui, setup(ctx)})` |
| `tool({args})` registration | `ctx.tool.transform(tools.add(...))` with JSON Schema inputs |
| `context.ask({permission})` | Declarative `options.permission` on tool registration |
| `experimental.chat.system.transform` + `tool.definition` | Single `ctx.session.hook("context")` callback |
| Tool executor `context.directory` | Resolved per call via `ctx.session.get(sessionID)` |
| `api.route` / `slots.register` / `keymap.registerLayer` | `ui.router` pages, `ui.slot` claims, `keymap.layer()` commands |

Because the V2 plugin API is still beta, pin your OpenCode release if you depend on specific behavior.

## Development

```sh
npm run check
```

The process wrapper writes an exit-code sidecar before exiting. This allows the plugin to recover the final status after a restart even though the detached process is no longer owned by the restarted OpenCode server.
