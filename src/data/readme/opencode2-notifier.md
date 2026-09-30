# opencode2-notifier

OpenCode v2 plugin that notifies you on **Slack** and/or **Discord** when an agent session finishes, crashes, waits on a permission, or asks you a question. Built for the "OpenCode is working on my laptop while I'm elsewhere" workflow.

- Plugin ID: `opencode2-notifier`
- Runtime: OpenCode v2 (`@opencode/plugin` Promise API)
- Sinks: Slack incoming webhook, Discord channel webhook (use one or both)

## Contents

- [How it works](#how-it-works)
- [Install](#install)
- [Verifying installation](#verifying-installation)
- [Slack webhook setup](#slack-webhook-setup)
- [Discord webhook setup](#discord-webhook-setup)
- [Configuration reference](#configuration-reference)
- [Event mapping](#event-mapping)
- [Behavior details](#behavior-details)
- [Message format](#message-format)
- [Local development](#local-development)
- [Releasing](#releasing)
- [Troubleshooting](#troubleshooting)
- [Security notes](#security-notes)
- [Changelog](#changelog)
- [License](#license)

## How it works

On `setup`, the plugin:

1. Reads and validates `ctx.options` (webhook URLs, event allowlist, debounce).
2. Subscribes to the live server event stream via `ctx.event.subscribe()`.
3. Classifies each event (`src/events.ts`) into `complete | error | permission | question`.
4. Enriches it with session title + elapsed time via `ctx.session.get()`.
5. Fans out to every configured sink with `Promise.allSettled` — one sink failing never blocks the other.
6. Cleans up timers and aborts the stream on plugin unload.

If no webhook is configured, the plugin logs a warning and disables itself instead of breaking OpenCode.

## Install

### Option A — from npm (recommended)

```sh
opencode plugin add opencode2-notifier
```

> `plugin add` registers the plugin as a bare string with **no options**, and this plugin requires at least one webhook URL to do anything. Convert the entry to the object form below, otherwise it disables itself with a `[opencode2-notifier] disabled: ... missing webhook` warning.

Then add options to your `opencode.jsonc` (global `~/.config/opencode/opencode.jsonc` or project `.opencode/opencode.jsonc`):

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "opencode2-notifier",
      "options": {
        "slackWebhookUrl": "{env:SLACK_WEBHOOK_URL}",
        "discordWebhookUrl": "{env:DISCORD_WEBHOOK_URL}",
        "events": ["complete", "error", "permission", "question"],
        "debounceMs": 10000,
        "notifyChildSessions": false
      }
    }
  ]
}
```

### Option B — local checkout

```sh
git clone https://github.com/asliutkarsh/opencode2-notifier.git
```

Point OpenCode at it:

```jsonc
{
  "plugins": [{ "package": "/absolute/path/opencode2-notifier", "options": { "discordWebhookUrl": "{env:DISCORD_WEBHOOK_URL}" } }]
}
```

Restart the service after config changes:

```sh
opencode service restart
```

> The env var must be visible to the background service process, not just your current shell. On Windows, set it as a User environment variable and then restart the service:
> ```powershell
> [Environment]::SetEnvironmentVariable('DISCORD_WEBHOOK_URL', '<url>', 'User')
> opencode service restart
> ```

## Verifying installation

This plugin is **event-only**: it registers no tools, commands, agents, or skills, so you will not see it in tool lists, `/commands`, or the TUI. That is expected. Verify instead via:

1. `opencode plugin list` — should show `opencode2-notifier  0.1.2` (or newer).
2. Server log (`~/.local/share/opencode/log/opencode.log`) — should contain `loading plugin id=opencode2-notifier` with no following error.
3. Trigger an event (e.g. run a task that needs permission) and check your Slack/Discord channel.

## Slack webhook setup

1. Open your Slack workspace → **Settings & administration → Manage apps → Custom Integrations → Incoming WebHooks** (or use Workflow Builder webhooks).
2. Add a webhook for the channel you want (e.g. `#agent-alerts`), copy the `https://hooks.slack.com/services/...` URL.
3. Export it where OpenCode runs:
   ```sh
   export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/..."
   ```
   The plugin also accepts `{env:ANY_VAR_NAME}` in `slackWebhookUrl`, or the `OPCODE2_NOTIFIER_SLACK_WEBHOOK_URL` fallback.

## Discord webhook setup

1. In Discord: channel **Edit Channel → Integrations → Webhooks → New Webhook**, pick a name/avatar, copy the `https://discord.com/api/webhooks/...` URL.
2. Export it where OpenCode runs:
   ```sh
   export DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/..."
   ```
   The plugin also accepts `{env:ANY_VAR_NAME}` in `discordWebhookUrl`, or the `OPCODE2_NOTIFIER_DISCORD_WEBHOOK_URL` fallback.

## Configuration reference

| Key | Type | Default | Description |
|---|---|---|---|
| `slackWebhookUrl` | `string` (URL or `{env:VAR}`) | `SLACK_WEBHOOK_URL` → `OPCODE2_NOTIFIER_SLACK_WEBHOOK_URL` | Slack sink. Optional if Discord is set. |
| `discordWebhookUrl` | `string` (URL or `{env:VAR}`) | `DISCORD_WEBHOOK_URL` → `OPCODE2_NOTIFIER_DISCORD_WEBHOOK_URL` | Discord sink. Optional if Slack is set. |
| `events` | `("complete" \| "error" \| "permission" \| "question")[]` | all four | Allowlist of notification kinds. Unknown values are ignored. |
| `debounceMs` | `number` (ms) | `10000` | Delay-and-replace window for `complete` only. |
| `notifyChildSessions` | `boolean` | `false` | When `false`, sessions with a `parentID` (subagents) are skipped. |

At least one of `slackWebhookUrl` / `discordWebhookUrl` must resolve to an `http(s)` URL or setup throws and the plugin disables itself with a warning.

Minimal Discord-only example:

```jsonc
{
  "plugins": [{ "package": "opencode2-notifier", "options": { "discordWebhookUrl": "{env:DISCORD_WEBHOOK_URL}" } }]
}
```

## Event mapping

Based on the V2 `V2Event` union (`@opencode/client`):

| V2 `event.type` | Notifier kind | Delivery |
|---|---|---|
| `session.idle`, `session.execution.succeeded` | `complete` | debounced per session (`debounceMs`) |
| `session.execution.failed`, `session.step.failed`, `session.tool.failed`, `session.compaction.failed` | `error` | immediate (includes `type: message`) |
| `permission.asked` | `permission` | immediate (includes action + first resources + message) |
| `form.created` | `question` | immediate (includes form title) |
| `session.created` | — (internal) | records session start time for elapsed reporting + registers subagent children (`parentID`) |

## Behavior details

- **Debounce (`complete`):** rapid duplicate idle/success events for the same session collapse into one post after `debounceMs`. Timers are `unref`'d so they never keep the process alive.
- **Dedupe (all kinds):** 30s per `kind + sessionID` window suppresses exact duplicates (e.g. permission re-asked in a tight loop).
- **Child sessions:** `ctx.session.get()` exposes `parentID`; when `notifyChildSessions` is `false` those are dropped silently.
- **Enrichment failures:** if `session.get` fails (session gone, transient error), the notification still sends with directory only.
- **Fan-out:** sinks send concurrently; a Slack 5xx does not cancel the Discord post and vice versa. Failures are `console.warn`'d, never thrown.
- **Location scoping:** global plugins load once per location. Each instance only notifies for sessions in its own directory (compared case-insensitively via `session.location.directory`), so one session yields exactly one post instead of one per location.
- **Subagent tracking (`src/subagents.ts`):** children are recorded from `session.created` (via `parentID`) and marked finished on `session.execution.*` / `session.idle`. Notifications carry a `Subagents:` line like `2 running (Explore backend, Research docs) · 1 done`. A child still marked running has not finished. Children that started before plugin load are unknown and omitted. Tracker is bounded (200 parents max).
- **Abort:** `AbortSignal` is threaded through the event iterator and both `fetch` calls; unload aborts everything and clears pending debounce timers.

## Message format

Both sinks head every message with just the session name plus emoji (e.g. `✅ Curating plugins list`), falling back to the kind title when untitled or blank. Remaining lines: short session ID, working directory, elapsed time, subagent status, and kind-specific detail.

Slack (`src/slack.ts`): `text` fallback + heading section, plus a details section whenever ID/dir/elapsed/subagents/detail lines exist.

Discord (`src/discord.ts`): `content` ping line + rich embed with per-kind color (`complete` green `0x57F287`, `error` red `0xED4245`, `permission` yellow `0xFEE75C`, `question` blurple `0x5865F2`), fields, and timestamp. Long details are truncated to Discord's 2000-char limits.

## Local development

```sh
bun install
bun test        # 28 tests: config, event classification, slack/discord payloads, location scoping, subagent tracker
bunx tsc --noEmit
```

Project layout:

```
src/
  index.ts        # Plugin.define, event loop, debounce/dedupe, fan-out
  config.ts       # option parsing + {env:VAR} resolution
  events.ts       # V2Event -> NotifyKind classification
  slack.ts        # Slack Block Kit payload + sender
  discord.ts      # Discord embed payload + sender
  subagents.ts    # subagent child tracking per parent session
  *.test.ts       # bun tests
```

## Releasing

Releases are tag-driven: pushing a GitHub Release publishes that version to npm via `.github/workflows/publish.yml` (tests + typecheck + tag/version match check run first). The release-notes changelog is auto-generated from PR labels (see `.github/release.yml`).

One-time setup: create an npm granular access token (package scope `opencode2-notifier`, **bypass 2FA** enabled) and save it as the repo secret `NPM_TOKEN` (Repo → Settings → Secrets → Actions).

```sh
# 1. Bump version
npm version patch   # or minor/major
git push origin main --tags
# 2. Cut the release (generates the changelog)
gh release create v$(bun -p "require('./package.json').version") --generate-notes
# 3. Publishing to npm happens automatically on release
```

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `[opencode2-notifier] disabled: ... missing webhook` | No URL resolved (common right after `plugin add`, which writes a bare string entry with no options) | Convert to object form with `slackWebhookUrl`/`discordWebhookUrl` (see [Install](#install)); export the env var; restart service |
| Plugin installed but "nothing to see" | Expected: event-only plugin registers no tools/commands/agents | See [Verifying installation](#verifying-installation) |
| No `complete` post | Still inside `debounceMs`, or duplicates deduped | Lower `debounceMs` for testing (e.g. `2000`); check service logs |
| `Slack webhook failed: 404` | Revoked/rotated webhook | Recreate the incoming webhook, update env |
| `Discord webhook failed: 404` | Deleted webhook or wrong path | Recreate via channel Integrations, update env |
| Child-session spam / silence | `notifyChildSessions` mismatch | Set `true` to include subagents, `false` (default) for mains only |
| Events missing on old server | Server older than tested API | Use OpenCode v2.0.16+ / `@opencode/plugin` 2.0.18 |

Logs live in `~/.local/share/opencode/log/opencode.log` — filter `role=server` for plugin lines.

## Security notes

- Webhook URLs are secrets: never commit them. Use `{env:VAR}` indirection and keep them in shell env or a secrets manager.
- If a webhook URL leaks (chat logs, screenshots), regenerate it on the Slack/Discord side — old URLs keep working until revoked.
- Notifications include session titles, directory paths, and error text. Avoid pointing them at public channels if you work on sensitive repos.

## Changelog

### 0.1.2

- Headings are just the session name + emoji (no more "OpenCode session complete —" prefix).
- New `Subagents:` line with live running/done/failed counts and running titles.

### 0.1.1

- Fix duplicate posts: notify only for sessions in the plugin instance's own location (one post per session instead of one per loaded location). Show the session's directory in the message.

### 0.1.0

- Initial release: Slack + Discord sinks, `complete/error/permission/question` kinds, debounce + dedupe, child-session filter, `{env:VAR}` config.

## License

MIT — see [LICENSE](./LICENSE).
