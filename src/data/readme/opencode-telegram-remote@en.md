[简体中文](README.md) | [繁體中文](README.zh-Hant.md) | [English](README.en.md)

# opencode-telegram-remote

用 Telegram 在手机上遥控 OpenCode，电脑端的回复实时推送到手机。
A Telegram remote control for [OpenCode](https://opencode.ai) V2: chat with your sessions from your phone and get desktop replies pushed back in real time.

[![CI](https://github.com/HenryYannis/opencode-telegram-remote/actions/workflows/ci.yml/badge.svg)](https://github.com/HenryYannis/opencode-telegram-remote/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## Features

- **Native OpenCode V2 plugin.** Built with `Plugin.define` from `@opencode/plugin` (plugin id `telegram`). It runs inside the OpenCode server and starts and stops with it; there is no separate bridge process to keep alive.
- **Chat from your phone.** Plain text is sent as a prompt to the session your chat is bound to. The bot shows "typing…" while OpenCode works, then sends the reply back.
- **Desktop replies pushed to your phone.** The plugin listens to OpenCode's `session.text.ended` events, so replies produced in the desktop window are sent to every chat bound to that session. A delivery tracker makes sure the same reply is not sent twice.
- **`/current`** attaches your chat to the session you last viewed on the desktop, so you can switch between computer and phone in the same conversation.
- **Switch models** with `/model` (tap a button) or `/model <keyword>`.
- **Switch or create sessions** with `/sessions` and `/new`; stop a running task with `/abort`.
- **Permission prompts on your phone.** When OpenCode asks for permission in a bound session, you get the request with **Allow once / Always / Reject** buttons.
- **Allow-list.** Only the Telegram user IDs you list can use the bot; everyone else gets "Unauthorized".

## Requirements

- OpenCode V2 (the plugin is built against `@opencode/plugin` 2.2).
- Node.js 20 or newer (`engines.node` in `package.json`).
- A Telegram bot token from [@BotFather](https://t.me/BotFather) and your numeric Telegram user ID.

## Install

The package is not published to npm yet. Install it from GitHub with the OpenCode CLI:

```sh
opencode plugin add github:HenryYannis/opencode-telegram-remote
```

Or clone it and load it as a local plugin directory:

```sh
git clone https://github.com/HenryYannis/opencode-telegram-remote.git
cd opencode-telegram-remote
npm install
```

Then add the absolute path of the cloned folder to `~/.config/opencode/opencode.json(c)`:

```jsonc
{
  "plugins": ["/absolute/path/to/opencode-telegram-remote"]
}
```

## Configuration

Create `~/.config/opencode/telegram.json`:

```json
{
  "token": "YOUR_BOT_TOKEN",
  "allowedUsers": [123456789]
}
```

| Key | Required | Description |
| :--- | :--- | :--- |
| `token` | yes | Bot token from [@BotFather](https://t.me/BotFather) (`/newbot`). |
| `allowedUsers` | yes, non-empty | Numeric Telegram user IDs allowed to use the bot. Get yours from [@userinfobot](https://t.me/userinfobot). |

- No chat ID is needed: the bot answers any chat where the sender is on the allow-list. A private chat with your bot is the simplest setup.
- If the file is missing, `token` is empty, or `allowedUsers` is empty, the plugin does not start the bot (OpenCode keeps running normally).
- ⚠️ Anyone on the allow-list can run prompts on your machine through OpenCode. Only add your own ID, and keep `telegram.json` private.
- On Windows the path is `%USERPROFILE%\.config\opencode\telegram.json`.

Optional environment variable:

| Variable | Effect |
| :--- | :--- |
| `TELEGRAM_PLUGIN_DEBUG` | When set, writes a debug log to `~/.config/opencode/telegram-plugin.log`. |

## Commands

| Command | Action |
| :--- | :--- |
| *(plain text)* | Send a prompt to the bound session |
| `/current` | Attach to the session you last viewed on the desktop |
| `/model` | List models as buttons; `/model <keyword>` switches to the first model whose ID contains the keyword |
| `/sessions` | List the 10 most recent sessions, with buttons to switch |
| `/new` | Create a new session and bind to it |
| `/abort` | Stop the task running in the bound session |
| `/status` | Show the working directory, bound session and last viewed session |
| `/start` | Show help |

**Which session does plain text go to?** The session your chat is bound to. If there is none yet, the plugin uses the session you last viewed on the desktop, then the most recently updated session, and otherwise creates a new "Telegram remote session".

**Where does the model list come from?** From OpenCode's model list (`ctx.model.list()`). If that returns nothing, it falls back to the model keys under `providers.<id>.models` in `~/.config/opencode/opencode.json`.

## How desktop → phone sync works

```
A reply finishes in the desktop window
   ↓ OpenCode emits session.text.ended (sessionID, assistantMessageID, ordinal, text)
The plugin finds the chats bound to that session
   ↓ splits long text into chunks of up to 3800 characters
bot.api.sendMessage → your phone
```

Replies can arrive two ways: the event stream, and a fallback that reads the session after `session.wait()` when you sent the prompt from Telegram. Both paths share one delivery tracker (keyed by message ID and text segment), so each reply is delivered once.

## Limits

- Text only; photos and voice messages are not supported yet.
- One bot per machine. OpenCode loads the plugin once per location; a lock file (`~/.config/opencode/telegram-plugin.lock`) makes sure only one instance polls Telegram.
- Chat-to-session bindings live in memory and are cleared when OpenCode restarts. Send `/current` or `/sessions` to bind again.

## FAQ

**The bot does not answer.**
Check that `telegram.json` is valid JSON with a `token` and a non-empty `allowedUsers`, and that your ID is in the list. Set `TELEGRAM_PLUGIN_DEBUG=1`, restart OpenCode, and read `~/.config/opencode/telegram-plugin.log`.

**How do I turn the plugin off without uninstalling it?**
Add `"-telegram"` to `plugins` in `opencode.json(c)`, or remove `telegram.json`.

## Development

```sh
npm ci
npm run ci   # syntax check, unit tests, package validation, smoke import, pack dry-run
```

## License

[MIT](LICENSE) © 2026 Henry Yannis
