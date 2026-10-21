# opencode-telegram-notify

[![CI](https://github.com/Hamza-Abili/opencode-telegram-notify/actions/workflows/ci.yml/badge.svg)](https://github.com/Hamza-Abili/opencode-telegram-notify/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/%40hamzaabili/opencode-telegram-notify)](https://www.npmjs.com/package/@hamzaabili/opencode-telegram-notify)
[![npm downloads](https://img.shields.io/npm/dt/%40hamzaabili/opencode-telegram-notify)](https://www.npmjs.com/package/@hamzaabili/opencode-telegram-notify)
[![GitHub stars](https://img.shields.io/github/stars/Hamza-Abili/opencode-telegram-notify?style=social)](https://github.com/Hamza-Abili/opencode-telegram-notify/stargazers)
[![license](https://img.shields.io/badge/license-MIT-blue)](https://github.com/Hamza-Abili/opencode-telegram-notify/blob/main/LICENSE)

Telegram notifications for [OpenCode][] — **v1 and v2** — with **tap-only
inline buttons** for permission requests. Never auto-approves anything.

> 🔐 "OpenCode needs you" — permission requests, questions, completions and
> failures land in your Telegram chat while OpenCode keeps running on your
> server or workstation.

[OpenCode]: https://opencode.ai

```
🔐 Permission request
Project: my-app · Session: Fix login

shell
  > npm test

[ Allow once ] [ Reject ]
[ Always allow ]
        → tap ✅ → OpenCode continues. Nothing runs without you.
```

## Why another Telegram plugin?

Since OpenCode v2 ({id, setup} plugin contract) landed, the Telegram extensions
people know — `opencode-telegram-bot-plugin`, `opencode-channels-*`,
Tommertom's list entries — are still written against the **v1 SDK** and either
stop loading, lack permission handling, or pull a bot framework + extra shared
runtime for a task that needs none of it.

This plugin is different in four ways:

| | opencode-telegram-notify | typical alternatives |
| --- | --- | --- |
| OpenCode versions | **v1 + v2** (two entries, one shared core) | v1 SDK only |
| Runtime dependencies | **zero** (plain `fetch`) | bot frameworks / channels stacks |
| Permissions | tap-only inline buttons → supported reply surface | missing or reply-as-prompt (hallucination risk) |
| Safety model | one bot = one chat, single-poller lock, ownership gate, event dedupe | assumptions |

Scope is deliberate: **notifications + tap-only permission buttons**. It is not
a chat-with-your-agent relay, it never injects text into your sessions.

## Features

- 🔌 **Works with OpenCode v1 and v2** — the v2 default export (`{id, setup}`)
  and a v1 `legacy` entry share the same core; only events transport and
  permission reply surface differ per version.
- 🔐 **Permission requests** as messages with three buttons: *Allow once*,
  *Always allow*, *Reject* — mapped to `client.permission.reply`
  (`once` / `always` / `reject`). Tap-only: no free text, no prompt injection,
  no auto-approval.
- ✍️ **Live feedback** — buttons are replaced with ✅/🚫 confirmations and a
  toast appears on tap; on next OpenCode restart older buttons answer politely
  with "outdated" instead of dying silently.
- ❓ **Questions** (v2 `form.*`) answered in chat: single-select questions
  arrive as tap buttons (answer via `session.form.reply` when available,
  otherwise `question.reply`; skip via `question.reject`), other question types
  stay notify-only with the terminal pointer, and pending questions survive
  restarts (`question.list` recovery). When the host exposes no reply surface
  (OpenCode 2.1.1 currently exposes none), the message is notify-only with the
  terminal pointer instead of showing dead buttons.
- ✅ / ❌ / ⏹ **Lifecycle events** — completion (debounced so mid-run pauses
  don't spam), failure with error type, cancellation (silent).
- 🤖 **Bot command menu** — `/start`, `/status`, `/setup`, `/stop`, `/help`
  registered via `setMyCommands`, so the ☰ menu works out of the box.
  `/setup` prints a copy-paste-ready `opencode.jsonc` block.
- 🏠 **Multi-instance safe** — several OpenCode instances on one host: each
  notifies only for its own project root; a single-poller file lock guarantees
  only one process consumes `getUpdates`; process-level event-id dedupe means
  reloads don't double-send.
- 🌐 **en / it** notification language.
- 🔒 **Private by default** — `hideCommands: true` replaces shell/tool args with
  a count; every log line and error message is token-redacted.

## Requirements

- OpenCode **v2** (tested on 2.1.1) or **v1** (the hooks-based
  `@opencode-ai/plugin` contract, e.g. the 1.x line). v1 has no per-plugin
  options, so its configuration is environment-driven only.
- A Telegram bot token (via [@BotFather] — takes one minute) and the chat id of
  your user or group.
- [Bun] **only if you run the dev tooling** (typecheck/tests). The plugin itself
  runs inside OpenCode with zero extra installs.

[@BotFather]: https://t.me/BotFather
[Bun]: https://bun.sh

## Install (3 minutes)

### 1. Create the bot and get your chat id

1. In Telegram, chat with `@BotFather`, send `/newbot`, follow prompts, copy the
   token (looks like `123456789:AA…`).
2. Send `/start` to your bot once, then find your numeric chat id — the
   `/start` reply echoes your chat id in a copy block, or message
   `@userinfobot`.

### 2. Point OpenCode at the plugin

**OpenCode v2** — add it to `~/.config/opencode/opencode.jsonc`. Use a source
checkout path (works on every v2 build) or the npm name where supported:

```jsonc
{
  "plugins": [
    {
      "package": "/absolute/path/to/opencode-telegram-notify",
      "options": {
        "telegram": {
          "botToken": "${TELEGRAM_BOT_TOKEN}",
          "chatId": "${TELEGRAM_CHAT_ID}"
        },
        "language": "en"
      }
    }
  ]
}
```

(the npm form `"package": "@hamzaabili/opencode-telegram-notify"` is verified:
the v2 loader resolves the name from the registry and caches it under
`~/.cache/opencode/npm/`; other builds may only accept absolute paths.)

**OpenCode v1** — register the `legacy` entry as a plugin name in
`opencode.json`:

```json
{
  "plugin": [
    "@hamzaabili/opencode-telegram-notify/legacy"
  ]
}
```

If your v1 build does not resolve npm package specifiers, clone this repo and
point the entry at the local file:

```json
{ "plugin": ["/absolute/path/to/opencode-telegram-notify/src/legacy.ts"] }
```

### 3. Provide the environment

The plugin expands `${VAR}` in option values and falls back to the flat env
names, so secrets never sit in `opencode.jsonc`:

```sh
export TELEGRAM_BOT_TOKEN="123456789:AA…"
export TELEGRAM_CHAT_ID="123456789"        # negative number for group chats
export TELEGRAM_LANGUAGE="en"              # optional (mainly for OpenCode v1)
```

(For a `systemd` unit or `docker compose` install, pass these environment
variables into the OpenCode process environment.)

### 4. Restart OpenCode

- if `TELEGRAM_CHAT_ID` was unset, run `/start` in the bot chat — the reply
  already contains your chat id inside a `<code>` block;
- every future permission request arrives as a message you can answer by tap.

## Configuration reference

All options live under `options.` of the plugin entry. Only `botToken` and
`chatId` are required.

| Option | Type | Default | What it does |
| --- | --- | --- | --- |
| `telegram.botToken` | string | — | Bot token; `"${VAR}"` expands from process env |
| `telegram.chatId` | string | — | Destination chat (user id or negative group id) |
| `telegram.allowedUserIds` | string[] | `[]` | Extra guard: only these Telegram user ids may tap buttons or run commands (empty = everyone reaching this bot token) |
| `language` | `"en" \| "it"` | `"en"` | Notification language |
| `events.permission` | boolean | `true` | Permission request notifications + buttons |
| `events.question` | boolean | `true` | Question (`form.created`) notifications |
| `events.idle` | boolean | `true` | Completion notifications (debounced) |
| `events.error` | boolean | `true` | Failure and cancellation notifications |
| `interactions` | boolean | `true` | When `false`, permissions go out as simple messages (no buttons) |
| `idleDebounceMs` | number | 60000 | Wait after `execution.succeeded` before pinging you; any new activity cancels it |
| `idleCooldownMs` | number | 600000 | Min gap between completion notifications for the same session — conversational pauses never spam (0 disables) |
| `maxMessageChars` | number | 3800 | Max body length (Telegram hard limit is 4096) |
| `hideCommands` | boolean | `false` | Replace shell/tool arguments with `[n]` in bodies |
| `logFile` | string | off | Append-only debug log path (token-redacted, one line per event) |

## Commands

Registered on the bot menu (☰); unknown commands and plain messages are
ignored — this is a notifier, not a chat relay.

| Command | Effect |
| --- | --- |
| `/start` | Re-enables a silenced chat; echoes your chat id in a copy-block |
| `/status` | Running state, project root, which event groups are on |
| `/setup` | Copy-paste-ready `opencode.jsonc` snippet (with placeholders, never your token) |
| `/stop` | Silence notifications in this chat until `/start` |
| `/help` | Short command list |

## How it fits OpenCode

- v2 plugin entry is the `{id, setup}` contract — `setup` subscribes to the
  event stream, starts the poller, and returns a dispose.
- v1 entry (`./legacy`) is a hooks factory: bus events arrive through the
  `event` hook and permission answers go over the v1 SDK surface
  `POST /session/{id}/permissions/{permissionID}` with body `{ response }`
  (or the modern `permission.reply` client namespace when present). Both v1
  permission generations are accepted on the event side:
  `permission.updated {id, title, metadata}` (pre-rework hosts) and
  `permission.asked {id, permission, patterns, metadata, always, tool?}`
  (post-rework v1.x). On v1, `MessageAbortedError` maps to the *silent*
  interruption notification (a user abort is not a failure); v1 has no
  `form.*` flow, so questions are simply not available there. Note: the bot's
  `/setup` reply always prints the v2 `plugins[]` config shape; on v1 copy the
  `plugin: [...]` entry from this README instead.
- Events used: `permission.asked/replied`, `form.created/replied/cancelled`,
  `session.execution.succeeded/failed/interrupted`, plus `session.created`,
  `session.renamed` and activity events for the debounce/ownership logic.
- Permission answers go through the supported surface
  `client.permission.reply({ sessionID, requestID, decision })`; a legacy
  `reply`-key shape is attempted (and logged) if the server rejects `decision`.
- Only events whose `location.directory` resolves to this OpenCode root are
  handled — a conversation in another project never triggers your bot.

## Multi-instance behavior

One host can run several OpenCode instances (different roots, same bot token):

- the first instance that wins the cache-dir file lock (`~/.cache/
  opencode-telegram-notify/poller.lock`, with liveness heartbeat) consumes
  Telegram updates and serves the chat;
- every instance is notified only about its own root, so taps are routed by
  whichever instance is polling;
- losing activation (crash, machine restart), staleness after ~30 s lets the
  next instance take over.

## Troubleshooting

- **409 Conflict in the log** — another process (old activation or another app)
  is polling the same token; the poller backs off automatically. Check you did
  not reuse a token in `opencode-telegram-monitor` or another bot.
- **Nothing arrives** — verify the two env vars are visible *to the OpenCode
  process*, and that `options.telegram.botToken` is not a literal placeholder.
  Set `logFile` to a path and watch it while you drive OpenCode.
- **Buttons say "outdated"** — the message predates the current activation
  (buttons are routed through this instance's pending map). Answer in the
  terminal as usual.
- **Config error** — misconfiguration never crashes OpenCode: you get a clear
  `configuration error: …` line (stderr/`logFile`) and the plugin disables
  itself for that session.

## Deferred ideas

Deliberately not scheduled; revisit when they earn their complexity:

- menu-style settings keyboard (runtime config writes are outside the
  current plugin surface);
- reply-to-message → in-session notes (extra control channel);
- multi-field question wizards (open, keep notify-only for now);
- use `session.form.cancel` as the skip surface when a host exposes it.

## Development

```sh
bun install     # dev only: typescript + @types/bun
bun run ci      # lint + typecheck + tests
bun run typecheck
bun test
```

### Monitoring

- **Downloads**: always-visible badge on top (npm total); live numbers via
  the [npm downloads API](https://api.npmjs.org/downloads/point/last-week/@hamzaabili/opencode-telegram-notify)
  and the package page on npmjs.com. npm's downloads index starts reporting
  a few days after the first publish; the badge fills in once indexed.
- **GitHub**: the repo *Insights → Traffic* tab shows clones and stargazers;
  the stars badge is in the header.

## License

MIT — see [LICENSE](LICENSE).
