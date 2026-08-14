# Session Logger Plugin for OpenCode

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A JSONL session event logger plugin for [OpenCode](https://opencode.ai). Logs chat messages and tool executions as structured JSONL files, organized by session.

Inspired by [opencode-plugin-simple-memory](https://github.com/cnicolov/opencode-plugin-simple-memory) by Kris Nicolov.

## Setup

1. Add the plugin to your [OpenCode config](https://opencode.ai/docs/config/):

   ```json
   {
     "$schema": "https://opencode.ai/config.json",
     "plugin": ["@frankhommers/opencode-plugin-logger"]
   }
   ```

2. Enable logging via the `logger_set` tool or configuration file.

## Configuration

The plugin supports its own config files:

- Global defaults: `~/.config/opencode/logger.json`
- Per-project override: `.opencode/logger.json`

Project config overrides global config.

Example:

```json
{
  "logger": {
    "enabled": true,
    "scopes": [],
    "dir": "${project}/.agent-session-logs"
  }
}
```

Supported placeholders:

- `${home}`
- `${project}` (workspace/project root)
- `${workspace}` (alias of `${project}`)
- `${date}`
- `${env:VAR_NAME}`

## Tools

| Tool | Description |
|------|-------------|
| `logger_set` | Enable/disable logger and set scope filters |
| `logger_status` | Show active logger configuration |

## Log Structure

Logs are organized by session:

```
.agent-session-logs/
  2026-03-20-fix-auth-bug/
    main.jsonl              # Main session events
    explore-ses_abc.jsonl   # Subagent events
    codex-ses_def.jsonl     # Another subagent
```

Each line is a JSON object with fields like:

```json
{
  "ts": "2026-03-20T10:00:00.000Z",
  "event": "chat_message",
  "session_id": "ses_main",
  "parent_session_id": null,
  "root_session_id": "ses_main",
  "agent": "main",
  "message_id": "msg_1",
  "model": { "providerID": "anthropic", "modelID": "claude-opus-4" }
}
```

## Events Logged

- `chat_message` — Chat messages with model info and parts
- `tool_execute_before` — Tool call with args (before execution)
- `tool_execute_after` — Tool result with output (after execution)

## Local Development

```bash
git clone https://github.com/frankhommers/opencode-plugin-logger.git
cd opencode-plugin-logger
bun install
```

Point your OpenCode config to the local checkout:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["file:///absolute/path/to/opencode-plugin-logger"]
}
```
