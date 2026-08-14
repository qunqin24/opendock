# opencode-telegram-plugin

Control [OpenCode](https://opencode.ai) from your phone via Telegram. Send prompts, manage sessions, run shell commands, approve permissions, and execute any OpenCode slash command -- all from a Telegram chat.

## Installation

### From npm (recommended)

Add to your `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-telegram-plugin"]
}
```

Or install globally in `~/.config/opencode/opencode.json`.

OpenCode will automatically install the plugin using Bun.

### Manual install

Copy `telegram-plugin.ts` to your plugins directory:

```bash
# Global
cp telegram-plugin.ts ~/.config/opencode/plugins/

# Project-specific
cp telegram-plugin.ts .opencode/plugins/
```

Then add the dependency to your `package.json`:

```json
{
  "dependencies": {
    "node-telegram-bot-api": "^0.66.0"
  }
}
```

## Setup

### 1. Create a Telegram bot

1. Open Telegram and search for **@BotFather**
2. Send `/newbot` and follow the prompts to name your bot
3. Copy the **bot token** BotFather gives you

### 2. Get your chat ID

1. Send any message to your new bot
2. Open this URL in your browser (replace `<TOKEN>` with your bot token):
   ```
   https://api.telegram.org/bot<TOKEN>/getUpdates
   ```
3. Find `"chat":{"id":XXXXXXXX}` in the response -- that number is your chat ID

### 3. Set environment variables

Add these to your shell profile (`~/.zshrc`, `~/.bashrc`, etc.):

```bash
export TELEGRAM_BOT_TOKEN="your-bot-token"
export TELEGRAM_CHAT_ID="your-chat-id"
```

### 4. Restart OpenCode

The plugin loads at startup. You'll receive a "Connected!" message in Telegram when it's ready.

## Features

- **Chat with OpenCode** -- send any message as a prompt and get the full response back
- **All OpenCode commands** -- every built-in and custom slash command is available as `/oc_<name>`
- **Shell commands** -- run shell commands with `/shell` or the `!` prefix
- **Session management** -- create, list, switch, and abort sessions
- **Permission forwarding** -- tool permission requests are forwarded to Telegram with yes/always/no options; reply with YES, ALWAYS, or NO to respond. Auto-denies after 5 minutes
- **File diff view** -- see what files were changed in the current session
- **Auto-discovery** -- custom commands defined in `.opencode/commands/` or `opencode.json` are automatically registered in the Telegram bot menu at startup
- **Long message handling** -- responses are split to fit Telegram's 4096 character limit
- **Error notifications** -- session errors are forwarded to Telegram

## Commands

### Session management

| Command | Description |
|---------|-------------|
| `/start` | Show help and all available commands |
| `/new [title]` | Create a new session |
| `/sessions` | List recent sessions |
| `/switch <id>` | Switch to a session by ID prefix |
| `/status` | Show current session info |
| `/abort` | Abort the running task |
| `/diff` | Show files changed in the session |
| `/messages` | Show the last 5 messages |
| `/commands` | List all available OpenCode commands |

### Shell

| Command | Description |
|---------|-------------|
| `/shell <cmd>` | Run a shell command |
| `!<cmd>` | Inline shell (e.g. `!git status`) |

### OpenCode built-in commands

All OpenCode slash commands are available with the `/oc_` prefix:

| Command | Maps to |
|---------|---------|
| `/oc_undo` | `/undo` -- revert last message and file changes |
| `/oc_redo` | `/redo` -- restore undone message |
| `/oc_compact` | `/compact` -- summarize/compact the session |
| `/oc_share` | `/share` -- share the session |
| `/oc_unshare` | `/unshare` -- unshare the session |
| `/oc_init` | `/init` -- create or update AGENTS.md |
| `/oc_models` | `/models` -- list available models |
| `/oc_help` | `/help` -- show OpenCode help |

### Custom commands

Any custom commands you define in `.opencode/commands/` or your `opencode.json` config are automatically discovered and registered. For example, if you have a `/test` command, it becomes `/oc_test` in Telegram.

Custom commands can accept arguments:

```
/oc_test --coverage
```

## Permissions

When OpenCode needs permission to execute a tool (file edits, bash commands, etc.), the request is forwarded to Telegram with details about the tool. You can respond by:

- **Replying** to the permission message with:
  - `YES` or `Y` - Approve once
  - `ALWAYS` or `A` - Always allow this pattern
  - `NO` or `N` - Deny
- **Sending** `YES`, `ALWAYS`, or `NO` without replying (applies to most recent pending request)
- **Doing nothing** - Requests auto-deny after 5 minutes

Use `/pending` to see any pending permission requests.

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | Yes | Bot token from @BotFather |
| `TELEGRAM_CHAT_ID` | Yes | Your Telegram chat ID |

If either variable is missing, the plugin logs a warning and disables itself.

## Requirements

- [OpenCode](https://opencode.ai) v0.1+
- Node.js 18+
- `node-telegram-bot-api` npm package

## License

MIT
