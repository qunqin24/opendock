# opencode-auto-review-completed-todos

> **Topic:** OpenCode Plugins · **Tags:** todo, review, productivity, automation

Auto-detect when all session todos are completed and send a review message. Fires once per session.

**Site:** [dracon.uk](https://dracon.uk)

## About

`opencode-auto-review-completed-todos` is an OpenCode plugin that automatically triggers a session review when all tasks are completed. It listens for OpenCode's internal `todo.updated` events — the same system used by the AI and UI — and sends a visible chat message prompting the AI to summarize the session.

Designed as the yin to [`opencode-todo-reminder`](https://www.npmjs.com/package/opencode-todo-reminder)'s yang: where todo-reminder nudges when tasks remain incomplete, this plugin triggers a review when all tasks are done.

## What it does

Listens for OpenCode's internal `todo.updated` events — whenever the todowrite tool creates, updates, or completes todos. When all todos have status `completed` or `cancelled`, it sends a review message to the chat. If new pending todos appear before the debounce fires, the review is cancelled.

This works with **any** todo source: the AI creating/checking todos via the todowrite tool, the user checking boxes in the UI, or the internal todo-reminder plugin.

**Design philosophy:** Pairs with `opencode-todo-reminder` as its complement. Todo-reminder nudges when tasks remain incomplete; this plugin triggers a review when all tasks are done.

## Install

### Option 1 — npm (recommended)

```bash
npm install -g opencode-auto-review-completed-todos
```

Register in `opencode.json`:

```json
"plugin": [
  "opencode-auto-review-completed-todos@latest"
]
```

OpenCode will automatically fetch and cache the latest version from npm. No manual file copying needed.

### Option 2 — manual

```bash
cp opencode-auto-review-completed-todos.js ~/.config/opencode/plugins/
```

Register in `opencode.json` (version will be pinned to whatever you copied):

```json
"plugin": [
  "opencode-auto-review-completed-todos"
]
```

Restart OpenCode.

## Configuration

```json
{
  "plugin": [
    ["opencode-auto-review-completed-todos", {
      "debounceMs": 500,
      "maxSessions": 100,
      "maxRetries": 2
    }]
  ]
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `debounceMs` | `number` | `500` | Wait after the last completed todo before sending message |
| `maxSessions` | `number` | `100` | Maximum concurrent sessions to track (oldest 20% evicted when limit is reached) |
| `maxRetries` | `number` | `2` | Retry prompt delivery this many times on failure (with backoff) |

## How it works

### Architecture

Per-session state is minimal:

```
SessionState
├── reviewFired: boolean         ← prevent double-fire
├── debounceTimer: Timer | null  ← debounce before sending
└── createdAt: number            ← used for LRU eviction when maxSessions reached
```

### Event handling

| Event | Action |
|-------|--------|
| `todo.updated` | Check all todos. If all completed/cancelled → schedule message. If any pending → cancel scheduled message. |
| `session.deleted` / `session.error` / `session.compacted` | Clean up session state |

### Review trigger flow

1. User/AI completes todos via OpenCode's todowrite tool
2. `todo.updated` event fires with updated todo list
3. Plugin checks `todos.every(t => t.status === "completed" || t.status === "cancelled")`
4. If all done → debounce timer starts (default 500ms, configurable via `debounceMs`)
5. Timer fires → sends message to chat: "All tasks in this session have been completed. Please perform a final review..." (with retry on failure). The AI is explicitly instructed to create todos for any issues found, not just note them.
6. AI responds with a session review summary

### How the message appears

Uses `client.session.prompt()` with `synthetic: false` — the same approach as `opencode-todo-reminder`. The message appears as a **normal chat message** that the AI responds to naturally.

## Yin and yang

| Plugin | When it triggers | What it does |
|--------|-----------------|--------------|
| `opencode-todo-reminder` | Todos remain incomplete | Nudges to complete tasks |
| `opencode-auto-review-completed-todos` | All todos complete | Triggers review |

## Status

**STABLE** — Published to [npm](https://www.npmjs.com/package/opencode-auto-review-completed-todos) (v1.0.5). Ready for production use.

Plugin:
- Detects `todo.updated` events from OpenCode's internal todowrite tool
- Sends visible chat message when all todos are completed
- AI responds with a session review summary
- Explicitly instructs AI to create todos for any issues found (not just note them)
- Debounces to avoid premature triggering
- Fires only once per session
- Configurable `maxSessions` cap prevents memory leak
- Retry with exponential backoff on prompt failure
- Structured logging for observability
- Cleans up on `session.deleted`, `session.error`, `session.compacted`

## Files

| Path | Description |
|------|-------------|
| `~/.cache/opencode/packages/` | OpenCode's npm package cache (used when referencing `@latest`) |
| `~/.config/opencode/plugins/opencode-auto-review-completed-todos.js` | Plugin file (manual install only) |
| `~/.npm-global/lib/node_modules/opencode-auto-review-completed-todos/` | npm package (global install) |
| `~/Dev/opencode-auto-review-completed-todos/` | Git-tracked source |

## Troubleshooting

**Plugin firing twice (duplicate review prompts):**
- This happens if the plugin is registered **both** as a local file in `~/.config/opencode/plugins/` **and** as an npm package reference. OpenCode loads both, causing double-fire.
- If using `@latest` in `opencode.json`, do **not** also copy the `.js` file to `~/.config/opencode/plugins/`.
- To fix: remove the local file from `~/.config/opencode/plugins/` and clear OpenCode's cache at `~/.cache/opencode/packages/`, then restart.

**Plugin not loading:**
- Verify `opencode.json` has `"opencode-auto-review-completed-todos"` (or `"opencode-auto-review-completed-todos@latest"`) in the `plugin` array
- Ensure `~/.config/opencode/plugins/opencode-auto-review-completed-todos.js` exists (manual install only)
- Only the `.js` file should be in the plugins directory — do not copy the `.ts` file

**Message not appearing:**
- Todos must be created via OpenCode's todowrite tool (not raw text like `- [ ]`)
- All todos must have status `"completed"` or `"cancelled"`
- Plugin fires only once per session (new session needed after firing)

## Requirements

- OpenCode with plugin support
- No additional npm dependencies

## License

This project is dual-licensed:

- **AGPL-3.0-only** — See [LICENSE](LICENSE) for the full text. This is the default license for open source use.
- **Commercial License** — For organizations that prefer not to comply with AGPLv3's source disclosure requirements. See [COMMERCIAL-LICENSE.md](COMMERCIAL-LICENSE.md) for details.

By contributing to this project, you agree to the terms in [CLA.md](CLA.md).
