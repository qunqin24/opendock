# opencode-gh-actions-status

An [OpenCode](https://opencode.ai) plugin that surfaces GitHub Actions workflow run statuses and unresolved PR review comments directly in your editor.

## Features

- **Instant push detection**: Shows a "Waiting for CI..." toast the moment the agent runs `git push` — before GitHub has even queued the run
- **Live status updates**: Transitions through `Waiting for CI...` → `1 running` → `1 passing` (or `1 failing`) as the run progresses
- **Post-push agent prompt**: When the agent runs `git push` and CI completes, the plugin automatically prompts the agent with the full run results and any unresolved review comments so it can react autonomously — fixing failures or addressing feedback without being asked
- **Unresolved comment count**: Toast includes a count of unresolved PR review threads so you always know if there is feedback waiting
- **Sidebar panel**: Color-coded list of the latest workflow runs for your current branch
- **Agent tool**: The AI agent can call `gh_actions` to check CI status and read the full text of unresolved review comments
- **Skill file**: Bundled `SKILL.md` is auto-registered via the `config` hook, with system prompt injection and compaction-safe context so the agent never loses awareness of the tool in long sessions

## Requirements

- [GitHub CLI (`gh`)](https://cli.github.com/) installed and authenticated
- [Git](https://git-scm.com/) available in your PATH

## Installation

Add to your `opencode.json`:

```json
{
  "plugin": ["opencode-gh-actions-status"]
}
```

## Configuration

Pass options as a tuple:

```json
{
  "plugin": [
    ["opencode-gh-actions-status", {
      "branch": "main",
      "limit": 10,
      "workflows": ["ci.yml", "deploy.yml"],
      "pollInterval": 60000,
      "toastInterval": 30000
    }]
  ]
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `branch` | `string` | `"current"` | Branch to check. `"current"` uses the active git branch. |
| `limit` | `number` | `5` | Maximum number of workflow runs to display. |
| `workflows` | `string[]` | all | Filter to specific workflow files. |
| `pollInterval` | `number` | `60000` | Cache TTL in ms for `gh run list` results used by the sidebar. |
| `toastInterval` | `number` | `30000` | How often (ms) the toast poll loop fires while CI runs are active after a push. |

## How it works

The plugin makes **no GitHub API calls at rest**. All polling is triggered exclusively by a `git push`:

1. The `tool.execute.after` hook detects when the agent runs `git push`
2. An immediate "Waiting for CI..." toast is shown before GitHub has queued the run
3. A poll loop starts, calling `gh run list` on `toastInterval` (default 30s) and updating the toast through each state transition
4. On completion, the final result toast is shown with a 30-minute duration and polling stops
5. The agent session is automatically prompted with the full CI report — including unresolved review comments — so it can autonomously react to failures or reviewer feedback

The toast message format:

```
1 passing
2 unresolved     ← only shown when there are unresolved PR review threads
```

## Status indicators

| Status | Color |
|--------|-------|
| `success` | Green |
| `failure` / `timed_out` | Red |
| `cancelled` / `skipped` | Yellow |
| `in_progress` / `queued` / `pending` | Blue |

## Agent tool: `gh_actions`

When the AI agent calls `gh_actions`, it receives:

- All workflow runs for the current HEAD commit with status, conclusion, and URL
- Full text of all unresolved PR review threads (file path, line number, author, comment body, and URL)

This allows the agent to proactively check CI results and address code review feedback without you having to ask.

## Skill & context persistence

The plugin ships a `skills/gh-actions/SKILL.md` file that describes when and how to use the `gh_actions` tool. It is installed automatically via three hooks:

| Hook | Purpose |
|------|---------|
| `config` | Registers the `skills/` directory so OpenCode discovers the skill on startup |
| `experimental.chat.system.transform` | Injects a short reminder about the tool into the system prompt on every LLM call, surviving context compaction |
| `experimental.session.compacting` | Adds context to the compaction summary so the agent retains awareness of the tool after long sessions |

## Post-push CI prompt

When the agent runs `git push` (detected via `tool.execute.after`), the plugin tracks the session ID. Once all workflow runs reach a final state, it calls `session.prompt()` to inject the full CI report — including unresolved review comments — as a synthetic message. This triggers an agent turn so it can autonomously fix CI failures or address reviewer feedback.

## Development

```bash
bun install
bun run build
bun run test
```

For local testing, reference the built plugin in your `opencode.json`:

```json
{
  "plugin": ["file:///path/to/opencode-gh-actions-status/dist/index.js"]
}
```
