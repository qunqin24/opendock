# opencode-task-model

An [opencode](https://opencode.ai) plugin that lets you run synchronous or background subagents on a model you choose **per call**, in the current session, without restarting opencode or hardcoding `model:` in each agent's `.md`.

opencode resolves plugin tools ahead of built-ins with the same name, so the agent sees a single `task` tool: native-shaped, plus per-call `model` and `reasoning` controls. Use `inherit` and `default` to keep native model-selection precedence.

## Why

The built-in `task` tool resolves the subagent model from the agent's frozen config (or inherits the parent model) and exposes no per-call model argument, and its `execute` is compiled into core so the arg cannot be bolted on. This plugin reimplements the spawn via the client API (`session.create` + `session.prompt`), where `model`, `agent`, and `variant` are set explicitly. With `model: "inherit"`, the child uses native model precedence.

## Install

```sh
VERSION="$(bun pm view opencode-task-model version)"
opencode plugin --global "opencode-task-model@$VERSION"
```

This resolves npm's current release once, installs that exact version, and adds the pinned reference to your global `opencode.json` automatically. `--global` puts it in your user config so every project picks it up; drop it to install into the current project only. Pinning avoids stale `@latest` alias or package-cache resolution.

OpenCode installs it with Bun on startup and caches it under `~/.cache/opencode/node_modules/`. Because it overrides the built-in `task` tool, no further wiring is needed: every agent that already uses `task` picks up the `model`/`reasoning` args automatically.

### Upgrade

From a repository checkout, resolve the current npm version and replace the global entry with an exact npm pin:

```sh
bun run opencode:install
```

The script resolves the exact version with `bun pm view` and updates your global `opencode.json`. Restart OpenCode afterward so it installs and loads that package version.

### Local development

From a checkout, point your global `opencode.json` at the local checkout directory:

```sh
bun run opencode:local
```

The script writes the checkout path (for example `/Users/lars/repos/opencode-task-model`) into your global `opencode.json`. OpenCode loads the plugin from that directory, resolving its `./server` export, so there is no install step and no cache-busting token involved.

Toggle between the two modes freely, restarting OpenCode after each switch:

```sh
bun run opencode:local      # develop against the local checkout
bun run opencode:install    # use the published npm version (exact pin)
```

Server plugins load at boot, so after editing local source, restart OpenCode to pick the changes up. Before publishing or testing the registry package, switch back with `bun run opencode:install` and restart again.

## Usage

The tool signature:

```
task(subagent_type, description, prompt, task_id, model, reasoning, background, worktree)
```

- `subagent_type` — the subagent to run (e.g. `explore`, `general`, `review`, `design`)
- `description` — short task description, used as the child session title
- `prompt` — full self-contained instructions for the subagent
- `task_id` — pass a prior task ID created by this parent session for the same subagent to resume a completed task in the same foreground or background mode; empty string starts fresh. Active/running background tasks cannot be extended, polled, waited on, or retried; wait for their automatic completion notification before reusing their ID.
- `model` — a raw `providerID/modelID` string straight from `opencode models` (e.g. `<provider>/<model>`). Pass `inherit` to reproduce native precedence: the subagent's own configured `model:` wins, and if it has none the child inherits the invoking session's current model. The parent reasoning variant is inherited when the OpenCode API exposes it; pass `reasoning` for an explicit tier.
- `reasoning` — thinking effort: `default` (the model's own), or `low`/`medium`/`high` (some models also accept `xhigh`/`max`). Only affects models that support reasoning; a level the target model doesn't support is silently ignored by opencode. Legacy plugin schemas require `inherit`, `default`, an empty `task_id`, and `background: false` rather than omitted arguments.
- `background` — `false` runs in the foreground and returns the result; `true` launches asynchronously and returns immediately. Automatic completion starts a new parent turn; continue only non-overlapping work or end turn.
- `worktree` — `true` (background only) runs the subagent in an isolated git worktree on its own branch instead of the default full-access background sandbox; `write`/`edit` are permission-scoped to the worktree path and a snapshot is committed on completion. Requires a git repo. The session still starts in the parent repo, so the agent must `cd` into the worktree path.

Foreground tasks return the subagent's final text, with the child `task_id` in the result metadata for resuming.

Child sessions enforce parent ownership, derived deny rules, primary-only tool restrictions, and OpenCode's configured `subagent_depth`. The public plugin API does not expose native task prompt-part resolution, so `@file` and agent references inside delegated prompts are sent as text; include the needed paths or context explicitly.

## Background tasks

Set `background: true` on `task` for independent long-running work that should not block the calling agent:

```
task(subagent_type, description, prompt, task_id, model, reasoning, background=true)
```

Background mode returns as soon as the child starts with machine-readable launch XML (`resume_allowed="false"` and `completion_notification="automatic"`). Because it uses the real `task` tool ID and returns native-shaped `background` metadata, OpenCode's Task renderer shows the child session, spinner, navigation, and completion state on the original tool call instead of creating a fake user message. The child executes the full prompt in the background; never call `task` again with that `task_id` while running (no continue, status, wait, or poll calls). Attempting to do so fails immediately with a non-retryable `TASK_ALREADY_RUNNING` error without starting a second child. Continue only non-overlapping work; if no work remains, end the turn.

Native task permissions keep `task` disabled in foreground subagents by default unless that agent explicitly enables it; background subagents always deny nested tasks. The main agent can continue working while up to eight children run in parallel.

On completion, the original Task row changes to OpenCode's native completed or error state and the plugin shows a transient toast immediately when the child finishes, before the automatic parent response. It also adds a concise native-shaped completion row near the current scroll position, for example `✓ General Task (background) — Review auth` followed by `  ↳ 3 toolcalls · 2m 15s`. That visible row is marked `ignored`, so it is excluded from model context. The capped XML result is carried separately in a `synthetic` part that stays hidden in the TUI but is visible to the main agent. Completion starts a deterministic parent response automatically; because that is a new assistant turn, OpenCode renders its normal assistant footer.

Background sessions get full local access by default: `bash`, `write`, and `edit` alongside the read tools and `webfetch`. OpenCode permissions are name-based, so a sandbox that allows bash cannot honestly deny shell-level writes; denying the write/edit tools on top would only push agents into shell workarounds. Nested tasks and `todowrite` stay denied, and parent-configured deny rules are appended after the sandbox allows, so config remains the kill switch when strict read-only behavior is wanted. MCP resource readers map to `read`, and a custom tool that deliberately reuses an allowed built-in name cannot be distinguished by a plugin.

For changes that should stay isolated and revertable, such as large repos with overlapping edits, pass `worktree: true`. The task then runs in a throwaway git worktree on a fresh `opencode-task/<id>` branch under `~/.local/share/opencode/opencode-task-model/<project>/`; `write`/`edit` and external-directory access are permission-scoped to the worktree path, and the plugin commits a snapshot to the branch when the task finishes. Because `session.create` binds the child's working directory to the parent repo, the agent is instructed (and required) to `cd` into the worktree path for any changes; treat the worktree as branch-local, revertable isolation rather than an OS sandbox.

ESC ESC in the parent session cannot interrupt a background task: once the tool call returns, the parent has no active run for ESC to target. Press `ctrl+x`, then `down` to open the searchable Subagents picker, a custom Solid/OpenTUI dialog rendered through `api.ui.dialog.replace` (no OpenCode core modifications). The compact dialog uses the same focused native input and blinking cursor as OpenCode's command palette. While open, it refreshes child sessions once per second, so newly launched agents appear without reopening it. Fresh children remain running until synchronized terminal evidence arrives; there is no unreliable inactivity timeout. Rows show a theme-colored status indicator (`●` running in the info color, `✓` done in the success color, `×` failed in the error color) beside the neutral task title, which truncates with an ellipsis as the terminal narrows; status, agent, and a live-updating duration sit right-aligned on each row. All running indicators share one wall-clock Braille animation, so polling, row insertion, and viewport changes do not restart individual spinner phases. The search field matches task description, agent name, and task ID. The default Activity sort puts each newly launched task at the top, then moves it back to the top only when it completes or fails; intermediate progress never reshuffles rows. While the highlight remains on the first unfiltered Activity row, it follows each new launch or completion so the viewport stays at the newest event. After you navigate or search, refreshes preserve the selected task and move its row index as newer entries arrive. Refresh completion rebases against the latest selection, so navigation made during a poll is not rolled back. Press `ctrl+x`, then `s` inside the picker to toggle to chronological launch order (oldest first) and back. A dim footer lists navigation (`↑↓`), open (`enter`), close (`esc`), and the sort toggle hints. Arrow keys (plus page/home/end) navigate, `enter` opens the existing child-session view without changing the parent chat's scroll position, and `esc` closes. Double-press ESC in a child view to abort the viewed running subagent. The bundled TUI plugin (`opencode-task-model/tui`) supplies both behaviors. Enable it in `tui.json` (project `.opencode/tui.json` or `~/.config/opencode/tui.json`):

```json
{
  "plugin": [["opencode-task-model/tui"]]
}
```

Inside a subagent view the plugin also renders a composer under the Parent/Prev/Next footer, styled after OpenCode's own prompt. Type and press `enter`: while the subagent is running the text steers its current run; once it has finished, the text starts a follow-up in that same child session with its full context. Both use the child's own agent, model, and reasoning variant (taken from its latest user message), never the parent's current selection. They do not create another parent task call or completion notification; a follow-up after completion remains child-only. `esc esc` remains the hard stop that aborts the child and lets the parent's task resolve. `shift+enter` (or your `input_newline` keybind) inserts a newline.

The interrupt keybind defaults to `escape`, the picker to `<leader>down` (`ctrl+x`, then `down`), and sorting to `<leader>s` (`ctrl+x`, then `s`). Override them through the entry's options object using `taskmodel.subagent.interrupt`, `taskmodel.subagent.picker`, or `taskmodel.subagent.sort`. `bun run opencode:local` and `bun run opencode:install` keep this entry in sync with the rest of the plugin. Background tasks have no time limit: they run until the subagent finishes, errors, or is aborted, so without the TUI plugin there is no way to stop one from the TUI.

Live background state is kept in the plugin process. Completed state is capped at 100 tasks per parent session and 1,000 globally, retained in memory for one hour, and each stored result is capped at 500,000 characters. Completion-notification workers do not survive a full server restart, but completed child output remains available in the child session history.

## Picking models

There's no alias table — `model` takes a raw `providerID/modelID` string, so anything `opencode models` lists works without touching the plugin. This applies equally to foreground and background `task` calls. Reasoning is passed through as the prompt `variant`, so any effort tier the target model exposes works without further config.

Routing policy stays in your own markdown. `AGENTS.md`, an agent's `description` field, or a per-repo agents file, opencode already surfaces those to the model in context. Put "prefer `openai/gpt-5.6-terra` for reviews" wherever it belongs for you; the plugin just carries out the per-call override. No duplicated model registry baked into the tool description, no config schema to keep in sync.

## Releasing

This repository's release process is tag-driven via `.github/workflows/publish.yml`; maintainers do not run `npm publish` manually. To cut a release: bump `version` in `package.json`, commit it, then tag and push:

```sh
git tag vX.Y.Z
git push origin vX.Y.Z
```

The workflow verifies the tag matches `package.json`'s version, publishes an unpublished version via npm's OIDC trusted publishing (no stored token), and creates the corresponding GitHub Release if it does not already exist.

After the publish workflow completes, switch the maintainer setup from the local checkout to the newly published exact version, then restart OpenCode:

```sh
bun run opencode:install
```

## License

MIT
