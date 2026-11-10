# opencode-todo-md

[![npm](https://img.shields.io/npm/v/opencode-todo-md)](https://www.npmjs.com/package/opencode-todo-md)
[![license](https://img.shields.io/npm/l/opencode-todo-md)](LICENSE)
[![CI](https://github.com/LeonVeganMan/opencode-todo-md/actions/workflows/ci.yml/badge.svg)](https://github.com/LeonVeganMan/opencode-todo-md/actions/workflows/ci.yml)

A todo list for OpenCode that lives in your repository: the agent, the sidebar and every session of the project read and
write the same `TODO.md`.

Session-scoped todo lists disappear with the session and lose their state on compaction. This plugin keeps the plan in
plain markdown, next to the code, so it survives restarts, is visible in `git diff`, and can be edited by hand without
breaking the metadata.

![The /todo dialog](screen/todo.png)

## Features

- `todo_write` / `todo_read` tools: the agent replaces the whole list or patches single items by id.
- `/todo`: a self-drawn dialog with filters, tags, sorting, search, scrolling and per-cell actions.
- `/note` and `opencode-notes.md`: per-project notes with `@tags` and optional reminders, shared with the agent.
- Sidebar strip reading `<session directory>/TODO.md`, refreshed on writes, on completed tool calls and every 60s.
- Stable ids, priorities, due dates, creation and completion dates, `@tags` derived from the task text.
- Checkboxes are rewritten in place: headings, notes and any other line of `TODO.md` are never touched.
- No build step: OpenCode loads the TypeScript sources directly.

An existing `TODO.md` needs no migration: checkboxes are read as-is and the metadata comment is added on the first
write. If the file uses plain bullets or numbered items instead of checkboxes, run `/todo import` once; it shows how
many items it will convert before touching anything.

## Install

From the plugin list in `~/.config/opencode/opencode.json`:

```json
{
  "plugins": ["opencode-todo-md"]
}
```

Or clone it for local development:

```sh
git clone https://github.com/LeonVeganMan/opencode-todo-md ~/.opencode/plugins/opencode-todo-md
```

OpenCode auto-loads every directory under the home-level `.opencode/plugins`, so no config entry is needed for a local
checkout. Restart the TUI (or run `/reload`) to load the TUI half after an update.

## Usage

### Agent tools

`todo_write` merges by default, so nothing is deleted unless you ask for it.

Add a task (no `id`) or update one (with `id`):

```json
{ "todos": [{ "content": "Fix login redirect", "status": "in_progress", "priority": "high" }] }
```

Patch only the fields that change:

```json
{ "todos": [{ "id": 3, "status": "completed" }] }
```

Replace the whole list, the only way to delete tasks; an empty list clears the file:

```json
{ "mode": "replace", "todos": [] }
```

`todo_read` prints the list with ids, priority, due, done and created dates. Ids are assigned on first appearance and
never reused, so a patch cannot hit the wrong task after a reorder.

### Command

| Command | Effect |
| --- | --- |
| `/todo` | Opens the dialog |
| `/todo add <text> [high\|medium\|low] [due=YYYY-MM-DD]` | Appends a task, no dialogs |
| `/todo done <id>` | Marks a task completed |
| `/todo init` | Creates `TODO.md` with `## To do` and `## Done` |
| `/todo import` | Adopts a hand-written list: plain `-`, `*` and `1.` items become checkboxes, after a preview |
| `/todo renumber` | Rewrites ids as 1..N by priority then due date, completed and cancelled last, after a warning |
| `/todo settings` | Opens the settings dialog: click a row to cycle its value |
| `/todo help` | Lists the subcommands (they are arguments of `/todo`, so the palette shows only `/todo`) |

### Dialog

```
● all (35)  ○ open (12)  ○ closed (23)  ○ overdue (0)
● all  ○ high  ○ medium  ○ low

＋ New task   Tag: @android ▸   Sort: status ▸

Search and press Enter (open, high, #12, @tag)

#id  st  prio  created     due         done        tag       description
#14  [ ] high  2026-10-28  2026-11-07  -           @android  Test credit pack…

▲ 1/14 ▼  14 tasks
```

- State tabs carry counters; `Tag:` cycles the tags found in the file; `Sort:` cycles status, due, priority, created,
  done and id.
- `＋ New task` opens a prompt for the text and a picker for the priority, then appends to `TODO.md`.
- `▲`/`▼` scroll the list by one screen (4 to 12 rows, from the terminal height); the mouse wheel works too.
- Search applies on Enter and understands `open`, `done`, `cancelled`, `high`, `medium`, `low`, `#12`, `@tag` and free
  text.
- One line per task, description last and clipped with `…` when the panel is narrow. Click `#id` or the description to
  edit, `st` to cycle pending → in progress → completed, `prio` to cycle, `due` to ask for a date, `tag` to filter by
  that task's first tag.
- Click the `#id`, `prio`, `created`, `due` or `done` header to sort by that column; the sorted column is marked with
  `▲`, a second click restores the default order. Open tasks stay on top in every sort, completed and cancelled last.
- The list has a cursor (`▸`): `↑`/`↓` move it and the list scrolls just enough to keep it visible, so the cursor
  never stops at the edge. `space` cycles the selected task's state, `ctrl+e` edits it, `ctrl+n` adds a task, `PgUp`/`PgDn` scroll one
  screen, `Home`/`End` jump to the first or last task.
- `ctrl+d` arms the selected task and shows `ctrl+d again to delete`: the second press removes the line, no dialog.
  `ctrl+z` puts the last deleted line back where it was, and `ctrl+g` renumbers the ids from 1.
- `/` gives the keyboard to the search box; `Enter` applies the query and gives the keyboard back to the list. `Esc`
  closes the dialog.

When the editor closes, the list reopens, so editing several tasks in a row is one flow. The dialog state (filter,
tag, sort, scroll position) restarts when you come back from the editor.

![The todo editor](screen/editor.png)

The editor itself (the `#id` cell) has the task text in a focused seven-line box that wraps long text instead of
scrolling it sideways (a pasted newline becomes a space, so a task stays one line), a row of priority chips and a row of
due chips (`none`, `today`, `+7d`, `+30d`). `✎ due` swaps focus to a second input where any `YYYY-MM-DD` can be typed;
`Tab` cycles the priority, `Enter` saves, `Esc` cancels and returns to the list. Status, created and done dates are
kept; marking a task completed stamps `done` with the current date, reopening clears it.

The dialog asks the host for the `xlarge` size (116 columns) and re-applies it when it mounts, because on this build a
size set before `show()` is ignored. The final width is still capped by the terminal: below ~118 columns the
`description` column is the one that gets clipped.

### Sidebar

![The sidebar strip](screen/sidebar.png)

The strip shows the open tasks of the session's project with ids, a priority colour and an overdue marker; the header
turns red when something is overdue and shows the highest priority among the open tasks. Clicking the header or a row
opens `/todo`, clicking the arrow collapses or expands the list (it starts collapsed above 3 open tasks). A file with
no checkboxes shows `Todo · no tasks` instead of nothing. Long task texts are clipped to one line instead of wrapping.

Markers: `•` in progress, `[·]` due today or within two days, `[!]` overdue. The row colour is the priority (red for
high, yellow for medium, muted for low); an overdue task is red regardless of priority.

## Notes

Notes are ideas, reminders and links that belong to the project but are not tasks: they have no state, no priority and
no completion. They live in `opencode-notes.md`, next to `TODO.md`:

![The notes panel](screen/notes.png)

```markdown
# Notes

- Check the deploy token @infra <!-- id=1 created=2026-11-05 remind=2026-11-05T18:30 -->
```

- `/note <text>` appends a note; `@tag` works as in tasks. Add `remind=15m`, `remind=2h`, `remind=1d` or
  `remind=2026-11-05T18:30` for a reminder; the relative form is resolved when the note is captured.
- `/note` opens the list: `ctrl+n` adds, `ctrl+e` edits, `s` snoozes the reminder by 5 minutes, 30 minutes or 1 hour (or
  clears it), `ctrl+d` deletes after a second press, `esc` closes.
- Reminders are checked every 30 seconds by the TUI. A toast appears once per note and reminder while OpenCode is open;
  nothing fires when it is closed, and the agent is not woken up. Snoozing changes the reminder time, so it fires again.
- The agent creates notes with `note_add`, updates them with `note_write` and removes them with `note_delete`; `note_read`
  lists them, so it can recall a note in a later session.
- The file is plain markdown and can be edited by hand; only note lines with the metadata comment are touched.

Press `tab` inside the panel to cycle the filters: all notes, notes with a due reminder, and one filter per `@tag`.

Press `/` inside the panel to search the visible notes. The sidebar shows `Notes due/total` and the first note whose
reminder is due; click either line to open the panel.

## Settings

`/todo settings` opens a dialog where every row cycles its value on click, or from the `Settings ▸` row in the todo
panel. Nothing is written until you press **Save**; **Cancel** discards the draft, **Reset to defaults** restores
every value, **Export JSON** and **Import JSON** move the whole set through a file. Settings are read when a dialog or
the sidebar strip is created, so a change applies the next time it opens; `Esc` cancels.

![The settings dialog](screen/settings.png)

They live in two JSON files, both optional:

| File | Scope |
| --- | --- |
| `~/.config/opencode/todo-md.json` | every project |
| `<project>/.opencode/todo-md.json` | that project, wins over the global file |

The `Save to` row decides which file **Save** writes. Unknown keys and invalid values are ignored and fall back to
the defaults, so a broken file never takes the panel down.

| Setting | Values | Default |
| --- | --- | --- |
| `padding` | 0, 1, 2 | 1 |
| `palette` | `theme` (host theme tokens), `fixed` (Catppuccin Mocha) | `theme` |
| `showCreated`, `showDone`, `showTags` | on/off | on |
| `descriptionWidth` | 20–80 characters | 50 |
| `stripMax` | 10–80 characters per sidebar row | 30 |
| `stripCollapse` | 1–20 open tasks before the strip folds | 3 |
| `stripCompleted` | show completed tasks in the strip | off |
| `stripHeaderColor` | colour the strip header by the highest priority | on |
| `pageRows` | list rows: 0 (fit the terminal) or 4–30 | 0 |
| `initialFilter` | `all`, `open`, `closed`, `overdue` | `all` |
| `initialSort` | `status`, `id`, `priority`, `created`, `due`, `done` | `status` |
| `deleteMode` | `double` (two `ctrl+d`), `dialog` (confirmation) | `double` |
| `renumberAfterDone` | run `/todo renumber` after completing a task | off |
| `autoInit` | create `TODO.md` the first time `/todo` opens | off |
| `showHints` | shortcut bar under the list (click it for the full key list) | on |
| `saveTo` | `global`, `project` | `global` |

`renumberAfterDone` rewrites every id, so references in older messages stop matching: leave it off unless you do not
care about ids.

## Agents

Installing the plugin is enough for the tools to exist: `todo_write`/`todo_read` and `note_read`/`note_add`/
`note_write`/`note_delete` are registered with their descriptions, so the agent sees them in every session of every project. What the
plugin cannot decide is *when* the agent should use them instead of the conversation, and that is what an instruction is for.

Project-local `AGENTS.md`, at the repository root:

```markdown
If the project has a TODO.md at the root, keep it updated with todo_write instead of editing the file by hand: the
id/priority/due/created metadata lives in the trailing HTML comment. A write merges by default, so send only the new
tasks (no id) or the ones to change (with id); use mode "replace" with the full list only to delete tasks. Never use
mode "replace" to add a task: it deletes every task you did not list. Projects without TODO.md have no list to keep.
```

Global, so every project inherits it, in `~/.agents/AGENTS.md`:

```markdown
When a project has a TODO.md at its root, use todo_write / todo_read to keep it current instead of a session-only
list. Close a task with status: "completed" (or completed: true); the done date is automatic.
```

For notes, the same idea in one paragraph:

```markdown
If the project has an opencode-notes.md, call note_read before starting work and note_add to capture ideas or
reminders. Notes have no status or priority: keep them short, add @tags, and set `remind` when the user asks to be
reminded (15m, 2h, 1d or an ISO local time). Use note_write with the id to change one; note_delete removes it.
```

`todo_write` closes a task with `status: "completed"` (or `completed: true`); `completed: false` reopens it. The `done`
date is written automatically, so an explicit `done` value is only a completion signal.

The same text can be attached with the `instructions` array in `opencode.json`, which is handy when you ship the rule
with a team config:

```json
{ "instructions": ["~/.config/opencode/todo-instructions.md"] }
```

Without an instruction the tools still work and most models reach for them on multi-step tasks, but nothing enforces
it: the plugin cannot inject a system prompt.

## File format

```markdown
# TODO

- [ ] Fix login redirect <!-- id=1 priority=high due=2026-11-05 created=2026-10-30 -->
- [•] Write release notes @docs <!-- id=2 created=2026-10-30 -->
- [x] Add screenshot <!-- id=3 done=2026-10-31 created=2026-10-28 -->
```

`status` comes from the checkbox: `[ ]` pending, `[•]` in progress (`[~]` is read the same way), `[x]` completed, `[-]`
cancelled. Everything after the task text is an invisible HTML comment, so the rendered markdown stays clean.

## Development

```sh
bun test    # unit tests for the checklist, filters, sorting and string tables
bun run check
```

The plugins live in the same repository as the sources; OpenCode resolves `@opencode/plugin` at runtime, so nothing has
to be installed locally to try a change.

Releases: bump the version, add a `## What's new in X` section to `ANNOUNCE.md`, then push the `vX` tag. The release
workflow builds the GitHub Release body from that section with `scripts/release-body.ts`, so the notes live in one place.

## Changelog

### 0.1.20

- `todo_write` accepts `completed: true`/`false` and a `done` value as aliases for `status: "completed"`/`"pending"`,
  so an agent can close or reopen a task without editing `TODO.md` by hand.
- The `done` date remains automatic; an explicit `done` value is only a completion signal.

### 0.1.19

- `note_add` creates a note; `note_write` now only patches an existing note by `id`, so creating and updating cannot be
  confused.
- `todo_write` accepts `id: 0` as "new task", the same as omitting `id`.

### 0.1.18

- Project notes in `opencode-notes.md`: `/note` captures ideas with stable ids, `@tags` and an optional reminder;
  `/note` opens a searchable list with filters, snooze and delete.
- `note_read`, `note_write` and `note_delete` let the agent read and update the same notes across sessions.
- The sidebar lists the notes above the todo list, collapsible, with due reminders in red; reminders fire a toast while
  the TUI is open.

### 0.1.17

- `ctrl+z` restores the last deleted task at its original position; `ctrl+g` renumbers the ids without leaving the list.
- `/todo renumber` orders ids by priority and then due date, with completed and cancelled tasks last.
- The default list order follows the same rule, so the panel and the ids agree.
- Every column sort keeps open tasks on top and closed ones at the bottom; `prio` breaks ties on the nearest due date.

### 0.1.16

- Clicking the description opens the editor, like clicking `#id`; only the state cell cycles a task.
- The row order stays put while the dialog is open, so a state or priority click no longer moves the row under the
  pointer. The list re-sorts on every reopen.

### 0.1.15

- Clicking the state cell, or the description, cycles a task pending → in progress → completed; `space` cycles the
  selected task.
- The state tabs gain an `in progress` filter.
- The editor opens the description in a seven-line box that wraps long text instead of scrolling it sideways; a
  pasted newline becomes a space, so a task stays one line.
- Due chips use English labels (`today`, `+7d`, `+30d`), and the editor hint fits the dialog width.

### 0.1.14

- `todo_write` with `mode: "replace"` accepts tasks without `status` and defaults them to `pending`, like merge.
- The sidebar marks tasks due today or within two days with `[·]`; `[!]` stays for overdue, and the high-priority `!`
  is gone because the colour already carries it.
- The help dialog lists the sidebar symbols.
- Render errors in the sidebar and the dialogs are caught and appended to `~/.local/state/opencode/todo-md-errors.log`.

### 0.1.13

- The panel has a rounded border, configurable with `borderStyle` (`rounded`, `single`, `none`); it turns red while a
  delete is armed.
- The list scrolls instead of paging: the cursor moves over every task and the view follows it.
- Settings values are clipped to their column, `Save to` shows `global` or `project`, and the dialog re-centres itself.
- The editor, the settings and the help dialogs use the same rounded border.

### 0.1.12

- Settings values share a right edge, and the dialog is drawn like the README screenshot.
- The shortcut bar is one compact line at the bottom; clicking it opens the full key list, and `showHints` turns it off.
- The help list is generated from `SHORTCUTS`, with a parity test against the bindings in the panel, and it no longer
  overflows the dialog.

### 0.1.11

- Per-column colours in the list, drawn from the host theme or from the fixed Catppuccin palette (`palette` setting).
- Configurable padding inside the panel, and `/todo settings`: 17 options stored in a global or per-project
  `todo-md.json`, read by both the dialog and the sidebar strip.
- Column `created`, `done` and `tag` can be hidden; the description width is configurable.
- The sidebar strip width, fold threshold, completed tasks and header colour are configurable, as are the visible list rows,
  the starting filter and sort, the delete confirmation and automatic `TODO.md` creation.

### 0.1.10

- Fix the plugin failing to load with `ReferenceError: TODO_STATUSES is not defined`: `src/index.ts` used
  `TODO_STATUSES` and `TODO_PRIORITIES` without importing them, so 0.1.8 registered no tools at all.

### 0.1.8

- `todo_write` merges by default: items without an `id` are appended and items with an `id` are updated, so a partial
  write can no longer wipe the rest of the list. `mode: "replace"` is the only way to delete tasks.
- The list returned by `todo_write` is the one actually stored in `TODO.md`.

### 0.1.7

- `/todo renumber` rewrites ids as 1..N, highest priority first and then by due date; it warns first, because ids are
  stable by design and old references will point at another task.

### 0.1.6

- `ctrl+n` opens the new-task flow from the keyboard, so the whole list is reachable without the mouse.

### 0.1.5

- `ctrl+e` opens the selected task in the editor, so the whole list is reachable without the mouse.

### 0.1.4

- `PgUp`/`PgDn` and `Home`/`End` move through pages, `↑`/`↓` still turn the page at the row edges.

### 0.1.3

- Clicks work again: the dialog size is applied when it mounts, so the mouse hit grid matches the panel.
- `/` gives the keyboard to the search box, `Enter` applies the query, `Esc` closes. `↑`/`↓` keep the list cursor and
  turn the page at the edges.
- `ctrl+d` twice deletes the selected task without a dialog; the first press shows `ctrl+d again to delete`.
- The current row is marked with `▸` and bold cells.
- The description is a column again, on one line, and is clipped only when the terminal is narrower than the dialog.

### 0.1.2

- `/todo` is drawn by the plugin instead of the host select: one-line filter tabs with counters, sortable columns,
  paging, per-cell clicks, `Tag:` and `Sort:` cycles that survive the whole dialog.
- Stable ids, due dates, creation and completion dates, `@tags` read from the task text.
- `/todo import` adopts an existing list of bullets or numbered items after a preview, `/todo help` lists the
  subcommands.
- Sidebar strip compacted: rows no longer wrap and the overdue marker is ASCII.
- `@opentui/core`, `@opentui/solid` and `solid-js` are dependencies, so the TUI half loads from npm.

### 0.1.1

- TUI dependencies declared: before this the strip and `/todo` failed to load with
  `Cannot find package '@opentui/solid'`.

## License

MIT
