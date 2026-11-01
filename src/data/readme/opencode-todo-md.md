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
- `/todo`: a self-drawn dialog with filters, tags, sorting, search, paging and per-cell actions.
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

`todo_write` takes the complete list, which replaces the previous one:

```json
{ "todos": [{ "content": "Fix login redirect", "status": "in_progress", "priority": "high" }] }
```

or a patch list, where each item carries an `id` plus only the fields to change:

```json
{ "todos": [{ "id": 3, "status": "completed" }] }
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
| `/todo help` | Lists the subcommands (they are arguments of `/todo`, so the palette shows only `/todo`) |

### Dialog

```
● all (35)  ○ open (12)  ○ closed (23)  ○ overdue (0)
● all  ○ high  ○ medium  ○ low

＋ New task   Tag: @android ▸   Sort: status ▸

Search and press Enter (open, high, #12, @tag)

#id  st  prio  created     due         done        tag       description
#14  [ ] high  2026-10-28  2026-11-07  -           @android  Test credit pack…

▲ 1/2 ▼  14 tasks
```

- State tabs carry counters; `Tag:` cycles the tags found in the file; `Sort:` cycles status, due, priority, created,
  done and id.
- `＋ New task` opens a prompt for the text and a picker for the priority, then appends to `TODO.md`.
- `▲`/`▼` page through the list, `pageSize()` rows per page (4 to 8, from the terminal height).
- Search applies on Enter and understands `open`, `done`, `cancelled`, `high`, `medium`, `low`, `#12`, `@tag` and free
  text.
- Click a cell: `#id` edits, `st` and description toggle completed, `prio` cycles, `due` asks for a date, `tag` filters
  by that task's first tag.
- Click the `#id`, `prio`, `created`, `due` or `done` header to sort by that column; the sorted column is marked with
  `▲`, a second click restores the default order.
- `↑`/`↓` move the cursor, `space` toggles, `enter` edits, `ctrl+d` deletes, `Esc` closes.

When the editor closes, the list reopens, so editing several tasks in a row is one flow. The dialog state (filter,
tag, sort, page) restarts when you come back from the editor.

The editor itself (`#id` cell or `enter`) has the task text in a focused input, a row of priority chips and a row of
due chips (`none`, `today`, `+7d`, `+30d`). `✎ due` swaps focus to a second input where any `YYYY-MM-DD` can be typed;
`Tab` cycles the priority, `Enter` saves, `Esc` cancels and returns to the list. Status, created and done dates are
kept; marking a task completed stamps `done` with the current date, reopening clears it.

The dialog asks the host for the `xlarge` size, but the final width is the host's. When the terminal is narrower than
the table (109 characters plus margins) the `description` column is the one that gets clipped.

### Sidebar

![The sidebar strip](screen/sidebar.png)

The strip shows the open tasks of the session's project with ids, a priority colour and an overdue marker; the header
turns red when something is overdue and shows the highest priority among the open tasks. Clicking the header or a row
opens `/todo`, clicking the arrow collapses or expands the list (it starts collapsed above 3 open tasks). A file with
no checkboxes shows `Todo · no tasks` instead of nothing. Long task texts are clipped to one line instead of wrapping.

## Agents

Installing the plugin is enough for the tools to exist: `todo_write` and `todo_read` are registered with their
descriptions, so the agent sees them in every session of every project. What the plugin cannot decide is *when* the
agent should keep the plan in this file instead of the conversation, and that is what an instruction is for.

Project-local `AGENTS.md`, at the repository root:

```markdown
If the project has a TODO.md at the root, keep it updated with todo_write: run todo_read first, then send the complete
list. Do not edit the checkboxes by hand, the id/priority/created/done metadata lives in the trailing HTML comment.
Projects without TODO.md have no list to keep.
```

Global, so every project inherits it, in `~/.agents/AGENTS.md`:

```markdown
When a project has a TODO.md at its root, use todo_write / todo_read to keep it current instead of a session-only
list.
```

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

## Changelog

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
