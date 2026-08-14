# Smart Title Plugin

An OpenCode plugin that generates better session titles from conversation context and keeps the terminal window title in sync with session activity.

> [!WARNING]
> This project has only been tested in **Windows Terminal + WSL2 Ubuntu**.
> Terminal title updates are terminal-dependent, so behavior in other terminals, shells, tmux setups, or operating systems may differ.

## What this plugin does

- Generates short, meaningful session titles with AI
- Triggers title generation when the root session becomes idle
- Skips AI title generation for subagent sessions
- Updates the terminal title to reflect current activity
- Shows terminal activity states as:
  - `🟢 <project>` while the root session is active
  - `🤖 <project>` when only subagents are active
  - `💤 <project>` when the session is idle
- Avoids redundant terminal writes and duplicate in-flight title updates
- Throttles terminal title writes (3s cooldown) to prevent rapid status oscillation spam
- Enforces 30s cooldown between AI title generations per session
- Uses OpenCode authentication flow instead of requiring separate API keys in this plugin

## How it works

The main title update flow starts from the plugin event handler in `index.ts`.

1. The plugin listens for `session.idle` events.
2. When the idle threshold is reached, it collects smart conversation context.
3. It generates a session title with the configured model or a fallback model.
4. It updates the OpenCode session title.
5. In parallel, it updates the terminal window title using OSC title sequences on a best-effort basis.

Because terminal title updates rely on escape sequences instead of a dedicated terminal plugin API, terminal support is not guaranteed outside the tested environment.

## Requirements

- OpenCode with plugin support
- `@opencode-ai/plugin` version `>=0.13.7`
- An authenticated provider available through your OpenCode setup

## Installation

```bash
npm install @jc01rho/opencode-smart-title
```

Then add the plugin to your OpenCode config:

```json
{
  "plugin": ["@jc01rho/opencode-smart-title"]
}
```

## Configuration

The plugin supports both global and project-level configuration.

- Global config: `~/.config/opencode/smart-title.jsonc`
- Project config: `.opencode/smart-title.jsonc`

If no global config exists yet, the plugin creates a default one on first run.

Project config overrides global config.

### Example config

```jsonc
{
  // Enable or disable the plugin
  "enabled": true,

  // Write debug logs to ~/.config/opencode/logs/smart-title/YYYY-MM-DD.log
  "debug": false,

  // Optional: force a specific model
  // Format: "provider/model"
  // "model": "anthropic/claude-haiku-4-5",

  // Generate a title every N idle events
  "updateThreshold": 1
}
```

## Terminal title behavior

Terminal title sync is best-effort.

- The plugin writes OSC title sequences to an available TTY stream
- It includes tmux/screen-compatible wrapping when needed
- It sanitizes terminal title content before writing
- It skips writes when no TTY is available
- It avoids rewriting the same title repeatedly
- Terminal title writes are throttled to at most once every 3 seconds (`running` bypasses for responsive feedback)

This part of the plugin is the most environment-sensitive behavior in the project.
If you are not using Windows Terminal with WSL2 Ubuntu, expect possible differences.

## Development

```bash
npm run typecheck
npm run build
```

## Package contents

The published package includes:

- `dist/`
- `README.md`
- `LICENSE`

## License

MIT
