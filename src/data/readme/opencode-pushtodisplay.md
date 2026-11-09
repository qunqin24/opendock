# opencode-pushtodisplay

**Push To Display** plugin for [OpenCode](https://opencode.ai) — mirrors your
agent's activity onto your Push To Display board in real time.

## Install

Requires **OpenCode V2.2+**. Install the published npm package once:

```bash
opencode plugin add opencode-pushtodisplay@latest
```

That adds the plugin to your global `opencode.json(c)`. The plugin includes the
Push To Display CLI it needs; there is no separate CLI or global npm install.

> **Security:** plugins run with the OpenCode server's full system access. Review
> the source before installing third-party plugins.

A panel is a **shared scrolling log** (1 of 4). Every entry is its own message,
newest at the top, and every entry has the same shape:

```
<agent> <what happened> <STATUS> <time>
```

```
live session closed ENDED 12:10
live Pinned the clock so the release test passes. DONE 12:09
live Allow bash: git push --force-with-lease NEEDS 12:08
live reading src/payloads.ts OK 12:08
live running grep FAIL 12:07
live running ls -1 src OK 12:07
live fix the flaky release test RUN 12:06
live session opened READY 12:06
```

Three things get shortened, and each is shortened *by structure* first:

| Body | Rule |
| --- | --- |
| tool description | 48 characters; a long command keeps its program and subcommand (`running grep`), a long path drops its directory before its file name |
| prompt | first usable sentence, 60 characters, ellipsis at a word boundary when possible |
| result | same rule as the prompt |

The agent name leads, so a shared panel reads as one column per agent; the event
follows, and the status and clock trail. A line is four inline runs on a fixed
dark surface (`#1b2430`): the name is teal, the body near-white, the status has
its own colour, and the time is dimmed. Type size and weight are the renderer's
defaults; the upper-case status is what makes a line scannable.

## What gets posted

| Event | Entry | Status |
| --- | --- | --- |
| a session is created | `session opened` | `READY` |
| a session is renamed | `session renamed` | `READY` |
| a prompt arrives | `<task>` | `RUN` |
| a tool finishes | `running npm test` | `OK` / `FAIL` |
| a blocking permission opens | `Allow bash: git push` | `NEEDS` |
| the run finishes | `<what the agent said>` | `DONE` |
| you interrupt the run | `interrupted before it finished` | `STOP` |
| the session is deleted | `session closed` | `ENDED` |
| the model/provider fails | `HTTP 500 …` | `FAIL` |

The status word is a **closed** vocabulary — `READY`, `RUN`, `OK`, `FAIL`,
`NEEDS`, `DONE`, `STOP`, `ENDED` — so a line can never invent its own state, and
there is no icon to decode. `READY` and `ENDED` bracket a session: silence alone
cannot distinguish a finished agent from a killed one, so the panel says when it
opens and when it closes, reloads included.

Steps are posted when they **finish**, so a line states what actually happened
instead of leaving a stale "running" behind it. The rest is deliberately silent:
a turn boundary, the agent's mid-run chatter, and a prompt being answered are
facts about machinery, not news.

**The result line quotes the agent.** Counters ("ran 5 tools", "finished in 6s")
answer a question nobody asked, so `DONE` carries the agent's own closing text,
shortened to its first usable sentence. It gets the same prose treatment as the
prompt; tool descriptions are summarised separately.

OpenCode reports a subagent as a child session. Child-session prompts and tool
steps are not mirrored: the parent's `task` step already says a delegation
happened, and duplicating the child's whole run would turn one board line into a
noisy second log. A permission request from a child still surfaces under the
parent's name, because a human must act on it.

## Features

- **Reads like English** — every entry is a sentence (`running npm test`,
  `editing src/auth.ts (+8 −3)`). Paths are shortened against the session cwd.
- **A trail, not a status card** — one entry per finished tool step, in the order
  it happened. `/pushtodisplay-clear` writes a `log cleared` entry;
  `PUSHTODISPLAY_STEPS=0` drops the per-step entries if you only want milestones.
- **Failures are reported, never inferred** — a failed step says `FAIL` on its
  own line; a provider error says what the provider said; `STOP` means you
  interrupted the run. There is no "the run failed" verdict to contradict a turn
  that finished, and no threshold that decides one.
- **Order is preserved** — nothing is reordered, so a result is never sent ahead
  of the step that caused it. Consecutive duplicates are suppressed, and the
  backlog is bounded, so the log cannot fall minutes behind the agent.
- **OAuth-only auth** — no API keys. Reuses the `pushtodisplay` CLI's
  device-code flow; tokens auto-refresh.
- **Quota-friendly** — every API call counts toward your message quota (Sandbox
  tiers are rate-limited to ~1 msg/s). Sends are spaced ≥ 1.2 s, consecutive
  identical lines are skipped per agent, and nothing streams token by token.
- **Explicit setup** — a shared login is not enough. A fresh install stays
  silent until `/pushtodisplay-setup` verifies auth and sends a test entry.
- **Auth gating** — updates wait for the first auth probe, then are dropped
  (never buffered) while auth is known to be bad; sending resumes automatically
  once you log in.
- **Self-contained install** — ships the pinned Push To Display CLI inside the
  plugin, so one npm install is all you need.

## Requirements

- **OpenCode V2.2+** with `@opencode/plugin` 2.2.x.
- Node.js ≥ 18 for the bundled `pushtodisplay` CLI and for development. OpenCode
  loads the plugin's TypeScript entry directly; there is no build step.
- A Push To Display account and board.

## Setup

After installing, run the one setup action:

```
/pushtodisplay-setup
```

It logs in with the OAuth device-code flow if needed, sends one test entry to
your configured panel and board, and only then enables automatic updates. If you
already logged in through another integration on this machine, setup reuses that
login but still sends the OpenCode test entry and marks this installation as set
up.

The board should show `<label> link OK, panel N OK HH:MM`. Check the current
state at any time with:

```
/pushtodisplay-status
```

Use `/pushtodisplay-login` only when you need to re-authenticate; it does not
clear an existing setup marker.

That's it — the next time you run an agent, your board shows it starting, what
it's working on, errors, and when it ends.

## Configuration

Environment variables and plugin `options` both work. Plugin options win over
the environment, which makes it easy to run several OpenCode projects with
different panels from one shell.

| Env var | Plugin option | Default | Description |
| --- | --- | --- | --- |
| `PUSHTODISPLAY_BOARD_ID` | `boardId` | *(default board)* | Board ID to send to. |
| `PUSHTODISPLAY_PANEL` | `panel` | `1` | Which panel (1–4) this agent writes to. |
| `PUSHTODISPLAY_LABEL` | `label` | *(session title, then folder)* | Agent name in the first field of every line. |
| `PUSHTODISPLAY_STEPS` | `steps` | *(on)* | Set to `0` / `false` to skip per-tool entries (milestones only). |
| `PUSHTODISPLAY_DISABLED` | `disabled` | *(off)* | Set to `1` / `true` to disable the plugin entirely. |

Example `opencode.json(c)`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "opencode-pushtodisplay",
      "options": {
        "boardId": "board_abc123",
        "panel": 2,
        "label": "qa",
        "steps": false
      }
    }
  ]
}
```

### Multiple agents / panels

Give each parallel OpenCode process its own panel and a label:

```bash
# agent A
PUSHTODISPLAY_PANEL=1 PUSHTODISPLAY_LABEL=cicd opencode

# agent B
PUSHTODISPLAY_PANEL=2 PUSHTODISPLAY_LABEL=qa opencode
```

Each panel becomes its own scrolling log, so you can see what every agent did and
which one needs you. Sharing a panel between agents is fine — the agent field on
every line keeps them apart:

```
qa Allow bash: git push NEEDS 11:41
release running npm test OK 11:40
```

> **TIP:** with no explicit `PUSHTODISPLAY_LABEL`, the label is the session title
> when one is set, otherwise the workspace folder name; launching from two
> different repos already gives you two distinct agents.

## Commands

| Command | Description |
| --- | --- |
| `/pushtodisplay-setup` | Log in if needed, send a test entry, and enable updates for this OpenCode install. |
| `/pushtodisplay-login` | Re-authenticate (OAuth device-code flow) without clearing setup. |
| `/pushtodisplay-status` | Show current auth and setup state. |
| `/pushtodisplay-test` | Send a test update to verify wiring. |
| `/pushtodisplay-clear` | Write a `log cleared` entry to this panel. |

Command output is written back with `ctx.session.synthetic`, so it appears in the
session transcript without being sent to the model or to the board.

## How it works

```
OpenCode events ──► state ──► message builder ──► sender ──► CLI ──► API
(session/task/      (panel-state)  (messages.ts,      (ordered,   (1.2s spacing)  (OAuth)
 tool/permission/                   one sentence)     bounded,
 text/idle)                                           deduped)
```

- **Events listened to:** `session.created`, `session.renamed`,
  `session.deleted`, `session.execution.failed`,
  `session.execution.interrupted`, `session.execution.succeeded`,
  `session.idle`, `session.text.ended`, `permission.asked`, and
  `location.shutdown`. OpenCode 2.2 reports a settled run with
  `session.execution.succeeded`; `session.idle` is kept as a fallback for
  versions that emit it.
- **Hooks:** `ctx.session.hook("prompt", ...)` turns an admitted prompt into the
  `RUN` line; `ctx.tool.hook("execute.after", ...)` turns each finished tool into
  its `OK`/`FAIL` step.
- **Messages, not state:** `src/messages.ts` turns one event into one sentence.
  There is no "current status" object to render — `PanelState` is four fields
  (`agent`, `cwd`, `task`, `closing`).
- **No coalescing:** every entry is news, so nothing is dropped for being
  superseded.
- **One queue, four jobs:** `src/sender.ts` keeps strict order, suppresses
  consecutive duplicates, trims the oldest steps when the backlog would
  otherwise run too far behind, and spaces sends ≥ 1.2 s apart — safely above
  the Sandbox ~1 msg/s cap.
- **Setup gating:** updates are sent only when this OpenCode integration has a
  setup marker and auth is valid. The marker is written by
  `/pushtodisplay-setup` after its test entry succeeds, so a shared credential
  from another integration cannot make a fresh install start posting.
- **Auth gating:** auth is probed at plugin load and re-probed lazily on send at
  most once every 20 s while unauthenticated (`/pushtodisplay-status` forces a
  check). Once auth is known to be bad, updates are dropped, never buffered;
  `/pushtodisplay-setup` or `/pushtodisplay-login` re-probes and re-enables
  sending. Gating happens at dispatch time, so every path is covered.
- **Cleanup:** when the plugin unloads (including server shutdown), it flushes
  the sender and writes `ENDED` for every session it opened.

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| `Push To Display CLI not found` | The plugin install looks incomplete — reinstall `opencode-pushtodisplay`, then run `/pushtodisplay-setup`. |
| Nothing appears after installing | Run `/pushtodisplay-setup`; a fresh install stays silent until the marker and auth both exist. |
| Authenticated but still silent | Run `/pushtodisplay-setup` to finish this OpenCode install, then `/pushtodisplay-status`. |
| Updates paused / not authenticated | Run `/pushtodisplay-setup`, then `/pushtodisplay-status`. |
| Test entry does not appear | Run `/pushtodisplay-setup` or `/pushtodisplay-test`; check `PUSHTODISPLAY_BOARD_ID`, `PUSHTODISPLAY_PANEL`, and the agent label. |
| Only milestones, no tool lines | `PUSHTODISPLAY_STEPS=0` or `"steps": false` is set. |
| Plugin does nothing | `PUSHTODISPLAY_DISABLED=1` or `"disabled": true` is set. |
| Login URL/code never appears | The CLI writes device-code instructions to stderr; the plugin shows both in a login dialog. Check the OpenCode server log for `[pushtodisplay]` messages. |
| `/pushtodisplay-test` fails | The toast includes the CLI error. Full server log: `~/.local/share/opencode/log/opencode.log`; run OpenCode with `--print-logs` to include plugin `[pushtodisplay]` stderr. |
| Board lines lag behind the agent | Sends are rate-limited to ~1 msg/s; the sender drops the oldest steps when the backlog is too long. Results and milestones are never dropped. |
| Lines show `FAIL` but the run finished | Check whether the provider actually failed; `FAIL` is only written from a failed tool or `session.execution.failed`. A user interrupt is `STOP`. |

## Development

```bash
npm install
npm run check        # typecheck + lint + test
npm test -- --coverage
```

The package is plain TypeScript — OpenCode loads `src/index.ts` directly (no
build step). Unit tests live under `src/__tests__/` and use Jest with `ts-jest`.

Tests that touch the CLI use a fake `pushtodisplay` executable on a temporary
PATH that records argv to a file; no live OAuth or network call is made.
Extension tests use a fake OpenCode context and a mocked CLI adapter to exercise
the event, hook, command, and cleanup wiring.

Local-checkout install, bundled CLI resolution, the live smoke test, and release
steps are in [docs/maintainers.md](docs/maintainers.md) and
[docs/publishing.md](docs/publishing.md).

## Architecture

| File | Responsibility |
| --- | --- |
| `src/index.ts` | Package entry — resolves the bundled CLI and exports `Plugin.define(...)`. The only file using `import.meta`. |
| `src/extension.ts` | The setup factory: OpenCode event/hook/command wiring, setup/auth gating, send scheduling, cleanup. |
| `src/setup-state.ts` | Per-OpenCode setup marker: cache path, read gate, atomic write. |
| `src/config.ts` | Env-var and plugin-option config parsing + string helpers (`truncate`, `clock`). |
| `src/panel-state.ts` | The task/closing text a message needs; no counters, no verdict. |
| `src/messages.ts` | One-sentence message builders — the whole visible vocabulary. |
| `src/events.ts` | OpenCode event shapes and their payload mapping. |
| `src/sender.ts` | The queue: order, dedupe, bounded backlog, 1.2 s spacing. |
| `src/payloads.ts` | Wire types and the palette. |
| `src/auth-gate.ts` | Unknown / logged in / logged out; unknown waits for the probe, known-bad drops. |
| `src/cli-adapter.ts` | Bundled CLI resolution, argv mapping, auth probing, error classification. |
| `src/describe.ts` | Human-readable present-tense one-liners for OpenCode tool calls. |

## License

MIT. PushToDisplay is a product of Goban Source, LLC — see
[pushtodisplay.com](https://pushtodisplay.com).
