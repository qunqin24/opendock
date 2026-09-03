# gutchapa-opencode-telegram

[![npm version](https://img.shields.io/npm/v/gutchapa-opencode-telegram)](https://www.npmjs.com/package/gutchapa-opencode-telegram)
[![npm downloads](https://img.shields.io/npm/dm/gutchapa-opencode-telegram)](https://www.npmjs.com/package/gutchapa-opencode-telegram)
[![license](https://img.shields.io/npm/l/gutchapa-opencode-telegram)](LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/gutchapa/opencode-telegram)](https://github.com/gutchapa/opencode-telegram)

## Install

One line, ready to go:

```bash
npm install gutchapa-opencode-telegram
```

It ships a CLI (`opencode-telegram-bot`) plus an opencode plugin. Set your bot
token and allowed users, then run it (see the setup section below for the full
walkthrough — standalone, launchd/systemd, or Docker).

A Telegram bot for [opencode](https://opencode.ai). Chat with your local AI
assistant from Telegram — run commands, read/search/list files, and control the
agent with 70+ slash commands (`/reset`, `/status`, `/model`,
`/goal`, `/skills`, `/tell`, ...).

Two ways to run it:

1. **As an opencode plugin** — load it from `opencode.json` and it registers
   with the running opencode instance (TUI, `opencode serve`, or `opencode run`).
   Telegram polling is opt-in; enable it per config (see below). Agentic replies
   run against the hosting opencode server via the SDK client.
2. **As a standalone bot** (`opencode-telegram-bot` / `npm start`) — a
   long-running Telegram poller that spawns `opencode run` for agentic replies.
   Use this if you want the bot available even when opencode is not running
   (e.g. via launchd, systemd, or Docker).

## Install as a plugin

Add it to your opencode config (`~/.config/opencode/opencode.json`):

```json
{
  "plugin": [
    "gutchapa-opencode-telegram"
  ]
}
```

Configure your bot token. The plugin looks for it in this order:

1. plugin options:
   ```json
   {
     "plugin": [
       ["gutchapa-opencode-telegram", { "botToken": "123456:ABC..." }]
     ]
   }
   ```
2. the `TELEGRAM_BOT_TOKEN` environment variable

Telegram polling is opt-in so installing the plugin never silently starts a
second poller. Enable it with a plugin option:

```json
{
  "plugin": [
    ["gutchapa-opencode-telegram", { "enabled": true }]
  ]
}
```

or with `TELEGRAM_PLUGIN_ENABLED=1` in the opencode process environment.

Create a bot with [@BotFather](https://t.me/BotFather) to get a token.

## Standalone mode

```bash
npm install -g gutchapa-opencode-telegram
TELEGRAM_BOT_TOKEN=123456:ABC... opencode-telegram-bot
```

Or from a checkout:

```bash
npm install
npm run build
TELEGRAM_BOT_TOKEN=123456:ABC... npm start
```

For 24/7 availability, run it under launchd/systemd (see
`examples/launchd.plist` for a macOS template).

> **Note:** do not run the standalone bot and the plugin at the same time with
> the same token — both poll Telegram's `getUpdates` and will steal each
> other's updates.

## Configuration

| Variable | Default | Description |
| --- | --- | --- |
| `TELEGRAM_BOT_TOKEN` | _(required)_ | Bot token from BotFather |
| `TELEGRAM_PLUGIN_ENABLED` | _(unset)_ | Set to `1` to enable Telegram polling when running as an opencode plugin |
| `ALLOWED_TELEGRAM_USERS` | `<your_telegram_user_id>` | Comma-separated numeric Telegram user IDs allowed to run shell commands and agentic replies |
| `OPENCODE_BIN` | `opencode` | Path to the `opencode` binary (standalone mode) |
| `OPENCODE_CWD` | `~/.opencode-bot-ws` | Working directory for agentic runs / sessions |
| `OPENCODE_TIMEOUT_MS` | `180000` | Agentic timeout |
| `LLM_ENDPOINT` | `http://127.0.0.1:8095/v1/chat/completions` | Fallback LLM endpoint used when the agentic path fails |
| `LLM_MODEL` | `qwen3.5-9b` | Fallback model name |
| `LLM_TIMEOUT_MS` | `60000` | Fallback LLM timeout |

The fallback LLM path talks to an OpenAI-compatible endpoint (e.g. llama.cpp)
so the bot still answers even without an opencode agent available.

## Commands

Type `/` in Telegram to see the command menu (synced automatically at startup,
both in private chats and groups). Highlights:

- Tools: `/execute`, `/exec`, `/bash`, `/read`, `/search`, `/list`
- Session: `/new`, `/reset`, `/restart`, `/status`, `/stop`, `/goal`,
  `/steer`, `/tell`, `/fast`, `/focus`, `/prose`
- Model & config: `/model`, `/models`, `/config`, `/plugins`, `/skills`,
  `/activation`
- Info: `/help`, `/commands`, `/whoami`, `/id`

## Security

- The bot token is read from env / options / local config only — never from
  source code. `config.json` and `.env` are excluded from the published npm
  package.
- Shell commands (`/execute`) and agentic replies are restricted to
  `ALLOWED_TELEGRAM_USERS`.
- `/activation mention` makes the bot only reply when mentioned or when a
  message starts with `/`.

## Development

```bash
npm install
npm run build
```

## Feedback & Support

Found a bug, have a feature request, or want to say hi? Feedback lives on GitHub:

- **Issues:** https://github.com/gutchapa/opencode-telegram/issues
- **Discussions:** https://github.com/gutchapa/opencode-telegram/discussions

Check `npm run status` in a checkout of the repo for download and traffic stats.

## License

MIT
