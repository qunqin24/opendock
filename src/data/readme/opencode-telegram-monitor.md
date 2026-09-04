# opencode-telegram-monitor

A [opencode](https://opencode.ai) plugin that keeps you in the loop on your opencode sessions from **Telegram**.

It watches opencode sessions in real time and reports their lifecycle — started, busy, idle, retried, completed, failed or cancelled — plus token usage and cost, to a Telegram bot chat of your choice. The bot is read-only by default: since 2026-09-02, permission prompts can be answered with three inline buttons (Allow once / Allow always / Deny) straight from Telegram — only when you explicitly tap one. Questions and everything else are always handled in opencode itself; the plugin never answers on your behalf.

## Features

- **Session lifecycle notifications** — track sessions through `idle` / `busy` / `retry` states and `completed` / `failed` / `cancelled` outcomes, delivered straight to Telegram.
- **Token usage & cost** — aggregated input / output / reasoning / cache tokens with estimated cost per session.
- **Todo projection** — see the current session's todo list from Telegram.
- **Project registry & inline menu** — a registry of monitored projects (`~/.otg/projects.json`) with an inline-keyboard menu (`/menu`) to manage them from the chat.
- **Read-only by default, explicit TG replies for permissions** — since 2026-09-02 permission prompts render Allow once / Allow always / Deny buttons; tapping one writes your choice back to opencode. Questions and everything else stay in opencode — the plugin never answers on its own.
- **Cross-process poller lock** — when several opencode windows are open on the same machine, a file-based lock (`PollerLock`) guarantees only one instance polls Telegram at a time.
- **Proxy support** — optional HTTP/HTTPS proxy (with auth and CONNECT tunneling) for reaching the Telegram Bot API.
- **Resilient messaging** — long polling (`getUpdates`, 25 s interval), retries with backoff, message length clamping, and bot-token redaction in all logs.

## Requirements

- Node.js (runtime for opencode plugins)
- opencode `>= 1.18` (plugin targets `1.18.23`)
- A Telegram bot token (create one with [@BotFather](https://t.me/BotFather)) and your Telegram `chatId`

## Installation

### From npm (recommended)

The plugin is published as [`opencode-telegram-monitor`](https://www.npmjs.com/package/opencode-telegram-monitor) and can be loaded straight from the opencode config:

1. Add the plugin to `~/.config/opencode/opencode.json`. **Pin a concrete version** (not `@latest`) — a pinned version makes opencode load the cached copy directly, so the plugin's own self-update is the only thing that ever replaces the files:

   ```json
   {
     "$schema": "https://opencode.ai/config.json",
     "plugin": ["opencode-telegram-monitor@0.6.0"]
   }
   ```

2. Restart opencode. The plugin is installed automatically into the opencode cache (`~/.cache/opencode/`) on first start.

3. If you previously installed a local copy, **remove it** to avoid double-loading the plugin (npm and local copies with the same name load side by side, which would run two pollers):

   ```bash
   rm -f ~/.config/opencode/plugins/telegram-session-monitor.ts
   ```

   The version in the config never needs manual bumping — see [Automatic updates](#automatic-updates) below.

### From source (local file)

1. Build the plugin into the single-file `monitor.ts` bundle, then copy that artifact into your opencode plugins directory:

   ```bash
   mkdir -p ~/.config/opencode/plugins
   node scripts/build.mjs
   cp monitor.ts ~/.config/opencode/plugins/telegram-session-monitor.ts
   ```

2. Restart opencode. The plugin loads automatically from the plugins directory.

## Automatic updates

When installed from npm, the plugin checks for a newer release on the npm registry **once per opencode start** (5 seconds after startup, non-blocking). If a newer version is found, it:

1. Downloads the new tarball into a **staging directory** (`~/.otg/update-staging/`).
2. Verifies the version in the staged package's `package.json` matches the expected version.
3. Atomically swaps the cached plugin directory (old directory is renamed as a backup, then replaced), re-verifies, and only then removes the backup.
4. Sends a Telegram notification; **restart opencode** to load the new version.

Any failure along the way — including being **offline** — leaves the previously installed version completely untouched, so opencode always loads a working plugin. A local-file installation (see above) is never auto-updated.

## Publishing a new release

Releases are tag-driven: pushing a `v*` tag triggers the publish workflow, which verifies the version and publishes to npm with Trusted Publishing (OIDC) — no token, no git write-back.

The workflow **refuses to publish** if the tag version does not match the version pinned in `package.json` — the single source of truth, injected into the bundle at build time — so keep the two release-facing pins in sync before tagging:

| Place | Field |
| ----- | ----- |
| `package.json` | `"version": "x.y.z"` (single source of truth) |
| `README.md` | npm install pin `opencode-telegram-monitor@x.y.z` |

The built `monitor.ts` never stores an editable version: `scripts/build.mjs` reads `package.json` and injects the version into the bundle (`bun build --define __PLUGIN_VERSION__`), so the artifact always reports the pinned version.

For a **bugfix** (patch) release, bump only the lowest number — never the middle one (`0.5.0 → 0.5.1`, not `0.6.0`):

```bash
# 1. set the new version (package.json + README.md; the bundle picks it up at build time)
node scripts/set-version.mjs v0.5.1

# 2. verify the tag you are about to create matches the pinned version (exits non-zero on mismatch)
node scripts/check-version.mjs v0.5.1

# 3. commit, tag, push — the workflow verifies again and publishes
git add package.json README.md
git commit -m "feat(monitor): ..."
git tag v0.5.1
git push origin main
git push origin v0.5.1
```

### Local tag guard (pre-push hook)

A `pre-push` hook ships in `.githooks/pre-push`: pushing any `refs/tags/*` runs
`node scripts/check-version.mjs <tag>` locally and **refuses the push** on a
mismatch (branches pass through). This catches a bad tag before it reaches CI.
Enable it once per clone:

```bash
git config core.hooksPath .githooks
```

Release types: bump the **third** number for bugfixes, the **second** for new features, the **first** for breaking changes.

## Configuration

The plugin reads its configuration from `~/.otg/telegram.json`:

```json
{
  "botToken": "123456789:ABCdef...",
  "chatId": "987654321",
  "proxy": "http://user:pass@proxy.example.com:8080"
}
```

| Field      | Required | Description                                                              |
| ---------- | :------: | ------------------------------------------------------------------------ |
| `botToken` |   yes    | Your Telegram bot token (validated on load).                             |
| `chatId`   |   yes    | The chat the bot is allowed to talk to / listen from.                    |
| `proxy`    |    no    | Optional `http://` or `https://` proxy URL (may include auth).           |

> If the config is missing or invalid, the plugin logs an error and disables itself instead of crashing opencode.

## Telegram commands

### Available

| Command | Description                                  |
| ------- | -------------------------------------------- |
| `/menu` | Manage monitored projects (inline keyboard). |
| `/help` | Show this help.                              |

### Planned (not available yet)

| Command           | Description                                        |
| ----------------- | -------------------------------------------------- |
| `/start`          | Check the plugin connection and bot health.        |
| `/sessions`       | List active sessions.                              |
| `/use <short-id>` | Select a session to inspect.                       |
| `/status`         | Show the selected session's status.                |
| `/todo`           | Show the selected session's todo list.             |
| `/usage`          | Show the selected session's token usage and cost.  |

## How it works

- The plugin subscribes to opencode's event stream through the `@opencode-ai/sdk` client and maintains an in-memory projection of every session: state, outcome, tools, todos, waiting prompts and token totals.
- A background poller talks to the Telegram Bot API (`getUpdates` long polling) so you can send commands from the chat; replies are sent back through the same channel with retries.
- When several opencode processes share one machine, `PollerLock` (`~/.otg/`) elects a single poller to avoid duplicate `getUpdates` consumers.
- A self-healing registrar re-asserts the current project into the registry every 5 minutes, so a project removed via `/menu` comes back as disabled while its window stays open.

### State & data files (`~/.otg/`)

| File               | Purpose                                        |
| ------------------ | ---------------------------------------------- |
| `telegram.json`    | Plugin configuration (bot token, chat id).     |
| `projects.json`    | Registry of monitored projects.                |
| `tgdiag.log`       | Diagnostics log (token-redacted).              |
| `*.lock`           | Cross-process poller lock files.               |

## Security notes

- The bot is **read-only by default** — the only way it acts on your behalf is when you explicitly tap an approval button on a permission prompt (2026-09-02+); it never answers questions or takes actions on its own.
- Messages are limited to the originating `chatId`; updates from any other chat are ignored.
- The bot token is redacted (`[REDACTED]`) in all log output and diagnostics.
- The plugin runs locally and talks to the public Telegram Bot API only.

## License

[MIT](LICENSE)
