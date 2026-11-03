# Checklist-to-Goal

A plugin for [OpenCode](https://opencode.ai) that turns a request — or a
Markdown checklist — into a **tracked goal**, with a **live checklist in the
sidebar**, a **progress bar**, and a mechanism that **keeps the model locked on
the task until it is done**, never declaring completion without evidence.

> Inspired by the idea behind `@prevalentware/opencode-goal-plugin`, but with the
> checklist and its tasks as first-class citizens: you see every item, the
> progress, and the current task the whole time.

> 🌍 **Language:** the UI and the prompts default to **English**. Brazilian
> Portuguese is available via the `language: "pt"` option (see
> [Installation](#installation)). / *A interface e os prompts podem ser usados
> em português do Brasil com a opção `language: "pt"`.*

## What it does

- **`/target <context>`** — takes the context of the request, turns it into a
  goal, and breaks it into concrete, verifiable tasks. If the context points to
  a `.md` file with `- [ ]` items, it uses those items as the tasks.
- **`/add_goal <task>`** — appends a task to the active checklist (accepts
  "Title - description"). Deterministic: it does not invoke the model.
- **`/target_cancel`** — cancels and removes the session's active checklist.
- **Checklist in the sidebar** (`sidebar_content`) — objective, progress bar,
  and every item with its state and color: `✓` done (green), `●` in progress,
  `○` pending (yellow), `✗` blocked. Click an item to open or close its
  description; the active task opens on its own.
- **Compact progress badge** (`session_prompt_right`) — `C2G ██████░░ 60%` to
  the right of the input box, out of the way of the "working" indicator.
- **Focus lock** — when the session goes idle and there are still pending tasks,
  the plugin injects an automatic "continue" so the model keeps going, until
  everything is done or the configured limits are reached.
- **Completion only with evidence** — a task is only marked done through the
  `complete_task` tool, and only with concrete evidence (command output, a file
  excerpt, a test result, a real response). "Done" is not enough.

## Installation

### Local (from the source, without publishing)

Reference the package directory in the `plugins` array with a `file:` spec.
OpenCode loads both halves (server + TUI) through the `package.json` `exports`,
just like an npm package.

```jsonc
{
  "plugins": [
    "file:C:/Claude/Checklist-to-Goal"
    // ...other plugins
  ]
}
```

With options, use the **object form** (`{ "package", "options" }`). OpenCode V2
rejects the old V1 tuple `["pkg", { … }]` with
`configuration normalization diagnostic … skipped malformed recognized value`,
and the plugin is silently left unloaded:

```jsonc
{
  "plugins": [
    {
      "package": "file:C:/Claude/Checklist-to-Goal",
      "options": { "max_auto_turns": 200, "max_no_progress": 8, "language": "en" }
    }
  ]
}
```

> Note: `file:` specs skip OpenCode's update check (a harmless WARN in the logs).
> To edit and reload, restart OpenCode.

### Published on npm

The package is on npm, so the name is enough:

```jsonc
{ "plugins": ["checklist-to-goal"] }
```

Or via the OpenCode CLI:

```sh
opencode plugin add checklist-to-goal
```

To run it in Brazilian Portuguese, pass the `language` option:

```jsonc
{
  "plugins": [
    { "package": "checklist-to-goal", "options": { "language": "pt" } }
  ]
}
```

> The `plugins` array resolves plain names **through the npm registry** — that is
> why local use needs the `file:` prefix. Dropping the files into
> `~/.config/opencode/plugins/` also works, but requires bundling each half into
> a single file (relative imports do not resolve there); `file:` avoids that.
>
> Config lives in `~/.config/opencode/opencode.jsonc` (global) or
> `opencode.json(c)` / `.opencode/opencode.json(c)` (project). The field was
> called `plugin` (singular) in OpenCode V1; V2 renamed it to `plugins`.

| Option            | Default | What it does |
|-------------------|:-------:|--------------|
| `language`        | `"en"`  | UI and prompt language: `"en"` (English) or `"pt"` (Brazilian Portuguese). |
| `max_auto_turns`  | `200`   | Maximum automatic continuations per goal. `null` = unlimited. |
| `max_no_progress` | `8`     | After N idle cycles without completing any new task, stop auto-continuing (avoids burning turns). |

## How it works (architecture)

The plugin has two halves (OpenCode V2 API: `export default { id, setup }`),
loaded from the same package through `exports` (`.` → server, `./tui` → TUI):

- **`src/server.ts`** (server) — in `setup(context)`:
  - `context.tool.transform` registers the tools;
  - `context.command.transform` injects `/target` and `/add_goal`;
  - `context.session.hook("context")` injects the checklist + rules into the
    system prompt each turn;
  - `context.session.hook("prompt")` tracks the session's agent;
  - `context.event.subscribe` listens for `session.idle` and, when a task is
    pending, calls `context.session.prompt(...)` for the synthetic continuation.
- **`src/tui.ts`** (interface) — `setup(context)` registers the UI slots
  (`context.ui.slot`) and draws the sidebar and the progress bar by reading the
  shared state.

The two halves run in different processes, so the state lives in a JSON file
that the TUI re-reads every second:

```
%APPDATA%\checklist-to-goal\state.json          (Windows)
$XDG_DATA_HOME/checklist-to-goal/state.json      (Linux/macOS)
```

Override the path with the `CHECKLIST_TO_GOAL_STATE_PATH` env var.

## Tools (called by the model)

| Tool              | Purpose |
|-------------------|---------|
| `target_create`   | Creates the goal + tasks (from `tasks[]` or a `markdownPath`). |
| `add_task`        | Appends a task. |
| `complete_task`   | Completes a task — requires concrete `evidence`. |
| `block_task`      | Marks a task as blocked, with a reason. |
| `get_checklist`   | Returns the current state (objective, tasks, IDs, progress). |
| `clear_checklist` | Removes the session's checklist. |

## Notes

- **Progress-badge position:** we use the `session_prompt_right` slot (to the
  right of the prompt), deliberately off `app_bottom` so it does not fight the
  "working" indicator. The slot is swappable in `src/tui.ts`.
- **No build step:** the plugin is plain TypeScript; OpenCode transpiles it at
  load time.
- **Compatibility:** it supports both generations of OpenCode's TUI API
  (`api.slots.register` and `context.ui.slot`).

## License

MIT © Rafael Ferreira
