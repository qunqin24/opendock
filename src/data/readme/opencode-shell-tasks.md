# OpenCode Background Tasks

An OpenCode plugin for Claude Code-style background shell jobs. It lets the Agent start a long command without blocking the current turn, continue other work, inspect status and logs, stop a task, and show a TUI toast when the task finishes.

## Features

- Detached shell commands that return a task ID immediately
- Project-scoped task metadata persisted outside the repository
- Combined stdout/stderr logs with bounded tail reads
- Status and exit-code reconciliation after an OpenCode restart
- Graceful or forced process-group cancellation
- Completion and failure toasts in a connected OpenCode TUI
- A native `/tasks` TUI panel registered automatically by the plugin
- Automatic Agent guidance to route long-running shell work to `background_bash`

## Install From npm

Add the published package to the server plugin list in `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-shell-tasks"]
}
```

Add the same package name to the native TUI plugin list in `~/.config/opencode/tui.json`:

```json
{
  "plugin": ["opencode-shell-tasks"]
}
```

OpenCode installs npm plugins automatically into its cache. Quit and restart OpenCode after changing either configuration file.

## Install From This Checkout

```sh
npm install
npm run build
```

Add the package directory to the server plugin list in `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["./"]
}
```

Use an absolute `file://` URL to this package directory when loading it from a different project. Do not point at `dist/plugin.js`: the directory lets OpenCode resolve both the server and native TUI entrypoints.

Add the same directory to the native TUI list in `~/.config/opencode/tui.json`:

```json
{
  "plugin": ["file:///absolute/path/to/opencode-shell-tasks"]
}
```

Quit and restart OpenCode after changing either configuration file.

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

Run `/tasks` to open the native shell-details panel immediately. It does not call the model. The normal footer shows `1 shell · ← for agents` while a shell is active.

The plugin also adds routing guidance to the Agent: tests, builds, installs, downloads, sleeps, watch servers, and other commands likely to take more than a few seconds use `background_bash` automatically. Quick or interactive commands continue to use `bash`.

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

## Native TUI Runtime

The server and TUI entrypoints use OpenCode's native `@opencode-ai/plugin/tui` runtime. This is currently a development/experimental OpenCode API, so pin OpenCode if you depend on the panel behavior. The package deliberately keeps the server tools separate from the TUI entrypoint so the task list remains usable by other clients. The TUI build uses Solid's universal transform; do not replace it with TypeScript's `react-jsx` transform.

## Development

```sh
npm run check
```

The process wrapper writes an exit-code sidecar before exiting. This allows the plugin to recover the final status after a restart even though the detached process is no longer owned by the restarted OpenCode server.
