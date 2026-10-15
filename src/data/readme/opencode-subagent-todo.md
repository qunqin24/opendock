# opencode-subagent-todo

Per-session task tracking for [opencode](https://opencode.ai) subagents.

opencode ships a built-in `todowrite` tool for the main agent, but it is denied to
subagents (see [anomalyco/opencode#12938](https://github.com/anomalyco/opencode/issues/12938)).
That leaves subagents with no cheap way to keep a plan: re-emitting a checklist in
chat burns context on every turn and is easy to get wrong.

This project provides a lightweight alternative:

- **`track` tool** — a small, deterministic checklist stored **per session**, so lists
  never leak between sessions and cost no context between calls. The model only sends
  deltas (`add` / `done` by id) and does not restate the whole list. Mutations return
  **only the changed line(s)**, and the full checklist is available on demand via
  `list` — so a long plan does not get duplicated in the context on every step. Steps
  can also be added in one call (`items: [...]`).
- **`opencode-subagent-todo` plugin** — registers the `track` tool and appends a
  short system-prompt note to **every** session telling the model to prefer
  `todowrite` when it is available, and to fall back to `track` otherwise (i.e. as a
  subagent).

**What "session" means.** A session is one opencode agent run, not your chat window.
Every subagent runs in its own session, so within a single conversation the primary
agent and each subagent it spawns get **separate** lists — siblings never share state.
Resuming a subagent with `task_id` reuses its session (and therefore its list); a fresh
subagent gets a fresh, empty list.

## How it works

- The `track` tool is registered by the plugin, so every agent — including
  subagents at any nesting depth — receives it automatically. No per-agent
  configuration is required.
- State lives in `$XDG_DATA_HOME/opencode/agent-todos/<sessionID>.json`
  (`~/.local/share/opencode/agent-todos/` by default), one file per session, written
  atomically. Files untouched for more than 7 days are pruned; an unreadable file is
  moved to `<name>.json.corrupt-<ts>` rather than silently overwritten.
- The plugin adds a one-line `track` hint via `experimental.chat.system.transform`, but
  only for subagent sessions — it detects them by the session's parent id (subagent
  sessions are created by the `task` tool and carry a `parentID`), so primary agents
  (which have `todowrite`) do not pay for the note. The hint is worded to be correct
  either way ("use `todowrite` when available, otherwise `track`"), and the lookup is
  cached per session and fails open.

## Install

Requires opencode 1.x.

### From npm (recommended)

Add the package to the `plugin` array in your `opencode.json`; opencode installs it
(and its dependencies) automatically at startup:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-subagent-todo"]
}
```

That single package registers the `track` tool and the system-prompt hint — no repo
checkout or file copying needed.

### From a local checkout (development)

```sh
npm install          # resolves @opencode-ai/plugin (for the tool's zod schema)
./install.sh         # symlinks the plugin into ~/.opencode
```

`install.sh` links into `~/.opencode` by default. To target the XDG config directory
instead:

```sh
OPENCODE_DOTDIR=~/.config/opencode ./install.sh
```

Then restart opencode.

### Allowing `track` for the built-in `explore` subagent

`explore` denies all tools by default (`"*": "deny"`) and only re-allows a read-only
set. To let it use `track`, add a rule to `agent.explore.permission` in your
`opencode.json` (config rules are appended last and win):

```json
{
  "agent": {
    "explore": {
      "permission": { "track": "allow" }
    }
  }
}
```

Other subagents (e.g. `general`, or any custom agent) receive `track` by default.

## Tool reference

`track(action, text?, items?, id?)`

| action     | args            | result                                                          |
| ---------- | --------------- | --------------------------------------------------------------- |
| `add`      | `text` or `items` | appends todo(s) `[ ]`; prints only the added line(s)          |
| `start`/`doing` | `id`       | sets item in-progress `[.]`; at most one item can be in `doing` state at a time (if another is `doing`, it is reset to `todo` and the reset is reported in the output; starting an already `doing` item is idempotent); prints only that line |
| `done`     | `id`            | marks the item done `[x]`; prints only that line              |
| `list`     | —               | prints the full checklist `#id [marker] text` followed by a `(done/total done…)` progress summary line, or `(empty)` when there are no items |
| `clear`    | —               | deletes the session's list; prints `cleared`                  |
| `remove`   | `id`            | removes item; returns confirmation + full renumbered list     |
| `edit`     | `id`, `text`    | changes text preserving status; returns changed line          |

Mutations return **only the changed line(s)** (plus a progress count) so the checklist
is never duplicated in the model's context. Call `list` when you need the full state
(e.g. to reorient, or after a context compaction); it appends a progress summary line
(e.g. `(1/3 done, 1 doing)`) after the checklist, or prints `(empty)` when the list has
no items. Passing `items: string[]` to `add` creates several steps in a single call.

## Development

```sh
npm run typecheck    # tsc --noEmit
npm test             # node:test against tool/track.ts
```

## Layout

```
tool/track.ts                      the `track` tool (registered by the plugin)
plugins/opencode-subagent-todo.ts  plugin entry: registers `track` + system-prompt hint
test/track.test.ts                 unit tests
test/plugin.test.ts                plugin tests
install.sh                         symlink installer (local checkout)
tsconfig.json                      typecheck config
```

## License

MIT
