# KodraDev OpenCode Backlog

A persistent session or project backlog for OpenCode V2 agents and the TUI.

The plugin gives agents tools to manage tasks and adds an interactive backlog to the sidebar and command palette.

Fork of [sachahjkl/opencode-backlog](https://github.com/sachahjkl/opencode-backlog), with SQLite storage and selectable scope.
Package: [kodradev-opencode-backlog on npm](https://www.npmjs.com/package/kodradev-opencode-backlog).

## What It Does

- **Session mode** (default): each session has its own backlog.
- **Project mode**: sessions in the same project share a backlog.
- Live sidebar, task details, notes, and editable categories.
- Read-only history of stored backlogs in the project.
- Project settings for task detail, default scope, and automatic retention.
- Storage statistics and confirmed cleanup of finished tasks unchanged for more than 24 hours.
- Bundled `kodradev-backlog` skill and workflow reminder; no manual `AGENTS.md` setup needed.

New backlogs start with **Todo**, **Doing**, **Blocked**, **Review**, **Waiting**, **Done**, and **Cancelled**. Categories can be renamed, styled, reordered, or removed when empty.

Switch scope with `/backlog-scope`. Switching selects another backlog; it never moves, merges, or deletes tasks.

## Requirements

- OpenCode V2; this fork targets `2.0.23`.
- Node.js 24+ and pnpm 11.9.0 for local development.

This is an early development version, not yet production-verified.

## Install

### Option 1: OpenCode CLI

Install the latest published npm release and add it to your global OpenCode configuration:

```sh
opencode plugin add kodradev-opencode-backlog@latest
```

OpenCode V2 supports npm tags such as `latest`. This package exports both the server plugin and `./tui`, so OpenCode loads the agent tools and sidebar together. No separate TUI installation is needed.

The plugin defaults to session mode. To customize its options, edit the entry created by the command into the object form below; do not add a duplicate entry.

### Option 2: Manual Configuration

Add the package to `~/.config/opencode/opencode.jsonc`, preserving other plugin entries. For installation in one project only, use that project's `opencode.jsonc` instead:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "kodradev-opencode-backlog@latest",
      "options": {
        "defaultMode": "session"
      }
    }
  ]
}
```

| Option | Purpose |
| --- | --- |
| `defaultMode` | Initial `session` (default) / `project` global default. Settings can override it globally or per project. |
| `databasePath` | Optional absolute path to the server's SQLite database; omit it to use the [default storage location](#storage). |
| `retentionDays` | Initial global retention default (default: `90`). Set any non-negative whole number; `0` disables expiration. See [automatic retention](#automatic-retention). |
| `taskDetail` | Initial global task detail default. `lightweight` (default): small tasks, short titles, and very brief descriptions. `detailed`: expanded context and continuation checkpoints. |

`/backlog-scope` overrides `defaultMode` for one session; **Use configured default** clears that override.

These options provide initial global defaults. **Backlog Settings** can change them globally or override them per project, without editing OpenCode's native settings or configuration files.

Remove the original `opencode-backlog` plugin entry to avoid duplicate sidebars. The package includes both server and TUI entrypoints. Reopen the TUI after enabling it.

### Updates

`@latest` selects npm's latest published release rather than pinning `0.1.1`. It does not guarantee automatic upgrades: OpenCode can load a cached package and check for updates without installing them. Check or update the globally configured package explicitly:

```sh
opencode plugin check kodradev-opencode-backlog@latest
opencode plugin update kodradev-opencode-backlog@latest
```

Use an exact version instead of `latest` when you need a reproducible, pinned installation. See the [OpenCode V2 plugin guide](https://opencode.ai/v2/docs/plugins) for CLI installation and update behavior.

## Use The Backlog

### Task Categories (Statuses)

A task's `status` is its category ID, not a separate task type. New backlogs include these seven sections:

| Section | Status ID | What belongs here |
| --- | --- | --- |
| **Todo** | `todo` | Planned work that has not started. Record the next actionable steps here. |
| **Doing** | `doing` | Work currently being executed. Move a task here before starting and keep its progress notes current. |
| **Blocked** | `blocked` | Unfinished work that cannot continue because of a dependency, missing access, pending decision, or other obstacle. Explain the blocker and what would unblock it in `notes`. |
| **Review** | `review` | Work awaiting review before it can be considered complete. Note what needs checking and by whom. |
| **Waiting** | `waiting` | Work paused until an expected event or response arrives. Record what is expected and from whom. |
| **Done** | `done` | Completed work that meets its completion criteria. Record the actual outcome and verification performed; finishing a task does not delete it. |
| **Cancelled** | `cancelled` | Work intentionally abandoned, retained for context rather than deleted. Note why it was dropped. |

Typical flow: **Todo → Doing → Done**. Move work to **Blocked** when a dependency or missing access stops it, to **Review** when it awaits review, and to **Waiting** when it awaits an external event or response. Once unblocked, return it to **Doing** when resuming or **Todo** if it is waiting to be scheduled. Use **Cancelled** for work abandoned on purpose. Moving between categories does not execute work or resolve blockers automatically.

Categories are editable through `/session-backlog-categories`: add, rename, style, reorder, or remove an empty category. Renaming a category changes its display title, not its stable ID. Existing backlogs keep their saved categories; if an older backlog lacks a section, add one with the matching ID (`blocked`, `review`, `waiting`, or `cancelled`).

The plugin also provides styling presets for optional categories; these are not created by default:

| Optional section | Status ID | Suggested use |
| --- | --- | --- |
| **Review** | `review` | Work awaiting review before it can be considered complete. |
| **Waiting** | `waiting` | Work paused until an expected event or response arrives. |
| **Cancelled** | `cancelled` | Work intentionally abandoned, retained for context rather than deleted. |

Custom category IDs are supported too. The pending-task preview excludes IDs `done` and `cancelled`; other categories, including `blocked`, remain pending.

### Sidebar And Dialogs

| Section | What it does |
| --- | --- |
| **Scope indicator** | Shows **Only this session** or **Shared project**. Click it to choose the backlog scope without moving any tasks. |
| **Settings** | Opens global or per-project settings from the sidebar header, the scope chooser, or `/backlog-settings`. |
| **Add / Browse / Reorder** | Always-visible actions below the Backlog heading in the main sidebar and subagent panel. Add creates a task, Browse opens the full list, and Reorder changes a task's position within its category. |
| **Category groups** | Show up to eight pending tasks in total, grouped by category, with each category's full task count. Empty groups and groups without tasks in the preview are hidden. |
| **More pending / completed links** | Open the full backlog browser. Done tasks remain stored and appear as a completed count rather than individual sidebar entries. |
| **Backlog browser** | `/session-tasks` lists the selected backlog, including completed tasks, with 20 tasks per page. |
| **Task details** | Click a task to see its category, ID, and full notes, and access task actions. |
| **Stored backlogs** | `/session-backlogs` opens read-only history for the current project; it does not change the selected scope. |

The sidebar is a preview, not the full backlog. **No pending tasks** does not mean completed or cancelled tasks have been deleted.

**Add**, **Browse**, and **Reorder** are compact buttons with horizontal padding
and a subtle raised background that brightens on hover. Other actions use bold,
muted text without a button background or underline, brightening on hover.
Scope information remains plain muted text. Padding around the backlog and
spacing between rows keep controls separate from the task list. Category colors
still convey task status; destructive actions use the theme's error color. No
colors are hardcoded, so these treatments follow the active OpenCode theme.

### Subagent Backlog Panel

OpenCode hides its standard sidebar in child sessions. The plugin opens its own
live backlog panel when you enter a subagent session, without modifying OpenCode.
The panel stays pinned while you are in that child session: it has no close
control or close shortcut, and it reopens if the host closes or replaces it.
It uses that session's selected backlog scope; it does not copy parent tasks or
change the scope. Returning to the parent closes the automatically opened panel
and leaves the normal sidebar unchanged.

Child sessions have no composer, so opening or restoring the panel never
requires typing a command. The panel is available only in subagent sessions;
regular sessions keep the normal sidebar. Narrow terminals show the panel
fullscreen; widen the terminal to see the transcript and backlog side by side.
Wider terminals support
side-by-side presentation and the **Fullscreen** / **Restore** control.

Panel shortcuts while focused: `n` adds a task, `b` opens the complete backlog
browser, `r` reorders a task, and `f` toggles fullscreen. Task details, settings, scope selection,
live updates, and the eight-task preview match the sidebar.

### Agent Requests And Commands

Ask the agent to manage tasks in normal language:

```text
Add a Todo task to document the release process.
Move the release task to Doing.
Move the release task to Blocked and note that it needs registry access.
Move it back to Doing once access is available.
Mark it Done only after the documentation is complete.
```

Click a sidebar task or select **Browse selected backlog** in the command palette to view task details.

| Command | Purpose |
| --- | --- |
| `/session-tasks` | Browse the selected backlog, 20 tasks per page |
| `/session-task-add` | Add a task |
| `/session-task-move` | Change a task's category |
| `/session-task-reorder` | Choose a task and set its final position within its category |
| `/session-backlog-categories` | Manage the selected backlog's categories |
| `/session-backlog-purge` | Purge a category after confirmation |
| `/backlog-scope` | Choose this session's scope or restore the configured default |
| `/backlog-settings` | Configure global or per-project settings; inspect database storage and clean old finished tasks |
| `/session-backlogs` | Read-only history of stored backlogs in this project |

Deleting tasks or purging categories requires explicit user authorization.

To reorder a task, click **Reorder**, use `/session-task-reorder`, or press `r`
in the backlog browser or task details. Choose the task, then enter its final
position from `1` to the category's task count. Its category, title, and notes
stay unchanged. Scope and revision checks reject stale writes. The main prompt
does not capture the panel's single-letter shortcuts while you type.

### Backlog Settings

Open **Settings** beside the sidebar's Backlog heading, select **Settings** in **Change scope**, or run `/backlog-settings`. The dialog works with remote servers too; settings persist in SQLite.

Each dialog edit happens at one of two scopes, chosen from the first row (**Settings scope: Global / Project**):

| Scope | Applies to |
| --- | --- |
| **Global** | Every project on this server/database, unless a project overrides it. Stored per database. |
| **Project** | Only the current project. Overrides global settings for its sessions. |

Resolution order is **project → global → plugin options**. The plugin's `options` remain the initial defaults for the global level. A project that never opened Settings inherits global values; changing global settings updates every project that has no project override.

- **Task detail:** Lightweight (default) uses fewer tokens; Detailed uses more tokens to preserve more precise context for resuming work. Changes affect subsequent agent requests and new manual tasks. Existing tasks and notes are not rewritten.
- **Retention:** any non-negative whole number of days; `0` disables expiration. Enabling expiration or shortening its window requires confirmation. The new window applies at the next scheduled cleanup, not as an immediate purge.
- **Default scope:** Session or Project. Only sessions using the configured default change their selected backlog; per-session overrides remain. No tasks are moved or merged.
- **Reset:** Global resets to the plugin-configured defaults; Project resets to inherit global. Resetting stores no override; it does not delete tasks, notes, or backlogs.
- **Storage:** Shows server-side database disk usage and offers a separate, confirmed cleanup of old finished tasks. See [manual storage cleanup](#manual-storage-cleanup).

A project override is a complete snapshot of the three values: changing one field at the project scope stores the inherited values for the other fields too, so later changes to those fields at the global scope no longer reach that project until its override is reset. Reset the project to resume inheritance. Changing plugin `options` requires a plugin reload; dialog changes take effect without reloading.

Settings use revision checks at the edited scope to reject stale dialogs instead of silently overwriting another client's changes. Backlog updates also re-check the resolved settings, so a settings change cannot be applied against a stale backlog snapshot.

The Task detail dialog shows both explanations with wrapped text rather than truncating them into one row. Click a mode or press `l` for Lightweight / `d` for Detailed; `Esc` cancels.

### Small Tasks And Continuity

Use backlog for **medium/high-complexity or long-running work** that benefits from coordination, progress tracking, or continuity: dependent steps, substantial investigation, coordinated changes, or meaningful blockers/handoffs. Assess the overall request before calling backlog tools, not the number of files or tool calls alone.

**Simple actions need no backlog calls or tasks:** cancelling a pull/PR, making a small localized edit with an obvious solution, changing one setting, or running a straightforward command. Informational questions also need no backlog. Exceptions are explicit requests to track work or actions belonging to relevant existing tracked work; reuse that task. If simple work grows in complexity or duration, start tracking then.

For work that needs tracking, **one small actionable step = one task**, within the same session/project backlog. Prefer `Implement settings RPC`, `Add settings dialog`, and `Document retention` over one task with a long plan duplicated in its notes. Do not create a task for every read or tool call.

In **Lightweight** mode, every new task has a short title, status, and notes with a very brief description: one concise sentence, at most 200 characters. It uses fewer tokens by keeping context minimal for clearly scoped steps within tracked work. This mode controls note detail, not whether a request needs tracking. The description explains the essential purpose or constraint, not the whole plan. Status records progress; routine note updates are unnecessary. Agent and manual creation both require this short description.

**Detailed** mode allows brief objective, scope/constraints, completion criteria, progress, next step, and blockers for complex work. It uses more tokens to preserve these details, making constraints and the next step more precise when resuming after a pause, handoff, or compaction. This is a context-retention tradeoff, not a guarantee of better model answers. Keep each field to one short line, not a running log. Manual creation also offers optional notes.

Both modes keep the same safety and recovery workflow for tracked work: review/reuse tasks, use truthful statuses, and read relevant Doing tasks after resuming. Simple unrelated actions do not need backlog calls, including after compaction. List notes are previews, not full context. Before handoff, save only missing context needed to continue. The compaction reminder preserves task IDs, scope, and next step; it never saves notes automatically.

The short-description requirement and 200-character limit apply to new Lightweight tasks, including manual entries. Existing notes are not trimmed, and editing older tasks remains unrestricted within the general storage limits. The Lightweight reminder does not require loading the full workflow skill on every task. The skill is bundled with the plugin and registered when it loads; updating the plugin updates its skill and reminders too. Local development wrappers use the built `dist` output, so rebuild and reload after source changes. External `AGENTS.md` instructions that mandate tracking every action or lengthy structured notes must be adjusted separately; this plugin does not rewrite those files.

## Agent Tools

Tools use the calling session's selected scope automatically.

`session_backlog_list` hides `done` and `cancelled` tasks by default to keep responses small; each category's `counts` entry still includes them, so completed totals remain visible. Request completed tasks only when needed with `activeOnly: false`. The TUI browser (`/session-tasks`) always lists the full backlog, including completed tasks.

| Tool | Purpose |
| --- | --- |
| `session_backlog_list` | List tasks with category/search filters and pagination. Hides `done`/`cancelled` by default; per-category counts still include them. Pass `activeOnly: false` to include completed tasks. |
| `session_backlog_get` | Read one task with full notes. |
| `session_backlog_add` | Add a task. |
| `session_backlog_update` | Edit a task title or notes. |
| `session_backlog_move` | Change a task category or position. |
| `session_backlog_remove` | Permanently remove a task. |
| `session_backlog_category_add` | Add a category with a stable ID, title, color, and icon. |
| `session_backlog_category_update` | Edit a category title, color, or icon. |
| `session_backlog_category_move` | Reorder a category. |
| `session_backlog_category_remove` | Remove an empty category. |
| `session_backlog_category_purge` | Permanently remove all tasks from a category. |

## Storage

Tasks, categories, scope preferences, and global/project settings persist in SQLite on the OpenCode server:

```text
~/.local/share/opencode/kodradev-opencode-backlog/backlog.sqlite
$XDG_DATA_HOME/opencode/kodradev-opencode-backlog/backlog.sqlite   (when XDG_DATA_HOME is set)
```

Set an absolute `databasePath` in plugin options to use another location. The TUI accesses storage through RPC, including when connected to a remote server.

Existing upstream `BACKLOG.json` files are not imported or modified.

### Manual Storage Cleanup

Open `/backlog-settings` → **Storage · database size and cleanup**. Disk usage always covers the entire plugin database, not just the selected project or task text: SQLite, its write-ahead log (`-wal`), and shared-memory index (`-shm`). Select **Disk usage** for the breakdown, reusable SQLite space, task/backlog counts for the database and current project, and the database path on the server. Remote clients read these statistics through RPC.

The cleanup scope initially matches the Settings scope. Switch **Cleanup scope** inside Storage to choose **Project** (all session and shared backlogs in this project) or **Global** (every project stored in this database). This selection does not change settings or the session's selected backlog.

- **Clean finished tasks >24h** previews the number of eligible tasks and affected backlogs. The action is disabled when none qualify.
- Only category IDs `done` and `cancelled` qualify, and only when their individual last modification is strictly older than 24 hours. Creating a task or changing its title, notes, or status resets its timestamp; reordering tasks does not. Reading a task does not reset it.
- Existing tasks without individual timestamps receive a fresh 24-hour window when upgrading to schema version 4; they are not immediately eligible for manual cleanup.
- Confirmation states the count, project/global scope, exact cutoff, and permanent nature of deletion. Pending tasks (including custom categories), categories, backlog records, scope preferences, and settings are preserved. This is a manual action, separate from automatic retention; there is no undo.
- Cleanup captures its scope and cutoff and checks eligible tasks and affected backlog revisions inside the deletion transaction. Concurrent changes reject a stale confirmation without deleting anything; refresh and confirm again. Affected backlog revisions advance, preventing stale edit dialogs from restoring removed tasks.
- After deletion, cleanup attempts `VACUUM` and a WAL truncation checkpoint, then refreshes the displayed size. Compaction is database-wide even for project cleanup, but it does not delete tasks outside the selected scope. It can briefly block writes and needs temporary free disk space up to twice the database size. If compaction is busy or fails, deletion remains committed and the UI reports deferred reclamation rather than claiming that disk space was recovered.

### Automatic Retention

Automatic expiration is enabled by default with a global `retentionDays` of `90`. Change it in **Backlog Settings** globally or per project, or set the initial global default in the plugin's `options`, for example:

```jsonc
"options": {
  "defaultMode": "session",
  "retentionDays": 180
}
```

Set `retentionDays` to `0` to keep all backlog data indefinitely. Values must be non-negative whole numbers whose millisecond duration fits in JavaScript's safe integer range.

- Only **session backlogs** that are empty or contain exclusively `done`/`cancelled` tasks can expire. Expiration permanently deletes the backlog, categories, tasks, and notes; there is no archive or undo.
- **Project backlogs and any backlog with pending tasks are never automatically deleted.** Custom category IDs other than `done`/`cancelled`, including Blocked, Review, and Waiting, count as pending.
- Reading or editing a backlog refreshes its inactivity window. Resolving a session's scope also refreshes its selected backlog and scope preference. Access writes are throttled to once per hour, with an extra hour of retention to protect recent reads. Merely listing stored backlogs does not refresh every entry.
- Unused session scope overrides expire after the same inactivity period, but only when their isolated backlog no longer exists. Legacy overrides whose project cannot be identified are retained until the session is accessed again.
- Existing data receives a fresh inactivity window when upgrading from the original schema without access timestamps; old history is not immediately deleted. The current schema version 4 is not readable by older plugin releases; back up the database before upgrading if you need a downgrade path.
- Maintenance runs when the plugin loads and every 24 hours while it remains loaded. Cleanup is limited to 100 eligible backlogs and 1,000 unused overrides per project per day. Multiple instances sharing the database coordinate through SQLite; keep retention options consistent for the same project. Unloaded projects are cleaned when their plugin next loads.

Deleted pages are reusable by SQLite. Database-wide maintenance runs at most once per day and performs `VACUUM` when at least 4 MiB and 25% of database pages are free, then attempts a WAL truncation checkpoint. Smaller free allocations remain available for reuse. Readers or competing writers can defer reclamation; maintenance failures are logged without disabling backlog tools. `VACUUM` can briefly block writes and requires temporary free disk space of up to twice the database size.

Retention reduces accumulated finished session history, **not total disk usage to a fixed cap**: protected backlogs can still grow, and a large expired history may take multiple daily batches to clear. WAL checkpoints alone do not delete tasks or compact database pages. Storage statistics and manual finished-task cleanup are available in Settings; export and archival remain future work.

## Development

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm run typecheck:src
pnpm run build
pnpm run dev
```

The repository-local plugin loads `dist/`; `pnpm run dev` rebuilds when `src/` or `skills/` changes. Other projects keep using the globally configured npm package.

The local development wrapper always uses `.opencode/backlog-dev.sqlite` inside this checkout, including its own tasks, scope preferences, settings, and schema migrations. SQLite files are ignored by Git. The global npm plugin keeps using the production database described under [Storage](#storage). Switching to development does not copy or move existing production tasks; the development backlog starts empty.

These commands do not run tests. Upstream tests are preserved but do not validate this fork's SQLite or scope behavior.

## License

MIT. Original attribution is preserved in [LICENSE](LICENSE) and [NOTICE.md](NOTICE.md).
