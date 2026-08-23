English | [中文版文档](README.zh.md)

# opencode-idle-continue

OpenCode plugin that automatically sends prompts to continue processing when idle.

## Features

- **Idle Detection**: Monitors OpenCode idle status and triggers continuation logic during idle periods
- **Automatic Prompt Delivery**: Reads prompt content from specified markdown files and sends to OpenCode for continued processing
- **Hot Reload**: Automatically reloads prompt files when modified without restarting the plugin
- **File Change Monitoring**: Maintains a list of files to monitor for content/timestamp changes
- **Wait State Management**: Enters wait state when sent prompts don't change monitored files, with interval backoff mechanism
- **User Activity Suppression**: After user sends a message, idle detection is suppressed for configurable period (default 5 minutes)
- **Initial Idle Delay**: Waits specified time (default 10 minutes) after plugin startup before first idle detection
- **AI Stuck Detection & Recovery**: Monitors AI response activity and automatically recovers from stuck states
- **Two Working Modes**:
  - **Traditional Mode**: Direct prompt delivery with file monitoring and interval backoff
  - **Subagent Mode**: Triggers OpenCode's native Task tool to launch sub-agents with automatic session management

## Installation

### Method 1: Global Installation

```bash
npm install -g opencode-idle-continue
```

After global installation, install to your desired location:

```bash
# Install to system config
opencode-idle-continue install system

# Install to current project
opencode-idle-continue install local

# Install to specific directory
opencode-idle-continue install /path/to/project
```

### Method 2: Local Development Installation

```bash
bash install-local.sh
```

This script:
1. Builds the `dist/` directory
2. Creates tarball `dist/opencode-idle-continue-1.0.0.tgz`
3. Copies `dist/` contents to `.opencode/plugins/idle-continue/`
4. Installs `@opencode-ai/plugin` dependency in `.opencode/`
5. Updates `opencode.json` to add plugin reference `./plugins/idle-continue/index.js`

After installation, restart OpenCode to load the plugin.

## Configuration

All parameters are configured via `idle-continue.json`. Configuration file lookup order:

1. Project root directory
2. `.opencode/` directory
3. `~/.config/opencode/` directory

### Prompt File Lookup Order

The prompt file (`idle-prompt.md` by default) is searched from the current directory upward, checking two locations per level:

1. `{dir}/{prompt_file}` (e.g., `idle-prompt.md`)
2. `{dir}/.opencode/{prompt_file}` (e.g., `.opencode/idle-prompt.md`)

Then `{dir}` moves up one level (parent directory) and checks the same two locations again. For example, if the current directory is `/a/b/c/d`, the search order is `/a/b/c/d`, `/a/b/c`, `/a/b`, `/a`, each checking both `{prompt_file}` and `.opencode/{prompt_file}`. The system root directory (e.g., `/`) is never searched.

If no prompt file is found, the behavior depends on `enable_default_prompt`:
- When `enable_default_prompt` is `false` (default), no message is sent
- When `enable_default_prompt` is `true`, the built-in default prompt is used

### Configuration Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `prompt_file` | string | `"idle-prompt.md"` | Path to prompt file |
| `watch_files` | string[] | `["task.md", "wish-list.md"]` | List of files to monitor |
| `check_interval_minutes` | number | `30` | Check interval during wait state (minutes) |
| `max_idle_cycles` | number | `5` | Max consecutive idle cycles before interval doubling |
| `enabled` | boolean | `true` | Whether the plugin is enabled |
| `log_level` | string | `"none"` | Log level: `"debug"` (detailed info), `"warn"` (warnings and errors), `"error"` (errors only), `"none"` (no logging) |
| `enable_default_prompt` | boolean | `false` | Whether to use built-in default prompt when prompt file doesn't exist |
| `subagent_enabled` | boolean | `false` | Whether to enable subagent mode |
| `subagent_agent_type` | string | `"explore"` | Subagent type (only when subagent_enabled=true) |
| `subagent_delay_ms` | number | `60_000` | Subagent trigger delay in milliseconds (only when subagent_enabled=true) |
| `debounce_delay_ms` | number | `60000` | Idle debounce confirmation delay in milliseconds (default 1 minute) |
| `initial_idle_delay_minutes` | number | `10` | Initial idle delay before first idle detection (minutes, default 10) |
| `user_activity_suppress_seconds` | number | `300` | User activity suppression period after user input (seconds, default 5 minutes) |
| `stuck_threshold_minutes` | number | `20` | AI stuck detection threshold in minutes (default 20min) |
| `ai_stuck_action` | string | `"ignore"` | AI stuck recovery action: `"ignore"`, `"abort"`, or `"abort_and_retry"` |
| `ai_stuck_retry_prompt` | string | `"continue"` | Prompt text for retry when ai_stuck_action is `"abort_and_retry"` |

### Example `idle-continue.json`

```json
{
  "prompt_file": "idle-prompt.md",
  "watch_files": ["task.md", "wish-list.md"],
  "check_interval_minutes": 30,
  "max_idle_cycles": 5,
  "enabled": true,
  "debounce_delay_ms": 60000,
  "initial_idle_delay_minutes": 10,
  "user_activity_suppress_seconds": 300,
  "stuck_threshold_minutes": 20,
  "ai_stuck_action": "abort_and_retry",
  "ai_stuck_retry_prompt": "continue"
}
```

## Working Principles

### Mode 1: Traditional Mode (Default)

1. **Idle Detection**: Monitors system idle status. Triggers when OpenCode is idle.
2. **User Activity Detection**: 
    - **Message Detection**: Detects when user sends messages (via `chat.message` hook)
    - **Activity Suppression**: After user activity, idle detection is suppressed for configurable period (default 5 minutes)
    - **Initial Idle Delay**: Waits specified time (default 10 minutes) after plugin startup before first idle detection
    - **Debounce Delay**: Confirms idle status with configurable debounce delay (default 1 minute)
3. **Send Prompt**: Reads prompt content from specified markdown file and sends to OpenCode for continued processing. If prompt file doesn't exist:
    - When `enable_default_prompt` is `false` (default), no message is sent
    - When `enable_default_prompt` is `true`, sends built-in default prompt
4. **AI Stuck Detection & Recovery**:
    - Monitors AI response activity through heartbeat events (message updates, part updates, deltas)
    - Detects stuck state when session is busy but no activity for configured threshold (default 20 minutes)
    - Configurable recovery actions:
      - `"ignore"` - Do nothing (default)
      - `"abort"` - Abort the stuck session
      - `"abort_and_retry"` - Abort session, wait 30 seconds, then send retry prompt
5. **Prompt Hot Reload**: Checks if prompt file has been modified each time `prompt_file` is used. Uses cached content if unchanged, reloads and updates cache if modified, no need to restart plugin.
6. **File Change Monitoring**: Maintains a list of files to monitor for content/timestamp changes.
7. **Wait State**: If no changes in monitored files after sending prompt, enters wait state. Wait state requires:
    - Continuous system idle
    - No changes in monitored files
8. **Interval Backoff**: During wait state, sends prompt every interval (default 30 minutes). If 5 consecutive checks still idle (files unchanged), next wait interval doubles.

### Mode 2: Subagent Mode

1. **Idle Detection**: Same as traditional mode, monitors system idle status.
2. **Delayed Execution**: Waits specified time (default 60 seconds) after detecting true idle.
3. **Trigger Subagent**: Calls Task tool via main agent to launch subagent. Leverages OpenCode Host's native capabilities to automatically create sub-sessions, render clickable links, and save complete message history.
4. **Subagent Management**: Host automatically handles sub-session lifecycle including creation, execution, completion, and history preservation.
5. **User Interaction**: Users can click links to switch to sub-session view and view subagent's complete output.

## Files

- `idle-prompt.md` — Default prompt file, contains prompt content sent to OpenCode
- `task.md` — Default monitored file, records current tasks
- `wish-list.md` — Default monitored file, records pending wish list
- `idle-continue.json` — Configuration file

**Default Prompt**: When `enable_default_prompt` is `true` and the prompt file doesn't exist, uses the built-in default prompt:
```
You are a helpful AI assistant. Please continue working on the current task or project context. Review any existing files, understand the current state, and suggest next steps or continue with the implementation.
```

## CLI Commands

```bash
# Install to system config
opencode-idle-continue install system

# Install to current project
opencode-idle-continue install local

# Install to specific directory
opencode-idle-continue install /path/to/project

# Refresh plugin cache
opencode-idle-continue update

# Remove plugin
opencode-idle-continue uninstall

# Show help
opencode-idle-continue --help

# Show version
opencode-idle-continue --version
```

## Build and Package

Source code is pure JavaScript ESM, no transpile needed. Build copies `src/` to `dist/`:

```bash
npm run build
```

Build command:
```
node tools/build.mjs
```

Output:
- `dist/index.js` — Plugin entry (same as `src/index.js`)
- `dist/opencode-true-idle-detector.js` — Idle detection module with user activity and stuck detection
- `dist/subagent-trigger.js` — Subagent trigger module
- `dist/wait-state.js` — Wait state module
- `dist/file-utils.js` — File utility module
- `dist/cli/index.js` — CLI entry point
- `dist/package.json` — npm package distribution manifest

Works with both node and bun.

## Project Structure

```
opencode-idle-continue/
│
├── src/
│   ├── index.js                          ← Plugin only entry. Exports { id, server }
│   ├── opencode-true-idle-detector.js    ← OpenCodeTrueIdleDetector class (idle detection debouncing state machine)
│   ├── subagent-trigger.js               ← SubagentTrigger class (subagent trigger)
│   ├── wait-state.js                     ← WaitState class (wait state and backoff)
│   ├── file-utils.js                     ← File utilities (prompt loading, file snapshots, change detection)
│   └── cli/
│       └── index.js                      ← CLI entry point for installation commands
│
├── src/__tests__/
│   ├── opencode-true-idle-detector.test.js  ← Idle detection state machine tests
│   ├── prompt.test.js                       ← Prompt file reading/hot reload tests
│   ├── file-watch.test.js                   ← File snapshot/change detection tests
│   ├── wait-state.test.js                   ← Wait state and backoff tests
│   └── index.test.js                        ← Integration tests
│
├── dist/
│   ├── index.js                          ← Build output
│   ├── opencode-true-idle-detector.js    ← Build output
│   ├── subagent-trigger.js               ← Build output
│   ├── wait-state.js                     ← Build output
│   ├── file-utils.js                     ← Build output
│   ├── cli/
│   │   └── index.js                      ← CLI entry point
│   └── package.json                      ← npm package distribution manifest
│
├── tools/
│   └── build.mjs                         ← Build script
│
├── install-local.sh                      ← Build + local installation script
├── clean.sh                              ← Uninstallation script
│
├── package.json                          ← npm package configuration
├── README.md                             ← English documentation
├── README.zh.md                          ← Chinese documentation
├── LICENSE
└── .gitignore
```

## License

MIT

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for a list of changes in each version.