# opencode-beads_rust-stats-sidebar

[Русская версия](https://github.com/melik/opencode-beads_rust-stats-sidebar/blob/main/README.ru.md)

An OpenCode V2 plugin that displays [beads_rust](https://github.com/Dicklesworthstone/beads_rust) statistics and active tasks in the terminal UI sidebar.

## What it displays

- The total number of tasks.
- Counts of open, in-progress, blocked, and closed tasks.
- A 10-character bar and percentage of the total for each category.
- The ID and title of tasks with the `in_progress` status.
- A `2 epics ready to close` line (or `2 эпика готовы к закрытию` for the Russian locale) when epics have all their child tasks closed. This line appears only when the count is positive, after the statistics and before the active tasks.
- An expandable description when there is exactly one active task.
- An `ID - title` list when there are multiple active tasks.

Example with one active task:

```text
Beads
Total tasks: 18
Open        ■■■■■■□□□□ 11 (61%)
In progress ■□□□□□□□□□ 1 (6%)
Blocked     ■■■■■■□□□□ 10 (56%)
Closed      ■■■□□□□□□□ 6 (33%)

opencode-mjf ▾
Current task title
```

Example with multiple active tasks:

```text
Beads
Total tasks: 4
Open        ■■■□□□□□□□ 1 (25%)
In progress ■■■■■□□□□□ 2 (50%)
Blocked     ■■■□□□□□□□ 1 (25%)
Closed      ■■■□□□□□□□ 1 (25%)

opencode-bb7 - Temporary task 4
opencode-mjf - Temporary task 2
```

If there are no active tasks, the task list is not displayed. The line for epics ready to close is displayed independently of whether there are active tasks.

## How it works

The server part of the plugin runs three commands in the current project directory:

```sh
br stats --json --no-activity
br list --status in_progress --json
br epic status --eligible-only --json
```

The total count and status statistics come from `stats`. The `in_progress` tasks come from `list`, sorted by `updated_at` from newest to oldest. The number of epics with all child tasks closed comes from `epic status --eligible-only`. All three commands run in parallel when the plugin loads, and again 5 seconds after each request completes.

The TUI part passes the current project's location to RPC, so statistics are not mixed with those of other open projects. The block is hidden until the first successful response. During subsequent updates, the last received data remains visible.

When there is exactly one active task, left-clicking its ID or title shows or hides its description:

- `▾`: description collapsed;
- `▴`: description expanded.

The expanded state is preserved for the last expanded task while the plugin is loaded.

When there are multiple active tasks, they are displayed as an `ID - title` list without arrows, descriptions, or click handlers.

If Beads is not initialized, `br` is unavailable, or reading `stats` or `list` fails, the plugin hides the entire block. If `br epic status --eligible-only --json` is unavailable or returns an invalid response, the statistics and active tasks remain visible, but the epics line is hidden.

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

Task titles and descriptions are not translated. The `Beads` heading is bold and uses the theme's primary text color; the remaining lines use the muted text color.

## Limitations

- The description is available only when there is one active task; the list of multiple tasks does not support it.
- The current task is selected by its status, not by a specific OpenCode session or assignee.
- The plugin is read-only: creating, closing, and modifying tasks through the sidebar is not supported.
- A mouse is required to expand the description of a single task; there is no dedicated keyboard command. Mouse support depends on the terminal.
- Updates use polling 5 seconds after the previous request completes, rather than a subscription to Beads events.
- Git activity, average completion time, and additional `br stats` breakdowns are not displayed.
- Bars and percentages are rounded to whole numbers. With a small number of tasks, one task can fill multiple characters.
- Blocked tasks can also be counted under other statuses. Therefore, the rows and percentages are not mutually exclusive and can add up to more than 100%.
- When the total task count is zero, the bars are empty and percentages are zero.

## Structure

- `index.ts`: server RPC registration.
- `beads.ts`: `br` execution, data validation, and transformation.
- `rpc.ts`: the contract between the server and TUI.
- `tui.tsx`: the sidebar block, updates, and description expansion.
- `display.ts`: bars, numbers, and percentages.
- `i18n.ts`: system locale and labels.

## Verification

```sh
npm ci
npm test
npm run typecheck
```
