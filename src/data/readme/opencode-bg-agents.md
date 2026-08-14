# opencode-bg-agents

Claude Code-style asynchronous background agents for [opencode](https://opencode.ai):
write-capable specialists running in parallel sessions, an orchestrator that gets
woken on completion, bidirectional Q&A, mid-task context push, and process
monitors that replace sleep-polling.

## How it works

`bg_dispatch` spawns a specialist agent in a standalone session with its full
permissions (including write/edit/bash) and returns immediately. Completion,
errors, and questions are injected back into the orchestrator's session as
tagged messages (`[bg done]`, `[bg error]`, `[bg question]`). Each task owns a
status file under `.opencode/bg/` with a progress log the agent appends to as
it works. Monitors run shell commands in the background and wake the calling
agent on exit or on an output regex match, so agents never poll with `sleep`.

## Install

Add the plugin to your `opencode.json`:

````json
{ "plugin": ["opencode-bg-agents@latest"] }
````

Then either let an agent set the project up for you — "run bg_setup, then apply
the snippet it returns to my <name> agents" — or do it manually:

1. Create `.opencode/agent/orchestrator.md` from
   [`templates/orchestrator.md`](templates/orchestrator.md).
2. Add the frontmatter and prompt block from
   [`templates/specialist-snippet.md`](templates/specialist-snippet.md) to each
   specialist agent that should run in the background.
3. Add `.opencode/bg/` to your project `.gitignore`.

`bg_setup` is idempotent and never overwrites existing content. If the
orchestrator agent file already exists, the delegation protocol is merged in
as a marked `<!-- opencode-bg-agents:begin/end -->` block — frontmatter and
your own instructions are preserved, and re-running `bg_setup` after a plugin
update refreshes just that block. Already have a main agent you want to keep?
Point bg_setup at it: `bg_setup(orchestrator_name: "<your-agent>")`, and set
`orchestrator` in `.opencode/bg-agents.json` to the same name. Pass
`append: false` to leave existing files untouched.

## Tools

| Tool | Available to | Purpose |
|---|---|---|
| `bg_setup(orchestrator_name?, append?)` | all (ungated bootstrap) | One-time setup: write the orchestrator agent definition (or merge it into an existing agent), install the `/bg` command, gitignore `.opencode/bg/`, return the specialist snippet |
| `bg_dispatch(title, prompt, agent)` | orchestrator | Spawn a specialist in a background session; non-blocking |
| `bg_send(id, message)` | orchestrator | Push context to a running task; delivered on its next tool result |
| `bg_answer(id, answer)` | orchestrator | Answer a pending `[bg question]` |
| `bg_status(id?)` | all | Task states and unanswered questions |
| `bg_read(id)` | all | Final output, or current status file while running |
| `bg_cancel(id)` | orchestrator | Abort a running task; stops its monitors |
| `bg_ask(question)` | background agents | Block until the orchestrator answers (timeout: proceed with judgment) |
| `monitor_run(command, wake_pattern?, timeout_sec?)` | all | Background command; wake on exit or output match |
| `monitor_status(id?)` | all | Monitor states |
| `monitor_read(id, tail?)` | all | Live log tail |
| `monitor_wait(id, timeout_sec?)` | all | Block on the real event instead of sleep loops |
| `monitor_kill(id)` | all | Kill a monitor's process |

## Configuration

Defaults work out of the box. To change them, create `.opencode/bg-agents.json`
in the project (commit it; per-project) and/or
`~/.config/opencode/bg-agents.json` (global defaults). opencode's own
`opencode.json` is schema-strict, so plugin settings cannot live there.

All keys are optional; unknown keys are ignored. Example:

```json
{
  "orchestrator": "conductor",
  "max_concurrent": 6,
  "block_sleep": false
}
```

| Key | Default | Meaning |
|---|---|---|
| `orchestrator` | `"orchestrator"` | Agent name allowed to dispatch/answer/cancel/send |
| `max_concurrent` | `4` | Parallel background tasks |
| `max_monitors` | `8` | Parallel monitors |
| `max_per_session` | `50` | Lifetime dispatch cap per session (runaway guard) |
| `question_timeout_sec` | `600` | `bg_ask` wait before proceeding on judgment |
| `stall_timeout_sec` | `90` | Fail a dispatch whose agent produced nothing by then (unreachable provider) |
| `block_sleep` | `true` | Set `false` to allow `sleep` in bash commands |
| `toasts` | `true` | Lifecycle toasts (dispatch/question/done/error/cancel) |

Precedence: `BG_AGENTS_*` environment variable (`BG_AGENTS_ORCHESTRATOR`,
`BG_AGENTS_MAX_CONCURRENT`, `BG_AGENTS_MAX_MONITORS`,
`BG_AGENTS_MAX_PER_SESSION`, `BG_AGENTS_QUESTION_TIMEOUT_SEC`,
`BG_AGENTS_STALL_TIMEOUT_SEC`, `BG_AGENTS_BLOCK_SLEEP`, `BG_AGENTS_TOASTS`) >
project file > global file > defaults. Everything is read once at plugin load.

## Status files

`.opencode/bg/bg_<id>.md` per task: YAML frontmatter (state, sessions, timing),
an append-only `## Progress` log written by the agent, and a `## Result` or
`## Error` section on completion. Monitor logs stream to
`.opencode/bg/mon_<id>.log`. Files survive restarts; in-memory task state does
not, and `bg_status`/`bg_read` fall back to disk for unknown ids.

## In the UI

- **Session list** (`/sessions`): background tasks run in standalone sessions
  so they do not block the orchestrator turn. Titles carry status:
  `⏳ bg: <title>` running, `❓` question pending, then `✓` / `✗` / `⊘`.
- **Live activity**: `bg_status` (and `/bg`) shows each running task's current
  tool call (`↳ bash: npm test (running)`), and the plugin appends `TOOL DONE/ERROR`
  lines to the task's status file as it works — `.opencode/bg/bg_<id>.md` is a
  live log.
- **Toasts**: dispatch, questions, completion, and cancellation raise TUI
  toasts; questions linger 30s (the asking agent is frozen until answered).
- **`/bg` command**: installed by `bg_setup` — a dashboard of tasks and
  monitors; `/bg <id>` reads one.

## Compatibility

Developed against opencode 1.18.4 (end-to-end verification pending). Version-sensitive points:
the `session.messages` API name, `session.idle`/`session.error` event payload
shape, and `tool.execute.after` output mutation. If completion detection or
message delivery misbehaves on your version, file an issue with your opencode
version and one raw event log line.

## Caveats

- Monitors are killed on opencode shutdown, with best-effort process-tree kills
  (`setsid` on Linux, direct child kill elsewhere). Use `exec`-style commands
  for processes that must die reliably.
- `bg_send` delivery rides on the child's next tool call; if the child finishes
  first, the completion notice reports the undelivered count.
- Plugin notifications arrive as user-role messages. The orchestrator template
  instructs the model to treat tagged `<bg_output>` content as data and never
  relay it verbatim between agents. Read those rules before pointing background
  agents at untrusted content.
- Two write-capable agents with overlapping file scopes will race; the
  orchestrator template forbids it. For hard isolation, dispatch into separate
  git worktrees.

## License

MIT
