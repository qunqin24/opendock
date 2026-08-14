# opencode-session-guardian

**Stop losing your work when OpenCode sessions crash.**

An [OpenCode](https://opencode.ai) plugin that prevents session crashes caused by oversized screenshots/images and lets you recover full context from any previous session.

## The Problem

If you use OpenCode with browser DevTools, Xcode, or any tool that takes screenshots, you've probably seen this:

```
messages.59.content.11.image.source.base64.data: At least one of the image dimensions exceed max allowed size: 8000 pixels
```

When this happens, your session breaks. You start a new one and **all context is gone** — what you were working on, which files you changed, what decisions were made. You have to explain everything again from scratch.

This plugin fixes that. Permanently.

## What It Does

### Automatic Protection (zero config, runs in the background)

| Protection | How |
|---|---|
| **Intercepts fullPage screenshots** | Detects `fullPage: true` on screenshot tools and switches to viewport-only before execution — no 8000px crash |
| **Filters oversized images from context** | Base64 images >4MB in the conversation history are replaced with lightweight text placeholders before being sent to the LLM |
| **Truncates giant tool outputs** | If any tool returns >4MB of data (common with base64 screenshots), it's truncated to protect the session |
| **Improves session compaction** | When OpenCode compacts a session, the plugin injects instructions to produce a more detailed and useful summary |

### Recovery Tools (4 new tools available to the agent)

| Tool | Purpose |
|---|---|
| `session_recover_last` | **Start here after a crash.** Automatically recovers context from the most recent broken session in your current project |
| `session_list` | Lists all sessions for the current project with dates, titles, and file change counts |
| `session_recover` | Recovers full context from a specific session by ID — messages, tool calls, file diffs |
| `session_search` | Full-text search across ALL sessions to find where specific work was done |

## Installation

### 1. Add to your config

Edit `~/.config/opencode/opencode.json` and add `"opencode-session-guardian"` to the `plugin` array:

```json
{
  "plugin": [
    "opencode-session-guardian"
  ]
}
```

If you already have plugins:

```json
{
  "plugin": [
    "your-existing-plugin",
    "opencode-session-guardian"
  ]
}
```

### 2. Restart OpenCode

OpenCode automatically downloads and installs plugins listed in your config from npm on startup. No manual `npm install` needed. All protections are active immediately.

## Usage

### Automatic Protection

You don't need to do anything. The plugin works silently in the background:

- When the agent tries a `fullPage` screenshot → intercepted, switched to viewport
- When an image in history is >4MB base64 → stripped from context, replaced with a text note
- When a tool returns >4MB of output → truncated with a warning
- When a session compacts → better summarization instructions are injected

You'll see `[SESSION-GUARDIAN]` log messages when the plugin acts.

### After a Session Crash

When you start a new session after a crash, just say:

> "Use session_recover_last to get the context from my previous session"

The agent will call the tool and receive a full summary including:
- What you were working on
- Which files were modified (with addition/deletion counts)  
- The conversation history (user messages, assistant responses, tool calls)

### Finding a Specific Session

```
"Use session_list to show my recent sessions"
```

```
"Use session_recover with session ID ses_abc123... to get that context"
```

### Searching Across All Sessions

```
"Use session_search to find sessions where we worked on the login page"
```

## How It Works Internally

OpenCode stores all session data in two places:

1. **SQLite database** at `~/.local/share/opencode/opencode.db` — the authoritative store
2. **JSON files** at `~/.local/share/opencode/storage/` — file-based mirror

This plugin reads from both (SQLite first, JSON fallback) using read-only connections. It never writes to or modifies your session data.

### Plugin Hooks Used

| Hook | Purpose |
|---|---|
| `tool.execute.before` | Intercepts screenshot tool calls to disable `fullPage` |
| `tool.execute.after` | Truncates oversized tool outputs |
| `experimental.chat.messages.transform` | Filters oversized base64 images from message history |
| `experimental.session.compacting` | Adds context to improve compaction summaries |
| `tool` | Registers the 4 recovery tools |

## Configuration

The plugin works out of the box with sensible defaults. If you need to customize limits, edit the constants at the top of `index.js`:

```javascript
const MAX_IMAGE_SIZE_BYTES = 4 * 1024 * 1024; // 4MB — adjust if needed
```

## Requirements

- OpenCode >= 1.0.220
- Node.js >= 18
- `@opencode-ai/plugin` >= 1.3.17
- `sqlite3` CLI (pre-installed on macOS and most Linux — no native Node modules needed)

## Troubleshooting

### Plugin not loading

Check that it's listed in `~/.config/opencode/opencode.json` under `"plugin"`. OpenCode installs plugins automatically to `~/.opencode/node_modules/` on startup. You can verify it's there with:

```bash
ls ~/.opencode/node_modules/opencode-session-guardian/
```

### Recovery tools not showing up

Restart OpenCode after installing the plugin. The tools register on startup.

### sqlite3 not found

The plugin uses the system `sqlite3` CLI (comes pre-installed on macOS and most Linux distros). No native Node.js modules are required. If `sqlite3` isn't available, the plugin falls back to reading JSON files from `~/.local/share/opencode/storage/`.

### Database access

The plugin reads the database via `sqlite3` CLI in read-only mode, so it never conflicts with OpenCode's writes.

## License

MIT

## Contributing

Issues and PRs welcome. The plugin is a single `index.js` file — easy to hack on.
