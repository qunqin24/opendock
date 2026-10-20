# todo-supervisor

An [OpenCode](https://opencode.ai) **V2** plugin that gives every session a real
todo list — and then keeps the agent working on it. A live progress strip in the
composer (`📋 ███░░░░░ 8/17 open`) tracks the list.

- `todo_write` / `todo_read` / `todo_add` / `todo_remove` / `todo_settings` tools
  (V2 ships none), stored per session, with stable per-item ids;
- a **supervisor** that re-prompts an idle session while its list still has open
  items — and stays quiet while the agent is actually working (thinking,
  preparing a tool, a running tool or `task` subagent, background shells, child
  sessions), nudging only once that work goes silent;
- **Markdown mode**: subscribe any number of markdown files whose GFM checklists
  (`- [ ]`) count as todos — and check them off from the panel;
- a TUI strip + popover panel, slash command, palette entries, and toasts.

Nudges are delivered as synthetic session input, so the model sees them as normal
instructions. Every nudge is self-contained: counts, the open items (with
priorities), a short explainer of why it fired, and how to finish.

Tested against OpenCode `2.0.24`.

## Install

```sh
opencode plugin add @hacky.software/opencode-todo-supervisor@0.3.13
```

> **OpenCode 2.0.32 packaging note:** TUI entries installed from npm are
> loaded with a dynamic `import()`, which resolves the plugin's own bundled
> `solid-js`. That second Solid instance renders once but does not react: the
> composer strip stays hidden and arrow-key selection does not move. Point the
> config at a local checkout instead (below) — the host transpiles local TUI
> entries against its own runtime, so slots and keymaps stay live.

This also loads the bundled TUI entry. To pass options, use the object form:

```jsonc
// ~/.config/opencode/opencode.json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "@hacky.software/opencode-todo-supervisor",
      "options": {
        "stallMinutes": 5,
        "settleMs": 5000,
        "minNudgeIntervalMs": 45000,
        "maxNoProgressNudges": 5,
        "injectTodoContext": true,
        "allowMultipleActive": false,
        "markdownFiles": ["PLAN.md", "TODO.md"],
        "scope": "project"
      }
    }
  ]
}
```

To run from a checkout instead, point the config at the directory (run
`bun install` once inside it; the loader does not install dependencies for
local-path entries):

```jsonc
{
  "plugins": [{ "package": "/path/to/todo" }]
}
```

Logs land in `~/.local/share/opencode/log/todo-supervisor.log` (prefixes
`[todo-supervisor]` / `[todo-supervisor/tui]`); `console.log` inside plugins is
swallowed, so use the log file.

## What it does

OpenCode has no built-in todo list, so the model often plans in prose and then
stops early, leaving half a task done. This plugin gives the model a durable list
and makes finishing it the path of least resistance:

1. the agent calls **`todo_write`** to lay out the work;
2. it works the list, calling `todo_write` as items move;
3. if it goes idle with items still open, the **supervisor** nudges it to
   continue — and if work *looks* running but has gone silent, it nudges about
   that instead;
4. it is finished when no open items remain across all sources.

## Tools

Seven tools, all registered with `codemode: true` so Code Mode agents can call
them too. Together they are the whole interface the model uses.

Every item has a **stable id** (a number, e.g. `3`), assigned when the item is
first written and preserved across list rewrites by matching content. Ids are
shown as `#3` in `todo_read`, in the injected context block, and in the panel,
and are what `todo_remove` and the panel's remove key take. The stored id is a
bare token — the leading `#` is display-only, so sending `#3` back is accepted
and normalized to `3` (a decorated id is also healed on load).

### `todo_write`

Replaces the session's list.

```json
{
  "todos": [
    {
      "id": "3",
      "content": "string",
      "status": "pending | in_progress | completed | canceled",
      "priority": "high | medium | low"
    }
  ]
}
```

`content` and `status` are required; `id` and `priority` are optional.

- The list **replaces** the previous one — always send the complete list. Echo
  each item's `id` to keep it; items without an id are matched to the previous
  list by content, and anything new gets a fresh id.
- One item may be `in_progress`; extra ones are demoted to `pending` and the
  result says so. When the session allows multiple active items (see
  [`todo_settings`](#todo_settings) and the [`allowMultipleActive`
  option](#options)), every `in_progress` item is kept instead.
- Content is trimmed, empty entries dropped, duplicates removed.
- Returns the summary plus the canonical list (with ids), and resets the
  supervisor's no-progress counter and any pause.

### `todo_add`

```json
{ "content": "string", "priority": "high | medium | low", "status": "pending | …" }
```

Appends one item without resending the whole list, and returns its new id.
`content` is required; `priority` and `status` are optional (`pending` by
default). Adding content that is already on the list returns the existing id
instead of creating a duplicate. Adding an `in_progress` item demotes the
previous active one(s) — unless several actives are allowed (see
`todo_settings`), in which case they are left alone.

### `todo_remove`

```json
{ "id": "3" }
```

Removes one item by its id.

### `todo_read`

Input is `{}`. Returns the current list merged with subscribed markdown files
(`path:line` references), or `No todos.` when empty. It also reports the active
mode (`multiple in_progress items: allowed / not allowed`). The list is also
injected into context on every request, so this is only to double-check exact
state.

### `todo_settings`

```json
{ "allowMultipleActive": "boolean | null" }
```

Reads or changes this session's todo settings — the per-session override for the
[`allowMultipleActive` option](#options).

- No arguments: just reports the current settings (and where they come from:
  `config default` or `session override`).
- `true` / `false`: overrides the setting for this session only, persisted in
  storage, so it survives a restart.
- `null`: clears the override, falling back to the config default.

With it on, `todo_write` keeps every `in_progress` item, `todo_add` does not
demote the previous active item, and the injected context block tells the model
that several items may be active at once.

### `todo_subscribe`

```json
{ "files": [{ "path": "string" }] }
```

Treats each file's GFM checklist (`- [ ]`) as todos for this session. Paths are
relative to the project directory (or absolute) and must end in `.md`/`.markdown`.
Returns the resulting subscription set.

### `todo_unsubscribe`

Same input as `todo_subscribe`. Stops supervising a file, and also shadows a
`markdownFiles` config default.

## Markdown mode

Subscribe files with `todo_subscribe`, the panel (`A` / `D`), or config. The
effective set is `config.markdownFiles ∪ stored files − removed` per session.

- Conventions: `- [ ]` open, `- [x]`/`- [X]` completed, `- [~]` canceled. `-`,
  `*`, `+`, numbered and indented items all count; fenced code blocks are ignored.
- Completion by the agent happens by **editing the file** (`- [x]`); nudge text
  says so explicitly. The **panel can toggle a file item too** (`x`/`space` on a
  markdown row): the plugin rewrites only that line's marker (indentation,
  bullet, trailing text and CRLF endings preserved) and refuses paths that are
  not subscribed.
- Item references are `path:line`, in both `todo_read` and nudges (grouped:
  session list first, then one section per file).
- Missing files are valid subscriptions (0 tasks) and are picked up once created.

## TUI

- **Composer strip** (`session.composer.top`): `📋 ███░░░░░ 8/17 open` (plus `⏸`
  while paused), hidden when there is neither a list nor a subscription.
- **Popover** (`/todos`, palette "Todo: open todos"): a centered overlay dialog,
  opened at the widest preset. The body fills at least 60% of its budget (so a
  short list is not a sliver) and grows up to the budget for longer lists; the
  budget is the terminal height minus the dialog chrome, capped so it stays a
  popover. The header shows `open/total` and the selected `row n/m`. `f` cycles
  the host dialog width — medium (60), large (88), xlarge (116 cells) — and only
  resizes (it never moves the dialog); `esc` closes it. Rows are laid out to the
  card width exactly (and render with wrapping off), so content never wraps and
  the card cannot grow past the bottom of the screen.
  - Note: the host's `dialog.show()` resets the presentation (`centered` goes
    back to `false`, which anchors the card a quarter of the way down), so the
    centered flag is applied *after* `show()` and re-asserted on mount.
  - header: progress bar, `open/total`, and a supervision chip (`idle · quiet
    12s · nudges 2`, `working: 1 tool · 1 shell · quiet 4s`, `paused
    (no-progress)`, `not supervised`);
  - body: a `SESSION` section, then one collapsible section per subscribed file
    (`n open of m`, `(missing)` badge, `:line` refs). Session rows lead with the
    item's `#id` and a priority column (`high` / `med` / `low`), so both are
    visible at a glance and columns line up across the list;
  - keys: `↑↓`/`jk` move, `pgup`/`pgdn`, `home`/`end`/`g`/`G`, `space`/`x` toggle
    (session item, markdown item, or collapse a file row), `enter` collapse, `n`
    nudge now, `s` pause/resume, `a` add task, `d` remove task (confirmed), `p`
    cycle a task's priority, `A` add file, `D` remove file, `r` refresh, `/`
    filter, `f` resize, `c` clear (confirm), `?` help, `escape` close;
  - it re-reads every 3 s while open, so edits made outside OpenCode show up
    without waiting for an event.
- **Side panel** (palette "Todo: open side panel"): the same list docked to
  `session.panel` (`todo.todos`), with `f` for fullscreen. Its keys are live only
  while the panel is focused *and* no overlay is up (dialog, menu, completions,
  composer), so a docked panel never steals the arrow keys from the model picker,
  command palette or the prompt's completions. The gate is applied per key at
  dispatch, not on the layer: the host ignores a layer-level `enabled`.
- `/todos add <path>` and `/todos remove <path>` manage subscriptions from the
  prompt.
- **Toasts** on `nudged` (idle vs stalled wording) and on the all-done transition.

## Commands

| Where | Command | Effect |
| --- | --- | --- |
| Slash | `/todos` | Open the todo popover for the current session |
| Slash | `/todos add <path>` | Subscribe a markdown file |
| Slash | `/todos remove <path>` | Unsubscribe a markdown file |
| Palette | `Todo: open todos` | Same as `/todos` |
| Palette | `Todo: open side panel` | Dock the list to `session.panel` instead of the popover |

## RPC

Contract id `todo` (`opencode-todo-supervisor/rpc`). The TUI uses
`context.client.rpc(TodoRpc)` and `rpc.events.on(...)`.

| Method | Input | Purpose |
| --- | --- | --- |
| `list` | `{ sessionID }` | Items, subscribed files (parsed fresh), and the supervisor snapshot |
| `clear` | `{ sessionID }` | Drop the stored list (subscriptions stay) |
| `nudge` | `{ sessionID }` | Send a nudge now (same dedupe/ownership rules as automatic nudges) |
| `setEnabled` | `{ sessionID, enabled }` | Per-session supervision kill switch |
| `toggle` | `{ sessionID, id }` or `{ sessionID, index }` | Flip one session item between completed and pending |
| `addItem` | `{ sessionID, content, priority? }` | Append one item; returns its new id |
| `removeItem` | `{ sessionID, id }` | Remove one session item by id |
| `setPriority` | `{ sessionID, id, priority }` | Set a priority (`high`/`medium`/`low`) or clear it with `none` |
| `toggleFile` | `{ sessionID, path, line }` | Toggle a checklist item inside a subscribed markdown file |
| `subscribe` | `{ sessionID, path }` | Subscribe a markdown file |
| `unsubscribe` | `{ sessionID, path }` | Shadow a subscription |

Events: `updated` (`{ sessionID }`) and `nudged` (`{ sessionID, reason }`).

Over HTTP (service credentials required):

```bash
opencode2 api post /api/rpc/todo/list \
  -H 'content-type:application/json' \
  -d '{"input":{"sessionID":"ses_…"}}'
# → {"output": { items, files, supervisor }}
```

The body/response are wrapped in `{ "input": … }` / `{ "output": … }`.

## Options

| Option | Default | Meaning |
| --- | --- | --- |
| `enabled` | `true` | Master switch for supervision (tools keep working) |
| `settleMs` | `5000` | Debounce after a **confirmed end of turn** before the idle nudge |
| `minNudgeIntervalMs` | `45000` | Minimum gap between two nudges for one session |
| `stallMinutes` | `5` | With any work in flight: minutes of silence before a *stall* nudge |
| `maxNoProgressNudges` | `5` | Consecutive nudges with an unchanged open-item set before backing off |
| `injectTodoContext` | `true` | Append the current list to every model request (survives compaction) |
| `markdownFiles` | `[]` | Markdown checklists auto-subscribed for sessions in the project |
| `scope` | `"project"` | Only supervise sessions of the plugin's own project (`"project"` or `"all"`) |
| `pauseOnInterrupt` | `true` | Pause supervision after an interrupted execution until the user continues |
| `allowMultipleActive` | `false` | Let more than one item be `in_progress` at once (overridable per session with `todo_settings`) |
| `debugEvents` | `false` | Log the raw event stream |

## How it works

One server plugin instance runs per OpenCode location. It registers the todo
tools, subscribes to the session event stream to supervise activity, injects the
current list into each model request, and exposes an RPC contract that the TUI
reads.

### Event-driven supervision

The supervisor subscribes to the public event stream and keeps a per-session
state machine in memory (`src/supervisor.ts`). It does **not** trust a session
"status" flag — this runtime does not reliably emit one. Instead it tracks
**activity spans**: anything the runtime is currently doing, opened by a
`*.started` (or `.called`) event and closed by its matching
`*.ended`/`.success`/`.failed`:

| Doing | Opened by | Closed by |
| --- | --- | --- |
| turn | `execution.started` | `execution.succeeded/failed/interrupted`, `status idle` |
| step | `step.started` | `step.ended` (with `finish`, see below) |
| thinking | `reasoning.started` | `reasoning.ended` |
| writing | `text.started` | `text.ended` |
| preparing a tool | `tool.input.started` | `tool.input.ended` |
| running a tool (`task`, `shell`, …) | `tool.input.started`/`tool.called` | `tool.success`/`failed` |
| background shell | `shell.created` | `shell.exited`/`deleted` |
| queued input | `inbox.enqueued` | `inbox.delivered` |

A session is idle **only when nothing is open** — no span, no in-flight tool
call, no background shell, no still-busy child, no queued inbox item. A step that
ends with `finish:"tool-calls"` means "the turn continues" and never arms a
nudge; a step ending with `finish:"stop"`, an execution `succeeded/failed/
interrupted`, or a `status idle` is a **confirmed end of turn** (`endTurn()`),
which also heals spans whose close event was lost (an interrupt or a reload
mid-call).

### `evaluate(sessionID)`

On every relevant event the supervisor (re)arms a per-session timer and
recomputes from current state:

1. if there is nothing open in any source, or supervision is paused/blocked →
   stop;
2. if work is in flight (spans, tools, shells, busy children), measure the quiet
   time — schedule a re-check if it is under `stallMinutes`, otherwise send a
   **stall nudge** naming what is quiet;
3. if nothing is open, wait for the debounce — `settleMs` after a confirmed turn
   end, or the more conservative `stallMinutes` if no end-of-turn signal was ever
   seen — then send an **idle nudge**.

### Nudging

Nudges go out through `ctx.session.synthetic({ sessionID, text, description,
metadata })`, so the model receives them as ordinary instructions rather than a
visible user turn. Each nudge:

- carries the counts, the open items (with priorities), and an explainer — e.g.
  `Idle nudge #2 — the session went idle with 3 of 7 todos left.` or
  `Stall nudge #1 — no activity for ~7.2 min from: subagent ses_… / background
  shell "sleep 200" / tool subagent "Add the panel" / open step (stall threshold
  5 min).`;
- is rate-limited (`minNudgeIntervalMs`) and de-duplicated by an open-item hash;
- backs off after `maxNoProgressNudges` nudges with an unchanged list and resumes
  on the next `todo_write` (the panel's `s` can pause/resume too).

**Output counts as progress, not just events.** A shell/task writes its stdout to
a capture file, and appending to it emits no plugin event at all — so the
supervisor stats each tracked shell's capture (`shell.created.info.file`) and uses
its mtime as activity. A task that keeps printing is never "stalled", no matter
how few events it produces. The quiet clock is also **transitive**: a parent
includes the shells and tools of its still-busy children, and a child stops
counting once it has ended its turn.

### Context injection

On every model request (`ctx.session.hook("context")`) the plugin appends a
compact system block with the current list and a one-line policy. This is read
from an in-memory cache (kept fresh by tool writes and scans), so it adds no async
work per call — and it **survives compaction**: even if the `todo_write` history
is summarized away, the list is re-injected on the next request.

### Storage

A thin wrapper over `ctx.storage` (durable JSON scoped to the plugin):

| Key | Value |
| --- | --- |
| `todos/<sessionID>` | `{ version, sessionID, items[{ id, content, status, priority? }], updatedAt }` |
| `subs/<sessionID>` | `{ version, sessionID, files[], removed[], updatedAt }` |
| `claims/<sessionID>` | `{ tag, at }` — hot-reload ownership |

On startup the plugin scans `todos/` and reconciles against `ctx.session.get()`
(session gone → drop the entry; session alive → register and evaluate once).
Ids are assigned centrally on every write (and backfilled deterministically when
loading rows that predate them), so a list read from disk always has ids.
Supervision counters (nudge counts, no-progress, pause) are in-memory only; a
restart resets them, which is deliberate and simpler. Sessions are dropped on
`session.deleted`.

### Hot reloads

The runtime may load a new plugin generation before disposing the old one. Every
registration writes an **ownership claim** (`claims/<sessionID> = { tag, at }`),
and a nudge is only sent when no strictly newer claim exists — so exactly one
generation of the plugin nudge a given session, even while two are alive.
The event loop also stops as soon as its abort signal fires.

### Freshness

There is no filesystem watcher. Instead:

- `evaluate()`, RPC `list` and `todo_read` re-parse subscribed files fresh;
- a `ctx.tool.hook("execute.after")` re-parses immediately when an
  `edit`/`write`/`patch` touches a subscribed file and emits RPC `updated`;
- the open panel polls every 3 s.

## Development

- Edit any file in this directory → the running service hot-reloads the plugin
  (source edits and config content changes; `touch` alone does not).
- `opencode2 reload` forces reconciliation; `opencode2 service restart` only as a
  last resort (it interrupts sessions).
- Tests: `bun test` (130 tests across parser, storage, tools, RPC, state machine,
  panel helpers).
- Watch logs: `tail -f ~/.local/share/opencode/log/todo-supervisor.log`.

## Limitations

- The TUI panel/keyboard actions and toasts need a running TUI; the strip counts
  refresh on RPC `updated` (i.e. immediately after `todo_write`).
- The panel adds and removes **session** tasks (`a` / `d`). Markdown items are
  owned by their file: toggle one with `x`/`space`, edit the file to remove it.
- Markdown write-back edits your files: `x` on a markdown row rewrites that
  checkbox in place (temp file + atomic rename, only for subscribed paths). Use
  the panel filter and `d` if you only want to read.
- `pauseOnInterrupt` relies on the execution-interrupted event: after an
  interrupt, supervision resumes on the next `todo_write`/status event.
- No filesystem watcher: external edits are picked up at the next evaluation, the
  next UI read, or the panel's 3 s poll (see Freshness).
- Subscription reads can briefly lag across roles right after a write;
  supervision and the UI re-read per call and are unaffected.
- Runtimes that never emit an end-of-turn signal fall back to the `stallMinutes`
  window for idle nudges (see `evaluate`).

## License

MIT
