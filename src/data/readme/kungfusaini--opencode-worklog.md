# opencode-projects

OpenCode server and TUI plugin for project contexts, explicit streams, durable plan artifacts, and worklog continuity.

## What it provides

- `worklog_append` tool for concise project progress, decision, blocker, and finish entries.
- Durable project plan tools: `plan_create`, `plan_current`, `plan_list`, `plan_read`, `plan_update`, and `plan_archive`.
- Plan-aware context injection when the user asks to plan, resume, continue, execute, or archive a plan.
- Additive TUI palette commands under **OpenCode Projects** for opening registered projects, viewing worklogs, opening project-scoped sessions, creating project sessions, managing streams, and viewing plans.
- A small reminder while tracking is enabled so the assistant appends meaningful updates and can read deeper history only when needed.

## Storage model

Worklogs and plans are scoped by the selected worklog project or stream. If no project has been selected in the TUI, the plugin falls back to the current working directory. Data is stored locally outside the git repo:

```text
~/.local/share/opencode/project-logs/<project-id>/
  worklog.jsonl
  project.json
  plans/
    active/
    archive/
  streams/
    <stream-id>/
      stream.json
      worklog.jsonl
      plans/
```

The intended split is:

- Plan = intended route.
- Worklog = durable progress, decisions, blockers, detours, mistakes, next steps, and completion events.
- `todowrite` = live checklist for the current opencode session.

Do not edit a plan just to mark checklist progress. Use the opencode todo list for live session tracking and worklog entries for durable progress. Update a plan only when the intended approach, scope, constraints, risks, or completion criteria change.

### Worklog access policy

The plugin guides agents to use the active project or stream worklog as the default continuity source. For ordinary orientation questions like “where are we?” or “what were we doing?”, agents should answer from the active scope recap first and should not proactively inspect parent, sibling, or other project logs.

This is guidance, not a hard access block. If the user explicitly asks for a parent project worklog, sibling stream, another project, project-wide history, or another session's worklog, the agent may read those files subject to normal opencode tool permissions. The plugin should not silently redirect explicit cross-worklog reads back to the current scope.

## Plan workflow

The plugin ships with its own default `plan` agent and does not require users to maintain `agents/plan.md` manually. The packaged agent overrides the built-in `plan` agent when this plugin is loaded.

While formulating a plan, the packaged agent is instructed to resolve ambiguities before finalizing by using the question-select flow for ambiguous scope, constraints, assumptions, timeline, or acceptance criteria.

The built-in confirmation flow is:

1. **Approve and select**
2. **Approve**
3. **Discuss further**

- Approve and select: save with `plan_create`, then set it current with `plan_current`.
- Approve: save with `plan_create` only.
- Discuss further: keep refining and do not save.

Use `plan_create` to create a detailed active plan. The plan body should be thorough markdown covering goal, context, recommended approach, phases, risks, completion criteria, and handoff notes.

When a user asks to resume, continue, execute, or archive a plan, the plugin injects a small hidden context packet with active plan paths and recent worklog entries for the active plan when there is exactly one.

Use `plan_read` before acting on a plan. In a scope where multiple plans exist, set a current plan with `plan_current` and that plan is used when `plan_read` is called with no id. Use `worklog_append` with the `plan` field, or include the plan path in `file`, when recording plan-related progress. Use `plan_update` only for meaningful route changes. Use `plan_archive` when the work is complete; it moves the plan from `plans/active/` to `plans/archive/` and appends a finish entry to the worklog.

## Project and stream model

The plugin includes storage primitives for a project registry and explicit user-created streams. Project context is the default. Streams are optional and are intended for separate lines of work that should have their own worklog and plans. Agents should not create or suggest streams automatically; stream selection is intended to be driven by the TUI.

Streams can use either the shared project workdir or a git worktree. Session ownership is index-driven: a session that is already associated with a project or stream keeps that owner even if the local TUI selection changes. This prevents selecting a different stream from silently moving the current session.

### Git worktree streams

When the selected project is inside a git repository, creating a stream asks whether to create a git worktree. Non-git projects do not show the worktree option and create ordinary shared-workdir streams.

The worktree flow is:

1. Choose **New stream**.
2. Enter the stream name.
3. Answer **Create a new worktree?** with **Yes** or **No**.
4. The stream is created and selected immediately.
5. The normal session picker opens immediately.
6. If the stream is a pending worktree stream, selecting **New session** shows a loading/status dialog while the worktree is created.
7. After `git worktree add` completes, the plugin creates the real opencode session in the worktree path and records that session under the stream.

Worktree details:

- Worktree path: `<repo>/.worktrees/<stream-slug>`.
- Branch name: `stream/<stream-slug>`.
- If the path or branch already exists, the plugin appends a numeric suffix.
- `.worktrees/` is added to the repository's local `.git/info/exclude`; committed ignore files are not modified.
- The stream starts as `pending-git-worktree` and becomes `git-worktree` after the first `New session` creates the checkout.
- While pending, the session picker treats the stream as having no existing sessions instead of erroring because the directory does not exist yet.

Worktree archive behavior:

- Archiving a worktree stream removes the checkout with `git worktree remove <path>` before archiving the stream.
- Removal is intentionally non-force. If the worktree has uncommitted changes, Git refuses the cleanup and the stream is not archived.
- The branch is kept. Branch merge and deletion remain explicit user-controlled steps.
- Stream worklog, plans, session index data, and opencode sessions are kept locally.
- The archived stream metadata records `workspace.removedAt` and `workspace.removeReason = "archived"` after successful cleanup.

### Stream rollups

When `worklog_append` runs in stream scope, the full entry is written to the stream log. High-signal entries are also summarized into the parent project log so project memory stays current without a manual reconciliation step.

Automatic project rollups happen for:

- `start` and `finish` entries.
- `mistake` entries.
- Any stream entry with `projectImpact: true`.

Routine `decision`, `stuck`, `progress`, `note`, and `next` entries stay stream-local by default. Use `projectImpact: true` when a stream event affects project-level direction, architecture, release state, workflow, or future agents.

`worklog_append` enforces a few quality fields: `decision` entries require `reason`, `mistake` entries require `lesson`, and `stuck` entries require `blocker`.

## Usage

Add the package to global `~/.config/opencode/opencode.json`:

```json
{
  "plugin": [
    "@kungfusaini/opencode-projects"
  ]
}
```

To enable the workspace opener inside the opencode TUI, also add the TUI export to `~/.config/opencode/tui.json`:

```json
{
  "plugin": [
    "@kungfusaini/opencode-projects"
  ]
}
```

Use the package name in both config files. opencode's npm plugin loader resolves package entrypoints, not package subpath exports, so `@kungfusaini/opencode-projects/tui` is not a valid plugin config entry.

This adds additive command palette actions under `OpenCode Projects` without overriding opencode's native session picker:

```text
Open Projects
Open Streams
Open Sessions
New Project Session
View Worklog
Project Context
View Plans
View Current Plan
```

Command names:

```text
projects.open
projects.stream.open
projects.session.open
projects.session.new
projects.worklog.view
projects.context.view
projects.plans.view
projects.plans.current
```

Current behavior:

- `Open Projects` opens a flat activity-sorted project selector.
- `Open Streams` opens a flat activity-sorted stream selector for the current project.
- `Open Sessions` opens the session selector for the current project/selected stream.
- `New Project Session` creates a session associated with the current project or selected stream.
- Session listing is index-driven: only sessions that are explicitly associated with the active project/stream are shown in the picker.
- New projects and new streams start with no associated sessions, so their picker initially appears empty until you create a session from that picker.
- The project viewer shows active projects sorted by recent session activity, falling back to metadata timestamps. Pressing enter opens the project; project management is shortcut-only (`ctrl+f` pin/unpin, `ctrl+r` rename, `ctrl+d` archive).
- `New project` opens a directory picker, with a manual path prompt as a fallback, then creates/selects the project and opens its stream viewer.
- Archived projects are available from the project viewer. Archived projects can be restored with `ctrl+r` or permanently deleted with `ctrl+d`. Permanent delete removes local worklog data only; it does not delete the code repository.
- The stream viewer selects `Project worklog`, creates a new stream, or selects an existing active stream. In git repositories, creating a stream asks whether to create a git worktree; outside git repositories, normal shared-workdir streams are created without showing the worktree option.
- The session viewer lists root sessions for the selected project and includes `New session`.
- Session management remains opencode-owned. The plugin does not implement pin, rename, delete, or override the native session picker.
- When a stream is selected, `worklog_append` and plan tools use the stream's worklog and plan directories. Selecting `Project worklog` returns to the project worklog.
- TUI project/stream selection is local to the current opencode window. Server-side worklog context is resolved from the current session index or workdir, not from a global selected project/stream file, so separate opencode instances do not steal each other's active stream.
- Existing sessions are authoritative: opening a session that is already indexed to another project or stream switches the local TUI context to that session's owner instead of moving the session into the currently selected stream.
- New sessions created from a git-worktree stream are created under that stream's worktree path, so the opencode session remains associated with the worktree stream.
- `View worklog` opens the selected project or stream worklog in a searchable read-only dialog.
- The TUI sidebar shows the current worklog project, stream, session, and project workdir. Opencode's native sidebar/session title remains unchanged.

### TUI limitation

The public opencode TUI plugin `DialogSelect` wrapper does not expose the native dialog footer/action-hint props used by opencode's built-in pickers. Project management shortcuts therefore appear as an inert `Shortcuts` row inside the project/archive viewers instead of as native footer tooltips.

After changing plugin config, restart opencode.
