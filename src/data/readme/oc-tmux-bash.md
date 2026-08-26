# oc-tmux-bash

An [opencode](https://opencode.ai) plugin that runs bash commands inside **tmux windows**, adding three capabilities the native bash tool lacks:

1. **Timeout → background** — when a foreground command hits its timeout, it can move to the background instead of being killed.
2. **Background jobs** — start a command with `background: true` and get notified automatically when it finishes.
3. **Interactive PTY shell** — a persistent `shell` tool (start / write / kill) backed by a real tmux pane.

It overrides opencode's built-in `bash` tool. The schema mirrors the native one (`command`, `description`, `timeout` in milliseconds, `workdir`) and adds only `background` / `timeoutAction` / `name`, so existing model behaviour is unchanged and the TUI renders foreground commands identically.

Inspired by [`Snowy117/pi-tmux-bash`](https://github.com/Snowy117/pi-tmux-bash) (the pi equivalent).

## Requirements

- [opencode](https://opencode.ai) with plugin support (`@opencode-ai/plugin >= 1.18.0`)
- `tmux` on `$PATH` (tested with tmux 3.x)
- opencode runs plugins under Bun; no other runtime is needed

## Install

Reference the package in your `opencode.json`:

```jsonc
{
  "plugin": ["oc-tmux-bash"]
}
```

Or, for a local checkout during development, point `plugin` at the directory or use the `.opencode/plugins/` folder.

Then build (only needed for local dev):

```sh
npm install
npm run build
```

## Tools

### `bash` (overrides native)

| Parameter | Type | Default | Notes |
|---|---|---|---|
| `command` | string *(required)* | — | The command to execute |
| `description` | string *(required)* | — | Short label, also used by the TUI as a call title |
| `timeout` | number *(ms)* | `defaultTimeoutMs` | Foreground wait before `timeoutAction` |
| `workdir` | string | session dir | Run here instead of `cd …` |
| `background` | boolean | `false` | Start in background; fast commands are awaited briefly |
| `timeoutAction` | `"background"` \| `"kill"` | `"background"` | What happens on foreground timeout |
| `name` | string | first token of `command` | tmux window name (display only) |

- Foreground: output streams to the TUI live (via `ctx.metadata`), exactly like native bash. On completion the exit code and tail output are returned; truncation follows the native format (`...output truncated...\n\nFull output saved to: <path>`).
- On `timeoutAction: "background"`: returns with the window id and output-file path when the timeout is reached. When the command finishes, a completion message is delivered to the session and a new turn is triggered.
- On `background: true`: waits up to `backgroundInitialWaitMs` for fast commands. If the command finishes, the result says `already finished` and includes its output; otherwise it returns with the window id and output-file path and notifies the session on completion.
- On `timeoutAction: "kill"`: matches native behaviour (kill + timeout error).
- Abort (`ctx.abort`) kills the window.

### `bg_jobs`

Inspect/control background tmux windows for the current session.

| action | args | description |
|---|---|---|
| `list` | — | list this session's background windows |
| `peek` | `window` | tail of a window's output |
| `raw` | `window` *or* `path` | unfiltered output (path must be inside the output dir) |
| `kill` | `window` | kill a window |
| `wait` | `window` | block until the window completes |

`window` accepts a tmux window id like `@123` or a stable job id like `a1b2c3d4`. Job ids are preferred: tmux window ids are recycled once the server restarts, while job ids are unique per run and are included in every background notice and notification. All windows are scoped to the current opencode session.

### Interactive workflows

There is no dedicated interactive-shell tool. Drive an interactive process (a REPL, a prompt-driven CLI, a dev server) by piping through a named pipe:

```sh
mkfifo /tmp/repl.in
tail -f /tmp/repl.in | your-interactive-program
```

Run that in the background (`background: true` or let it time out to background), write to `/tmp/repl.in` with another `bash` call, and inspect output via `bg_jobs peek`/`raw`. For long-running sessions use `timeoutAction: "background"`.

## Completion notification

When a backgrounded command finishes, the plugin sends a message to its session via the opencode client and triggers a new turn — you don't need to poll. The message contains the exit code, the command, and the output tail.

A pending window that disappears **without** writing its exit-code file (killed externally, pane crash, tmux server restart) is also reported, as *"ended without recording an exit code"*, together with whatever output was captured up to that point.

> The notification is delivered immediately on completion. If the agent is mid-turn, the message is queued by opencode's normal session handling.

## tmux session lifetime

Each opencode session maps to one tmux session. Sessions are created with `exit-empty off`, so they survive their last window closing — this keeps the tmux server alive and window ids monotonic (`@0`, `@1`, …) instead of restarting from `@0` after every command, which previously made ids ambiguous across runs.

## Configuration

All options are optional. Passed as the plugin's options object:

```jsonc
{
  "plugin": [["oc-tmux-bash", {
    "tmuxBinary": "tmux",
    "outputDir": "/tmp/oc-bg-jobs",
    "defaultTimeoutMs": 120000,
    "defaultTimeoutAction": "background",
    "maxTimeoutMs": 300000,
    "backgroundInitialWaitMs": 5000,
    "bashToolName": "bash",
    "bgJobsToolName": "bg_jobs",
    "tmuxEnabledActions": ["list", "peek", "raw", "kill", "wait"],
    "bashContextLines": 50,
    "maxOutputBytes": 512000,
    "autoCloseWindowsOnCompletion": true,
    "preserveOutputFiles": true,
    "allowNonGitDirectories": true,
    "globalTmuxSessionName": "oc-background",
    "tmuxWindowScope": "session"
  }]]
}
```

| option | default | description |
|---|---|---|
| `tmuxBinary` | `"tmux"` | tmux executable name/path |
| `outputDir` | `/tmp/oc-bg-jobs` | root for per-session run dirs (output + exit-code files) |
| `defaultTimeoutMs` | `120000` | foreground timeout if `timeout` is unset |
| `defaultTimeoutAction` | `"background"` | default for `timeoutAction` |
| `maxTimeoutMs` | `300000` | upper clamp for `timeout` |
| `backgroundInitialWaitMs` | `5000` | initial wait for `background: true` commands |
| `bashToolName` | `"bash"` | override the registered tool name |
| `bgJobsToolName` | `"bg_jobs"` | override the registered tool name |
| `tmuxEnabledActions` | all five | restrict the `bg_jobs` actions |
| `bashContextLines` | `50` | tail lines kept in live/background completion output |
| `maxOutputBytes` | `512000` | tail byte cap before truncation |
| `autoCloseWindowsOnCompletion` | `true` | close the tmux window after a successful background finish |
| `preserveOutputFiles` | `true` | keep run dir on dispose |
| `allowNonGitDirectories` | `true` | operate outside git repos (uses the cwd) |
| `globalTmuxSessionName` | `"oc-background"` | base tmux session name |
| `tmuxWindowScope` | `"session"` | `"session"` \| `"directory"` \| `"all"` — how tmux sessions are partitioned |
| `tmuxEnv` | see below | extra env vars exported into each command's wrapper (override process.env) |
| `tmuxEnvExportDenylist` | see below | process.env var names excluded when dumping the environment into the wrapper |

**Environment defaults.** Each command's wrapper first dumps the plugin process's `env` (minus `tmuxEnvExportDenylist`, which defaults to `PWD`, `OLDPWD`, `SHLVL`, `_`, `TMUX`, `TMUX_PANE`) and then applies `tmuxEnv`. By default `tmuxEnv` is set to suppress colour/paging so output is plain text for the model:

```jsonc
"tmuxEnv": {
  "NO_COLOR": "1",
  "TERM": "dumb",
  "PAGER": "cat",
  "LC_ALL": "C",
  "DEBIAN_FRONTEND": "noninteractive"
}
```

Override `tmuxEnv` (e.g. set `TERM` to `xterm-256color`) if a command genuinely needs a richer terminal.

## How it works

Every command runs in its own tmux window. `pipe-pane` tees output to a `.out` file; a wrapper script writes the exit code to a sibling file on completion. The plugin (running under Bun) polls / `fs.watch`es these files to detect completion, and uses the opencode client to deliver background-completion messages. Windows are tagged with custom tmux options so `bg_jobs list` can enumerate them per opencode session.

See [`DESIGN.md`](./DESIGN.md) for the full design rationale and the mapping to `pi-tmux-bash`.

## Testing

The smoke test exercises the real `tmux` binary:

```sh
npm run build
node tests/smoke.ts
```

It covers: foreground success/failure, background + completion delivery, timeout→background, and `bg_jobs list`.

## License

MIT
