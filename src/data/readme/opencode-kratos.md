# opencode-kratos

Persistent project memory for [OpenCode](https://opencode.ai), powered by [kratos-memory](https://github.com/ceorkm/kratos-cli). Every session automatically gets the project's memory injected as context, every prompt gets relevant memories recalled, every tool edit and command gets buffered, and every idle session gets summarized into long-term memory — with zero tokens spent on agent tools, because all memory logic lives in the kratos CLI, not in the model's context.

## How OpenCode events map to kratos

| OpenCode event | Plugin action | Kratos call |
|---|---|---|
| `session.hook("context")` — every model call, cached per session | Inject memory block as a system part | `kratos context [--budget N]` once per sessionID, result cached |
| `session.hook("prompt")` — prompt admission | Append recall block to prompt text | `kratos capture --event user-prompt` stdin `{prompt}`, stdout appended |
| `ctx.tool.hook("execute.after")` — completed tool calls | Buffer edit/command events | `kratos capture --event post-tool-use` stdin translated payload |
| `session.hook("compaction")` — before context compaction | Flush session buffer | `kratos capture --event session-end` |
| `session.idle` (interactive) or `session.execution.*` completion (headless runs), debounced 15 min | Flush session buffer | `kratos capture --event session-end` |
| Plugin cleanup (server shutdown) | Best-effort flush | `kratos capture --event session-end` |

Tool events are translated to the tool names kratos understands:

| OpenCode tool | Mapped to | Input mapping |
|---|---|---|
| `edit`, `write` | `Edit` / `Write` | `path`/`filePath`/`file_path` → `file_path` |
| `patch` | `MultiEdit` | `path` → `file_path` |
| `shell`, `bash` | `Bash` | `command` → `command` |
| any other tool | passed through with its name | — |

## Requirements

- **OpenCode V2** (the plugin API shipped with V2).
- **kratos** — either the launcher at `~/.kratos/bin/kratos`, any binary you point
  `binary` at, or nothing at all: the plugin falls back to running kratos through
  `npx --yes kratos-memory` automatically. A global kratos install is faster
  (no npx resolution on first use) and works offline.

## Install

Add the plugin to your OpenCode config (`~/.config/opencode/opencode.json`):

```jsonc
{ "plugins": [{ "package": "opencode-kratos" }] }
```

That's it — all features are on by default.

## Options

```jsonc
{
  "plugins": [{
    "package": "opencode-kratos",
    "options": {
      "binary": "",
      "context": true,
      "recall": true,
      "capture": true,
      "summary": true,
      "idleDebounceMinutes": 15,
      "contextBudget": 2000,
      "debug": false
    }
  }]
}
```

| Option | Default | Description |
|---|---|---|
| `binary` | `""` | Explicit path to a kratos binary. When empty, the plugin probes `~/.kratos/bin/kratos`, then falls back to `npx --yes kratos-memory`. |
| `context` | `true` | Inject the project memory block into the session context (system part) on every model call. |
| `recall` | `true` | Append kratos's recall output to each user prompt. |
| `capture` | `true` | Buffer completed tool events (edits, commands) into kratos. |
| `summary` | `true` | Write session summaries (the session-end flushes). |
| `idleDebounceMinutes` | `15` | How long a session must stay idle before its summary is flushed. `0` flushes on the next tick after each idle event. |
| `contextBudget` | *(unset)* | Token budget passed to `kratos context --budget N` to cap the memory block size. |
| `debug` | `false` | Write every plugin decision to `~/.kratos/opencode-kratos/debug.log` under a `[kratos]` prefix. |

## How it works

- **Context injection** — the first model call of a session runs `kratos context`
  in the project directory (10s timeout) and caches the result; every model call
  in that session pushes the same cached block as a `<kratos-context>` system
  part. The cache is capped at 100 sessions.
- **Per-prompt recall** — each admitted prompt is piped to
  `kratos capture --event user-prompt` (5s timeout); when kratos prints a recall,
  it is appended to the prompt text inside a `<kratos-recall>` block. Kratos's
  own gating applies: short prompts, slash commands, and sub-threshold matches
  produce nothing.
- **Tool capture** — completed tool calls are translated and piped to
  `kratos capture --event post-tool-use`, fire-and-forget so the agent loop
  never waits. Failed tool calls are skipped.
- **Session summaries** — instead of hooking a "stop" moment that OpenCode does
  not have, the plugin subscribes to `session.idle` and execution-completion
  events (`session.execution.succeeded/failed/interrupted`, which headless
  `opencode run` sessions emit) and arms a per-session debounce (default
  15 min). Each new trigger re-arms the timer, so the summary is written when
  the session has truly gone quiet, regardless of event cadence. Context
  compaction and plugin shutdown flush immediately. Before summarizing, a
  flush waits (up to 5 s) for the session's still-in-flight tool captures so
  kratos sees a complete event buffer. The session-end capture itself runs in
  a detached child process: the OpenCode server only grants ~1-2 s of
  shutdown grace, which an awaited capture would not survive. Flushes are
  serialized per project through a lock file
  (`~/.kratos/opencode-kratos/locks/`), so several OpenCode instances open on
  the same project never double-summarize; a lock older than 10 s is considered
  abandoned (a flush holds it for at most ~6 s) and taken over.

Every hook is wrapped in a never-throw guard: if kratos is missing, slow, or
broken, sessions proceed normally — you just lose memory features until it
comes back.

## Troubleshooting

- **"kratos not found" / nothing captured** — check that
  `~/.kratos/bin/kratos --help` exits 0, or install globally
  (`npm i -g kratos-memory`). The npx fallback needs network on first use.
- **Nothing in memory after a session** — the summary flush is debounced
  (default 15 min); it also fires on compaction and shutdown. Lower
  `idleDebounceMinutes` if you iterate quickly.
- **General diagnosis** — set `"debug": true` in the plugin options and read
  `~/.kratos/opencode-kratos/debug.log`; every plugin decision is prefixed
  with `[kratos]`. (OpenCode v2 swallows plugin console output, so the plugin
  writes its own debug file.)

## Known limitations

- No git post-commit capture (kratos captures Claude-style tool events only).
- The memory buffer is shared per project: concurrent sessions in the same
  project buffer into the same kratos project memory.
- Memories saved mid-session appear in recall on the **next** session —
  the context block is cached per session by design.

## Development

```bash
npm install
npm test          # unit tests (node:test)
npm run typecheck # tsc --noEmit
npm run e2e       # end-to-end: boots `opencode run --standalone` twice
```

## License

MIT

## Credit

Memory backend: [kratos-memory](https://github.com/ceorkm/kratos-cli) by
[ceorkm](https://github.com/ceorkm). This plugin is an independent OpenCode
integration and is not affiliated with that project.

Source and issues: [MisterAssm/opencode-kratos](https://github.com/MisterAssm/opencode-kratos).
