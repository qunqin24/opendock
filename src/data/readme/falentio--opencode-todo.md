# opencode-todo

An OpenCode v2 plugin that gives the agent a phased todo list, and gives you a
`/todo` command to inspect and edit it.

A port of [`@gamaraan/todos-tool`](https://github.com/gamaraan/todos-tool-pi-extension),
a pi coding-agent extension, which is itself a port of [Oh My Pi](https://github.com/oh-my-pi)'s
todo tool. The tool's semantics, prompts, and tests come from that lineage.

```
Todo  2/5 done
  I. Foundation 1/2
    ✓ Scaffold crate
    ○ Wire workspace
  II. Auth 1/3
    ○ Port credential store
```

## What the agent gets

A `todo` tool with nine operations. Tasks are addressed by their exact content
string, never by a generated ID.

| `op`      | Fields                               | Effect                                      |
| --------- | ------------------------------------ | ------------------------------------------- |
| `init`    | `list: [{phase, items}]`             | Replace the whole list                      |
| `start`   | `task`                               | Mark in progress                            |
| `done`    | `task` or `phase`                    | Mark completed                              |
| `drop`    | `task` or `phase`                    | Mark abandoned                              |
| `block`   | `task` or `phase`; optional `reason` | Mark blocked, waiting on something external |
| `unblock` | `task` or `phase`                    | Blocked task back to pending                |
| `rm`      | optional `task` or `phase`           | Remove; omit both to clear                  |
| `append`  | `phase`; `items`                     | Add tasks, creating the phase if needed     |
| `view`    | none                                 | Read-only echo                              |

Three behaviors matter when reading the code:

- **Auto-promote fires only when nothing is in progress.** Completing a task
  with no in-progress task promotes the earliest open one. Out-of-order work can
  move the pointer back to an earlier phase, which is expected; a completed task
  never reverts.
- **A failing batch is discarded whole.** A half-applied batch makes a retry hit
  "already exists" for the operations that did land, so nothing is applied and
  the previous state stands.
- **A missing `op` is repaired when the shape is unambiguous.** `{list: [...]}`
  is `init`, `{phase, items}` is `append`, and bare `items` on an empty list is
  `init`. Every other shape is an error.

## What you get

```
/todo                              Show current todos
/todo edit                         Open todos in $EDITOR
/todo copy                         Print todos as Markdown
/todo export [<path>]              Write todos to a file (default TODO.md)
/todo import [<path>]              Replace todos from a file (default TODO.md)
/todo append [<phase>] <task...>   Append a task, creating the phase if needed
/todo start  <task>                Mark a task in progress
/todo done   [<task|phase>]        Mark a task, a phase, or everything completed
/todo drop   [<task|phase>]        Mark abandoned
/todo rm     [<task|phase>]        Remove
```

Task and phase arguments match fuzzily: exact first, then a unique prefix, then
a unique substring. Manual edits are recorded and the model is told what changed,
including an explicit "do not recreate" instruction after a removal.

## Session behavior

While the tool is enabled, the plugin watches the session and can inject three
hidden messages.

- **Eager prelude.** With `eager` set to `preferred` or `always`, the first turn
  of a new session asks the model to lay out a phased plan with one `init` call.
  A resumed session never injects it, and neither does a prompt ending in `?` or
  `!`. OpenCode cannot force a tool call, so `always` injects a MUST-call
  reminder rather than a `tool_choice`.
- **Mid-run nudge.** After 12 successful mutating tool calls with work still
  open, a nudge asks the model to mark finished tasks done. At most two per
  cycle.
- **Completion reminder.** When the model stops with work still open, a reminder
  lists the open items and starts a fresh turn. It never fires while the model is
  waiting on your answer, and it pauses until the model makes progress.
  `remindersMax` caps it at 3 per cycle by default.

The plugin also contributes a `todo-discipline` skill. Its description sits in
every system prompt, and it mandates a phased `init` before multi-step work and
marking each task done as it finishes rather than batching at the end.

## Sidebar

The todo list renders live in the session sidebar. The sidebar is part of the
TUI, so it needs a TUI plugin entrypoint rather than the server plugin that
provides the tool:

```
~/.config/opencode/cli.json
{
  "plugins": ["@falentio/opencode-todo"]
}
```

The list appears when the terminal is wide enough, because `session.sidebar`
defaults to `"auto"` and only opens above 120 columns. Set it to `"auto"` or
`"show"` in `cli.json` to control that.

Rows lead with the overall count, then each phase with its own done count, then
that phase's open tasks. A phase with more tasks than fit collapses to the most
relevant ones and a `… N more` line, the same walking viewport the pi extension's
HUD used.

```
1/3 done
Foundation 1/2
✓ scaffold crate
○ wire workspace
Auth 0/1
○ port credential store
```

The view reads the todo state the tool already reports, so nothing extra is
persisted and there is no side channel. It updates on each `todo` tool result.
A `/todo` edit changes the stored list without producing a tool result, so it
appears on the next `todo` tool result rather than immediately.

## Install

Two plugin entrypoints, so two config files. The server plugin registers the
`todo` tool, the `/todo` command, the skill, and the session reminders. The TUI
plugin paints the sidebar.

From npm, add the server plugin to `opencode.json`:

```json
{
  "plugins": ["@falentio/opencode-todo"]
}
```

Add the same package to `cli.json` to get the sidebar:

```json
{
  "plugins": ["@falentio/opencode-todo"]
}
```

From a checkout, symlink the package directory into both discovery paths:

```bash
vp install && vp pack
ln -s "$PWD" ~/.config/opencode/plugins/opencode-todo
```

A checkout resolves the server entrypoint through `.opencode/plugins/`, and the
TUI entrypoint through the `plugins` array in `cli.json` or `opencode.json`.

## Configure

Settings come from four places, each overriding the last:

1. built-in defaults
2. `~/.config/opencode/todo.json`
3. `<project>/.opencode/todo.json`
4. `OPENCODE_TODO_*` environment variables, then the plugin entry's `options`

```json
{ "enabled": true, "reminders": true, "remindersMax": 3, "eager": "default" }
```

| Key            | Default     | Meaning                                                                                                           |
| -------------- | ----------- | ----------------------------------------------------------------------------------------------------------------- |
| `enabled`      | `true`      | Registers the tool and every session behavior. A `false` in the global file is a floor; nothing can re-enable it. |
| `reminders`    | `true`      | Stop-time reminders.                                                                                              |
| `remindersMax` | `3`         | Reminder attempts per cycle.                                                                                      |
| `eager`        | `"default"` | `"default"`, `"preferred"`, or `"always"`.                                                                        |

The environment variables are `OPENCODE_TODO_ENABLED`, `OPENCODE_TODO_REMINDERS`,
`OPENCODE_TODO_REMINDERS_MAX`, and `OPENCODE_TODO_EAGER`. An invalid value warns
and keeps the previous one instead of silently falling back to the default.

## How it is built

State lives in OpenCode's plugin storage, one key per session. There is no
sidecar file.

```
ctx.tool.transform     → the todo tool
ctx.command.transform  → /todo
ctx.skill.transform    → todo-discipline
ctx.session.hook       → reads history, feeds the reminder tracker
ctx.session.synthetic  → injects a reminder and starts a turn
ctx.storage            → the persisted phase list
ctx.ui.slot (TUI)      → the sidebar view
```

`src/` splits into a host-free core and thin v2 adapters:

```
src/
  types.ts          TodoStatus, TodoPhase, the tool's JSON Schema
  validate.ts       raw arguments and stored snapshots → typed values
  state.ts          pure reducers: every op, normalization, op inference
  execute.ts        one op against the phase list, with batch atomicity
  format.ts         the summary the model reads
  hud.ts            the sidebar view model (rows, counts, truncation)
  markdown.ts       Markdown round-trip for export, import, and edit
  persistence.ts    one storage key per session
  config.ts         file, environment, and option precedence
  prompts.ts        tool description and injected-message text
  tracker.ts        eager prelude, mid-run nudge, completion reminder
  command.ts        the /todo verbs
  skill.ts          loads the bundled skill
  index.ts          wiring only
  tui.tsx           the sidebar slot adapter
```

The pure modules carry no OpenCode import. They are testable alone, and the
ported test suite exercises them directly. `tui.tsx` is the one exception and
stays a thin shell over `hud.ts`, so the view logic is unit tested rather than
eyeballed in a terminal.

## Develop

```bash
vp install
vp test run          # 174 unit tests
npx tsc --noEmit     # typecheck
vp check             # format and lint
vp pack              # build dist/
node scripts/smoke.mjs
node scripts/sidebar-check.mjs
node scripts/publish-probe.mjs
```

`scripts/smoke.mjs` drives two real `opencode` processes in a sandbox directory,
then asserts against the exported session transcript. It checks that the tool is
in the model's catalog, that `init` ran and persisted, that a second process read
the list back with `view`, that the reminder fired, and that the command and
skill registered. Add `--load` to skip the model calls.

The transcript is the evidence rather than the model's reply, because a model
will sometimes report "there is no todo tool" while the tool result sits in the
transcript.

`scripts/sidebar-check.mjs` proves the sidebar render. It boots one
`opencode serve`, attaches both a CLI and a TUI to it, drives a real todo list,
and asserts against the painted terminal log, because the sidebar is drawn by
the TUI and never appears in the transcript. Add `--boot` to skip the model
calls. Two processes with `--standalone` would each get a private server, so no
event could cross between them; one shared server is what makes the check real.

`scripts/publish-probe.mjs` proves the packed artifact works the way a published
install uses it. It runs two arms. The first npm-installs the tarball and imports
the entrypoint with a bare `node` process, which has no access to the checkout's
`node_modules`. The second unpacks the tarball under a `node_modules` path and
boots the TUI against it, then reads the loader log for both entrypoints.

Both arms catch failures a checkout hides. `dist/index.mjs` must not import a
package it does not declare, because an optional peer installs nothing and the
import throws only on a real install. The TUI entrypoint must not be raw `.tsx`,
because the host's JSX transform skips paths under `node_modules`, so a `.tsx`
entry works from a symlinked checkout and fails once published. Add `--keep` to
keep the sandbox.

## Differences from the pi extension

| pi extension                                              | This plugin                                       |
| --------------------------------------------------------- | ------------------------------------------------- |
| Session branch replay for persistence                     | `ctx.storage`, one key per session                |
| Custom TUI rendering (roman numerals, collapsed viewport) | The session sidebar; no roman numerals            |
| Desktop notifications over the pi EventBus                | Dropped; v2 has no plugin-facing notification bus |
| `--todo-*` CLI flags                                      | Environment variables and plugin `options`        |
| `$EDITOR` fallback outside the TUI                        | `$EDITOR` only; v2 has no plugin editor dialog    |
| OSC 52 clipboard for `/todo copy`                         | Prints the Markdown                               |

## License

MIT. Ported from Oh My Pi (MIT, © Can Bölük) and pi (MIT, © Mario Zechner).
