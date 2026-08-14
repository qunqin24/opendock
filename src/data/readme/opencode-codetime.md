# opencode-codetime

[![npm version](https://img.shields.io/npm/v/opencode-codetime)](https://www.npmjs.com/package/opencode-codetime)
[![npm downloads](https://img.shields.io/npm/dm/opencode-codetime)](https://www.npmjs.com/package/opencode-codetime)
[![license](https://img.shields.io/npm/l/opencode-codetime)](https://github.com/roman-pinchuk/opencode-codetime/blob/main/LICENSE)
[![GitHub release](https://img.shields.io/github/v/release/roman-pinchuk/opencode-codetime)](https://github.com/roman-pinchuk/opencode-codetime/releases)
[![CI](https://img.shields.io/github/actions/workflow/status/roman-pinchuk/opencode-codetime/publish.yml?label=publish)](https://github.com/roman-pinchuk/opencode-codetime/actions)

[CodeTime](https://codetime.dev) plugin for [OpenCode](https://github.com/anomalyco/opencode) -- track your AI coding activity and time spent.

<img width="1004" height="159" alt="image" src="https://github.com/user-attachments/assets/6db5b25a-889a-4be8-95b6-46aaaf08e482" />
<img width="551" height="271" alt="image" src="https://github.com/user-attachments/assets/00273168-83df-4a79-829a-a401542496a3" />

## Features

- **Automatic time tracking** -- sends coding events to CodeTime when OpenCode reads, edits, or writes files
- **Check your coding time** -- ask the AI "what's my coding time?" and it fetches your stats via the `codetime` tool
- **Per-project filtering** -- view coding time for the current project or any specific project
- **Project breakdown** -- see a ranked table of all projects with time spent today
- **Language detection** -- detects 90+ programming languages from file extensions
- **Git integration** -- captures current branch and remote origin
- **Project identification** -- shows as `directory-name [opencode]` on your CodeTime dashboard
- **Rate-limited** -- one heartbeat per 2 minutes to avoid API spam
- **Session lifecycle** -- flushes pending events on session end so no data is lost
- **Zero config** -- just set your token and go

## Prerequisites

A [CodeTime](https://codetime.dev) account. Sign up for free at [codetime.dev](https://codetime.dev).

Get your upload token from [CodeTime Settings](https://codetime.dev/dashboard/settings).

## Installation

### Via opencode config (recommended)

Add to your `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-codetime"]
}
```

### From source

```bash
git clone https://github.com/roman-pinchuk/opencode-codetime
cd opencode-codetime
npm install && npm run build
```

Then copy the built files to your OpenCode plugins directory:

```bash
mkdir -p ~/.config/opencode/plugins
cp dist/*.js ~/.config/opencode/plugins/
```

## Configuration

Set your CodeTime upload token as an environment variable:

```bash
export CODETIME_TOKEN="your-upload-token-here"
```

Add it to your shell profile (`~/.bashrc`, `~/.zshrc`, etc.) to persist across sessions.

The plugin validates the token on startup and logs a warning if it is missing or invalid.

## How It Works

The plugin hooks into OpenCode's event system to detect file activity.

```
OpenCode events                    Plugin                         CodeTime API
+-----------------------+     +------------------+     +------------------------+
| message.part.updated  | --> | Extract files    | --> | POST /v3/users/event-log|
| (edit, write, read,   |     | Detect language  |     |                        |
|  patch, multiedit)    |     | Rate limit (2m)  |     | { eventTime, language, |
+-----------------------+     +------------------+     |   project, relativeFile,|
| session.idle          | --> | Force flush      |     |   editor: "opencode",  |
| session.deleted       |     | pending events   |     |   platform, git info } |
+-----------------------+     +------------------+     +------------------------+
```

### What gets tracked

Each heartbeat sent to CodeTime includes:

| Field | Value |
|-------|-------|
| `eventTime` | Unix timestamp of the event |
| `language` | Detected from file extension (e.g. `TypeScript`, `Python`) |
| `project` | `directory-name [opencode]` |
| `relativeFile` | File path relative to the project root |
| `editor` | `opencode` |
| `platform` | OS platform (`darwin`, `linux`, `windows`) |
| `gitOrigin` | Remote origin URL (if available) |
| `gitBranch` | Current branch name (if available) |

### Hooks used

| Hook | Purpose |
|------|---------|
| `event` | Listens for `message.part.updated` (tool completions) and `session.idle`/`session.deleted` (flush) |
| `chat.message` | Processes pending heartbeats on chat activity |
| `tool` | Registers `codetime` tool to check today's coding time |

### Commands

| Command | Description |
|---------|-------------|
| `/codetime` | Show today's total coding time |
| `/codetime-breakdown` | Show today's coding time broken down by project |

### `codetime` tool

The `codetime` tool supports optional arguments for project filtering:

| Argument | Type | Description |
|----------|------|-------------|
| `project` | string (optional) | Filter by project name. Use `"current"` to auto-detect the current project. Omit to show total time. |
| `breakdown` | boolean (optional) | When `true`, show a ranked breakdown of all projects. |

**Usage examples** (in natural language to the AI):

- "What's my coding time?" -- shows total time across all projects
- "How long have I been coding on this project?" -- shows time for the current project
- "Show me a breakdown of my coding time by project" -- shows ranked project list
- "How much time did I spend on my-app today?" -- shows time for a specific project

**Example outputs:**

```
# Total time (default)
Today's coding time: 2h 42m

# Current project
Today's coding time for opencode-codetime [opencode]: 1h 23m (Total across all projects: 2h 42m)

# Project breakdown
Today's coding time by project:

  opencode-codetime [opencode]    1h 23m
  my-other-project [vscode]         52m
  side-project [opencode]           27m
  ──────────────────────────────────────
  Total                           2h 42m
```

### Tool tracking

| Tool | Data Extracted |
|------|---------------|
| `read` | File path from title |
| `edit` | File path from filediff metadata |
| `write` | File path from metadata |
| `patch` | File paths from output |
| `multiedit` | File paths from each edit result |

## Project Structure

```
src/
  index.ts        Main plugin entry point with event hooks
  codetime.ts     CodeTime API client (token validation, heartbeats, stats)
  state.ts        Rate limiter (max 1 heartbeat per 2 minutes)
  language.ts     File extension to language name mapping
  git.ts          Git branch and remote origin extraction
  logger.ts       Structured logging via OpenCode SDK
```

## Development

```bash
# Install dependencies
npm install

# Type check
npm run typecheck

# Build
npm run build
```

## Troubleshooting

### Plugin not loading

1. Verify `opencode.json` syntax
2. Check that `CODETIME_TOKEN` is set in your environment
3. Check OpenCode logs for `opencode-codetime` messages

### Heartbeats not appearing in CodeTime

1. Verify your token at [codetime.dev/dashboard/settings](https://codetime.dev/dashboard/settings)
2. Make sure you are editing files (not just chatting) -- heartbeats fire on tool completions
3. Wait up to 2 minutes for rate-limited heartbeats to flush
4. Check that the CodeTime API is reachable: `curl -s https://api.codetime.dev/v3`

### Token validation fails

1. Regenerate your token at [codetime.dev/dashboard/settings](https://codetime.dev/dashboard/settings)
2. Make sure the token has no leading/trailing whitespace

## License

[MIT](LICENSE)
