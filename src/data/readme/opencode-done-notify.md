# opencode-done-notify

[![license](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![OpenCode](https://img.shields.io/badge/for-OpenCode-8a5cf6.svg)](https://opencode.ai/docs/plugins/)

An [OpenCode](https://opencode.ai) plugin that sends you a **Telegram notification** whenever a session in a whitelisted project finishes a task successfully — so you can step away and get pinged when the work is done.

- **Opt-in per project** — by default **all projects are disabled**. You whitelist the ones you care about.
- **No restart needed** — enable a project from inside the conversation with `/done_en_notify` (the setting is persisted), or reload config edits with `/done_reload`.
- **Zero runtime dependencies** — one TypeScript file using the built-in `fetch`.

## Why

Long-running OpenCode tasks (refactors, test suites, background agents) keep you watching the terminal. This plugin watches for a session reaching a successful completion and pushes a Telegram message to your phone, so you only come back when there is something to see.

It **only fires on a genuine success**:

- **Natural completion** — the last assistant message finished with `finish: "stop"` and no error.
- It **never fires** on aborts, errors, or mid-task pauses (`finish: "tool_use"` while tools are still being called).

| Situation | Notified? |
| --- | --- |
| Assistant finished naturally (`finish: "stop"`, no error) | yes |
| Last message has an error / was aborted | no |
| Turn paused to call a tool (`finish: "tool_use"`) | no |
| Session belongs to a project not in the whitelist | no |
| Subagent (child) session — default `ignoreSubagents: true` | no |

## Install

### Option A — single file (global plugin)

Copy [`src/index.ts`](./src/index.ts) into your **global** plugins directory:

```bash
~/.config/opencode/plugins/done-notify.ts
```

Restart OpenCode. Done.

### Option B — npm

```jsonc
// opencode.json
{
  "plugin": ["opencode-done-notify"]
}
```

## Setup

1. Create a Telegram bot with [@BotFather](https://t.me/BotFather) and copy the **bot token**.
2. Find your numeric **user id** (e.g. with [@userinfobot](https://t.me/userinfobot)).
3. Edit the global config file (auto-created on first load):

```bash
~/.config/opencode/done-notify.json
```

```json
{
  "enabled": true,
  "botToken": "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11",
  "chatId": "987654321",
  "enabledProjects": [],
  "ignoreSubagents": true
}
```

> If `botToken` or `chatId` is empty, notifications are skipped (only logged), so the plugin is safe to install before you configure anything.

### Enabling a project

- **Edit the config** — add a project to `enabledProjects` (full path or just the folder name), then run `/done_reload`.
- **From the conversation** — in any project, type:

```
/done_en_notify
```

This immediately enables the **current** project, **writes it back to the config file** (so it is remembered across restarts), and replies with the resulting list of enabled projects.

Every project starts **disabled** — nothing is ever notified until you whitelist it.

## Commands

| Command | Effect |
| --- | --- |
| `/done_en_notify` | Enable Telegram notifications for the current project (persisted to the global config, applied immediately) |
| `/done_reload` | Re-read the config file **without restarting** OpenCode, and reply with the current effective settings |

## Configuration

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `enabled` | `boolean` | `true` | Master switch; disable without removing the plugin |
| `botToken` | `string` | `""` | Telegram bot token from BotFather |
| `chatId` | `string` | `""` | Numeric Telegram user/chat id to receive notifications |
| `enabledProjects` | `string[]` | `[]` | Whitelist of projects to notify; an entry matches the project's **full path** or its **folder name** |
| `ignoreSubagents` | `boolean` | `true` | Skip child/subagent sessions (only the main session triggers a notification) |

Project matching is case-insensitive and tolerant of both `\` and `/` separators, so entries written on one OS also work on another (use the folder name for maximum portability).

If the config file is missing it is **auto-created with defaults**; invalid JSON is reported in the logs and defaults are used — the failure is never silent.

## How it works

```
session.idle ──► enabled? / project whitelisted? ──no──► do nothing
                     │yes
                     ▼
        last assistant message finish === "stop" && no error? ──no──► do nothing
                     │yes
                     ▼
        already notified for this message id? ──yes──► skip (dedupe)
                     │no
                     ▼
        subagent session (ignoreSubagents)? ──yes──► skip
                     │no
                     ▼
   POST https://api.telegram.org/bot<token>/sendMessage
```

Notification message:

```
[done] <project-folder-name>
session: <session title>
id: <session id>
time: <local date/time>
```

Failures (network errors, non-2xx HTTP) are logged via `client.app.log()` and never crash the plugin; a session is never notified twice for the same completion.

## Development

```bash
git clone https://github.com/menaya0506/Opencode-done-notify.git
cd Opencode-done-notify
npm install
npm run typecheck
npm test
```

This repository doubles as a live dev environment: the `.opencode/plugins/` shim loads `src/index.ts` automatically when you start OpenCode here.

> **Note:** OpenCode treats *every* module export as a plugin factory — export only functions (or `{ server }` objects). The loader-compatibility test in `npm test` guards against this.

## Buy Me a Coffee

If done-notify saves you from babysitting your terminal, feel free to send some coffee money:

**ETH (EVM)**: `0xAe42D0d8a25530fCb99B906f42a0eE6DF1830EA9`

## License

[MIT](./LICENSE)
