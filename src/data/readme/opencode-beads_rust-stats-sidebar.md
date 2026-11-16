# opencode-beads_rust-stats-sidebar

[![npm version](https://img.shields.io/npm/v/opencode-beads_rust-stats-sidebar)](https://www.npmjs.com/package/opencode-beads_rust-stats-sidebar)

[Русская версия](https://github.com/melik/opencode-beads_rust-stats-sidebar/blob/main/README.ru.md)

An OpenCode V2 plugin that displays [beads_rust](https://github.com/Dicklesworthstone/beads_rust) statistics and the current task, or the epic it belongs to, in the terminal UI sidebar.

## What it displays

- The total number of tasks.
- Counts of open, in-progress, blocked, and closed tasks.
- A 10-character bar and percentage of the total for each category.
- An `Epics ready to close: 2` line (or `Эпики готовые к закрытию: 2` for the Russian locale) when epics have all their child tasks closed. This line appears only when the count is positive, after the statistics.
- Exactly one current-task block below the statistics. The current task is the most recently updated in-progress task, or, when nothing is in progress, the most recently closed task.
- If the current task belongs to an open epic, the block shows that epic: a `▼ <epic-id> <percent>% (<done>/<total>)` summary line followed by its child tasks.
- Otherwise the block shows the current task as a single row: `[✓] Title` for a closed task or `[◐] Title` for an in-progress task.
- A status glyph before each task: `✓` closed, `◐` in progress, `○` ready, `●` blocked, `❄` deferred. Blocked is inferred for open epic children that are absent from `br ready --json`.

Example: tasks in an epic

```text
Beads
Total tasks: 8
Open        ■■■■■□□□□□ 4 (50%)
In progress ■■■□□□□□□□ 2 (25%)
Blocked     ■■■□□□□□□□ 2 (25%)
Closed      ■□□□□□□□□□ 1 (13%)

▼ opencode-e2-auth-5u3 20% (1/5)
[✓] End-to-end authentication flow
[○] Public access and revocation
[◐] Comment moderation
[●] Rate limits and concurrency
[❄] Deferred email notifications
```

Example: a single current task

```text
Beads
Total tasks: 8
Open        ■■■■■□□□□□ 4 (50%)
In progress ■■■□□□□□□□ 2 (25%)
Blocked     ■■■□□□□□□□ 2 (25%)
Closed      ■□□□□□□□□□ 1 (13%)

[◐] Fix retry loop
```

## How it works

The server part of the plugin runs five read-only commands in the current project directory:

```sh
br stats --json --no-activity
br epic status --json
br ready --json
br list --status in_progress --json
br list --status closed --json
```

The total count and status statistics come from `stats`. The number of epics ready to close is derived from the `eligible_for_close` flags in `epic status --json`, so the epic list and the count share a single source. All five commands run in parallel when the plugin loads, and again 5 seconds after each request completes.

The plugin then picks one current task: the most recently updated task from `br list --status in_progress --json`, or, when that list is empty, the most recently updated task from `br list --status closed --json`. An in-progress task always has priority. `.beads/last-touched` is no longer read.

The plugin resolves the current task's parent with `br show <task-id> --json`, because `br list --json` does not include the `parent` field. If the resolved `parent` matches one of the open epics from `br epic status --json`, the plugin runs `br show <epic-id> --json` and renders that epic with its child tasks. For an epic, `done` counts closed children and `total` counts all parent-child children. Open children present in `br ready --json` are shown as ready, and open children absent from it are shown as blocked.

Otherwise the current task is rendered as a single row. When there is neither an in-progress nor a closed task, no task block is shown.

The TUI part passes the current project's location to RPC, so statistics are not mixed with those of other open projects. The block is hidden until the first successful response. During subsequent updates, the last received data remains visible.

If Beads is not initialized, `br` is unavailable, or reading `stats` fails, the plugin hides the entire block. If any command or response used for the current task or its epic fails or returns malformed data, the statistics and the epics line remain visible, and only the task block is omitted.

## Installation and updates

Requirements:

- OpenCode V2 with support for `sidebar.content`;
- the `br` command available in the OpenCode server process's `PATH`;
- an initialized `.beads` directory in the project.

Install the plugin globally using the OpenCode V2 CLI, either from npm or directly from GitHub:

```sh
opencode plugin add opencode-beads_rust-stats-sidebar
```

```sh
opencode plugin add github:melik/opencode-beads_rust-stats-sidebar
```

Alternatively, configure it declaratively in `opencode.jsonc`: globally in `~/.config/opencode/opencode.jsonc`, or in the project in `opencode.jsonc` or `.opencode/opencode.jsonc`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-beads_rust-stats-sidebar"]
}
```

The plugin has server, TUI, and RPC parts, so one entry in `opencode.jsonc` automatically loads all of them. A separate `cli.json` configuration is not needed. Its sidebar heading is always the short `Beads` label.

For a local installation, place the plugin directory in `~/.config/opencode/plugins/opencode-beads_rust-stats-sidebar` or `.opencode/plugins/opencode-beads_rust-stats-sidebar` for automatic loading, or specify the local directory path in the `plugins` array.

Update the installed plugin:

```sh
opencode plugin update opencode-beads_rust-stats-sidebar
```

OpenCode reloads configuration and plugin file changes. A full restart is usually not required.

## Localization and appearance

A Russian system locale enables Russian labels. English is used for all other locales. The selection considers `LC_ALL`, `LC_MESSAGES`, `LANG`, and the `Intl` system locale.

The `Beads` heading is bold and uses the theme's primary text color. All other lines, including the epic summary and task rows, use the muted text color. Task titles are not translated.

## Limitations

- The plugin is read-only: creating, closing, and modifying tasks through the sidebar is not supported, and there are no click handlers, dialogs, or slash commands.
- The current task follows the most recently updated in-progress task, or the most recently closed task; it is not tied to a specific OpenCode session or assignee.
- Updates use polling 5 seconds after the previous request completes, rather than a subscription to Beads events.
- Git activity, average completion time, and additional `br stats` breakdowns are not displayed.
- Bars and percentages are rounded to whole numbers. With a small number of tasks, one task can fill multiple characters.
- Blocked tasks can also be counted under other statuses. Therefore, the rows and percentages are not mutually exclusive and can add up to more than 100%.
- Blocked children in the epic block are inferred: Beads stores them as open, so any open child that is not in `br ready --json` is shown as blocked.
- When the total task count is zero, the bars are empty and percentages are zero.

## Structure

- `index.ts`: server RPC registration.
- `beads.ts`: `br` execution, current-task selection, data validation, and transformation.
- `rpc.ts`: the contract between the server and TUI.
- `tui.tsx`: the sidebar block and updates.
- `display.ts`: bars, numbers, percentages, and task glyphs.
- `i18n.ts`: system locale and labels.

## Verification

```sh
npm ci
npm test
npm run typecheck
```
