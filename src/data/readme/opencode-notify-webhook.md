# opencode-notify-webhook

A **V2-native** [OpenCode](https://opencode.ai) plugin that forwards notable
events to one or more webhooks. Send notifications to Slack, Discord, ntfy,
Gotify, Telegram, Microsoft Teams, Mattermost, or any generic endpoint when a
session finishes, errors, needs permission, or asks a question.

Unlike most existing OpenCode webhook plugins (which target the V1 plugin API),
this plugin is built on the V2 API: `Plugin.define` + `ctx.event.subscribe()`.

## Features

- **Multiple targets**, each with its own event filter, HTTP method, headers,
  auth, timeout, and payload format.
- **Service presets**: `slack`, `discord`, `ntfy`, `gotify`, `telegram`,
  `teams`, `mattermost`, and `generic` (text / JSON / custom template).
- **Config from a JSON file and/or plugin options** in `opencode.json`.
- **`${ENV_VAR}` substitution** in URLs, headers, and tokens.
- **Fire-and-forget transport** with timeout + bounded retry and backoff, so a
  broken webhook can never block the agent.
- **No LLM in the loop**: notifications are driven purely by the server event
  stream, so they fire whether or not the agent does anything.
- **Subagent filtering** (child sessions are ignored by default).

## Requirements

- OpenCode **v2** (`@opencode/plugin` >= 2.0.0).
- At runtime the plugin uses the host's `fetch` (Bun in OpenCode). Node
  >= 22.6 is only needed for local development/testing.

## Install

### From npm

```jsonc
// opencode.jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-notify-webhook@latest"]
}
```

Restart OpenCode (or restart a long-running `opencode serve`/`opencode web`
process) so it reloads plugins.

### From a local checkout

OpenCode dedups plugins by the id they declare, and a globally installed copy
is merged before the project config — so a local entry that reuses
`opencode-notify-webhook` would be shadowed by the installed package.
`dev:setup` therefore generates a small gitignored wrapper
(`.opencode/dev/notify-dev/`) that re-registers the same setup under
`opencode-notify-webhook-dev`, and writes a `.opencode/opencode.jsonc` that

1. disables any globally installed copy for this location with the
   `-opencode-notify-webhook` directive (V2 [Control
   syntax](https://opencode.ai/v2/docs/plugins#control)), then
2. loads the wrapper directory (`./dev/notify-dev`) with its `options`.

Your global `~/.config/opencode/opencode.json` is **never modified**, so real
notifications keep working in every other project while you develop here.

```bash
cd /path/to/opencode-notify-webhook
npm install
npm run dev:setup    # writes .opencode/opencode.jsonc + .opencode/dev/
```

Restart OpenCode (or run `opencode reload`). Undo with `npm run dev:teardown`.
See [Development](#development) for a local capture server, a real target, or
`npm run dev:isolate` for a fully isolated end-to-end check.

### Global install

```bash
opencode plugin add opencode-notify-webhook@0.2.0
```

Pin an exact version for reproducibility (OpenCode also supports `@latest`,
tags, ranges, and Git specs). This installs the package into OpenCode's cache
and writes a **bare string** into `~/.config/opencode/opencode.json`. A string
cannot carry `options`, so to configure the plugin you replace it with an
object:

```jsonc
// ~/.config/opencode/opencode.json
{
  "plugins": [
    {
      "package": "opencode-notify-webhook@0.2.0",
      "options": {
        "enabled": true,
        "scope": "location",
        "targets": [
          {
            "name": "discord",
            "type": "discord",
            "url": "${DISCORD_WEBHOOK_URL}"
          }
        ]
      }
    }
  ]
}
```

Keep `scope: "location"` (the default): a globally installed plugin is loaded
once per active location, and this scope filter is what keeps each event to
exactly one webhook. Webhook URLs can stay out of the file via
[environment variables](#environment-variables).

## Quick start

Create `~/.config/opencode/opencode-notify-webhook.json`:

```json
{
  "targets": [
    {
      "url": "https://ntfy.sh/my-topic",
      "events": ["session.execution.succeeded", "session.execution.failed", "permission.asked"]
    }
  ]
}
```

Restart OpenCode. You now get a push for each of those events.

## Configuration

Configuration is merged from these sources, **later sources win**:

1. `$XDG_CONFIG_HOME/opencode/opencode-notify-webhook.json`
   (usually `~/.config/opencode/opencode-notify-webhook.json`) — global
2. `<project>/opencode-notify-webhook.json`
3. `<project>/.opencode/opencode-notify-webhook.json` — project
4. `$OPENCODE_NOTIFY_WEBHOOK_CONFIG` — explicit path
5. The plugin `options` object in `opencode.json`

You can put a short config directly in `opencode.json`:

```jsonc
{
  "plugins": [
    {
      "package": "opencode-notify-webhook",
      "options": {
        "targets": [{ "url": "https://ntfy.sh/my-topic" }]
      }
    }
  ]
}
```

### Root options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `enabled` | boolean | `true` | Master switch. |
| `includeSubagents` | boolean | `false` | Also notify for subagent (child) sessions. |
| `scope` | `"location"` \| `"global"` | `"location"` | Only handle events for this plugin instance's location. See [Scope](#scope). |
| `defaults` | object | — | Shared defaults: `timeoutMs`, `retries`, `method`. |
| `events` | object | see below | Per-event config. Keys are the allow-list of handled events. |
| `targets` | array | `[]` | Webhook destinations. |

When `events` is omitted the default set is used:
`session.execution.succeeded`, `session.execution.failed`, `permission.asked`,
`form.created`.

### Scope

OpenCode loads a **globally** configured plugin once per active location (every
directory where OpenCode is running), and each instance receives the server-wide
event stream. Without filtering, opening OpenCode in several directories makes
one event send several identical webhooks.

The default `scope: "location"` makes each instance handle only events whose
location matches its own, so every event produces exactly one notification.
Set `scope: "global"` to handle every event from every location instead (only
useful for a single-location setup, or if you deliberately want the plugin to
react in one place regardless of where the event happened).

### Per-event config

```json
{
  "events": {
    "session.execution.succeeded": { "message": "Done: {{session.title}}" },
    "session.execution.failed": { "message": "Error in {{project.name}}", "title": "Alert" },
    "permission.asked": { "notify": false }
  }
}
```

| Field | Type | Description |
| --- | --- | --- |
| `notify` | boolean | Set to `false` to mute this event. |
| `message` | string | Message body. Supports `{{tokens}}`. |
| `title` | string | Notification title. Supports `{{tokens}}`. |

### Target options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `name` | string | `<type><n>` | Friendly name used in logs. |
| `type` | string | `generic` | `generic` / `slack` / `discord` / `ntfy` / `gotify` / `telegram` / `teams` / `mattermost`. |
| `url` | string | — | Webhook URL (optional for `telegram`, built from `token`). |
| `events` | string[] | `["*"]` | Event filter. `"*"` matches everything. |
| `method` | string | `POST` | HTTP method. |
| `headers` | object | `{}` | Extra HTTP headers. |
| `timeoutMs` | number | `10000` | Request timeout. |
| `retries` | number | `2` | Retry attempts after a failure. |
| `format` | `"text"` \| `"json"` | `json` | Payload format for `generic`. |
| `payload` | object/array/string | — | Template payload for `generic`. |
| `bearer` | string | — | Sets `Authorization: Bearer <value>`. |
| `basicAuth` | `{username,password}` | — | Sets `Authorization: Basic ...`. |
| `token` | string | — | App token (`gotify`) or bot token (`telegram`). |
| `chatId` | string | — | Chat id for `telegram`. |
| `priority` | number | — | Priority for `ntfy` / `gotify`. |
| `tags` | string[] | — | Tags for `ntfy`. |
| `username` | string | — | Bot username override for `discord`. |
| `avatarUrl` | string | — | Avatar URL override for `discord`. |
| `enabled` | boolean | `true` | Set to `false` to keep but disable a target. |

### Service presets

| `type` | Behavior |
| --- | --- |
| `slack` | JSON `{ "text": "..." }`. |
| `mattermost` | JSON `{ "text": "..." }`. |
| `teams` | JSON `{ "text": "..." }` (MessageCard). |
| `discord` | JSON `{ "content", "username?", "avatar_url?" }`. |
| `ntfy` | Plain-text body; `Title`, `Priority`, and `Tags` headers. |
| `gotify` | JSON `{ title, message, priority }`; `token` appended as a query parameter. |
| `telegram` | JSON to `https://api.telegram.org/bot<token>/sendMessage`; needs `chatId`. |
| `generic` | `format: "json"` (default), `format: "text"`, or a custom `payload` template. |

### Environment variables

Any string can reference environment variables with `${VAR}` or `$VAR`. Unset
variables become an empty string.

```json
{
  "targets": [
    { "type": "slack", "url": "${SLACK_WEBHOOK_URL}" },
    { "type": "generic", "url": "https://x", "headers": { "Authorization": "Bearer ${TOKEN}" } }
  ]
}
```

### Template tokens

Available in `message`, `title`, and `generic` `payload` fields:

| Token | Value |
| --- | --- |
| `{{event}}` | Event type, e.g. `session.execution.succeeded`. |
| `{{message}}` / `{{msg}}` | The resolved message. |
| `{{title}}` | Notification title. |
| `{{emoji}}` | Event emoji. |
| `{{timestamp}}` | ISO-8601 timestamp. |
| `{{session.id}}` | Session id. |
| `{{session.title}}` | Session title. |
| `{{directory}}` | Session directory. |
| `{{project}}` | Project id. |
| `{{project.name}}` | Project folder name. |
| `{{worktree}}` | Worktree path. |
| `{{assistant.text}}` | Last assistant text (execution / idle / error events). |
| `{{error}}` | Error message (execution-failed events). |
| `{{permission}}` | Resource or command (permission events). |

## Events

`events` acts as an allow-list: an event is only forwarded when its type is a
key in the map. This keeps the plugin robust as OpenCode's event names evolve.

Common V2 event types:

| Event | Fires when |
| --- | --- |
| `session.execution.succeeded` | A run finished. |
| `session.execution.failed` | A run errored. |
| `session.execution.started` | A run started. |
| `permission.asked` / `permission.replied` | A permission is requested / answered. |
| `form.created` / `form.replied` | The agent asks for input / it is answered. |
| `session.created` / `session.deleted` | A session starts / ends. |
| `filesystem.changed` | A file is added, changed, or removed. |
| `session.compaction.ended` | Context compaction finished. |
| `session.status` | Session status changed. |

Per-target `events` filters further narrow which of those fire.

> The default set (`session.execution.succeeded`, `session.execution.failed`,
> `permission.asked`, `form.created`) reflects the events OpenCode V2 actually
> emits. Older aliases such as `session.idle`, `session.error`, and
> `question.asked` are still accepted if you configure them explicitly, but note
> that V2 does not emit `session.error` or `question.asked` at all.

## Development

```bash
npm install
npm run typecheck   # tsc --noEmit
npm test            # node --test
npm run test:coverage
```

### Testing the local checkout

```bash
npm run dev:setup    # writes .opencode/opencode.jsonc (plugins + options)
# terminal A (optional): npm run dev:capture   # local sink on :8787
# terminal B: run OpenCode inside this repo
```

`dev:setup` generates a gitignored wrapper under `.opencode/dev/notify-dev/`
that re-registers this checkout under the id `opencode-notify-webhook-dev`, and
loads it through the `plugins` array with `options`. The wrapper id must differ
from the published one because OpenCode dedups plugins by declared id and the
global copy is merged first. It also prepends `-opencode-notify-webhook`, which
disables any globally installed copy **for this location only** — your global
config is left untouched.

By default the dev target is a local capture sink. To send to a real service
while developing, put its URL in the gitignored `.opencode/dev.env` and re-run
`dev:setup`:

```sh
# .opencode/dev.env  (gitignored — never committed)
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

`dev:setup` then generates a `discord` target. Secrets stay out of tracked
files.

Undo with `npm run dev:teardown`.

### Local vs global

Keep the two apart so development never disturbs real notifications:

| | Source | Config location |
| --- | --- | --- |
| **Development** | this checkout via the `opencode-notify-webhook-dev` wrapper | `.opencode/` in the repo (gitignored) |
| **Real usage** | published npm package, pinned | `~/.config/opencode/opencode.json` |

Because the repo config prepends `-opencode-notify-webhook`, OpenCode loads
only the local checkout inside this project while every other project keeps
using the pinned npm release. Put shared webhook targets in
`~/.config/opencode/opencode-notify-webhook.json` so both sides use the same
destinations and only the code source differs.

### Isolated end-to-end check

`npm run dev:isolate` runs `opencode run --standalone` against a throwaway
`OPENCODE_CONFIG_DIR` and temp work dir, captures the webhooks it sends, prints
them, and exits non-zero if none arrived. It never reads or writes your global
or project config:

```bash
npm run dev:isolate -- "say hi"
```

The test suite covers config merging, env substitution, payload builders for
every preset, transport retry/timeout behavior, location scoping, and
end-to-end handling against a local HTTP server.

## Publishing

Publishing is automated with npm
[trusted publishing](https://docs.npmjs.com/trusted-publishers) (OIDC) — no
long-lived npm token is required. Provenance is generated automatically.

1. Configure a trusted publisher for the package (workflow `publish.yml`, allow
   `npm publish`). On npmjs.com: package → Settings → Trusted Publisher →
   GitHub Actions; or from the CLI:

   ```bash
   npm trust github opencode-notify-webhook \
     --file publish.yml \
     --repo phonhay103/opencode-notify-webhook \
     --allow-publish
   ```

2. Bump the version and push a tag:

   ```bash
   npm version patch        # or minor / major
   git push --follow-tags
   ```

The tag push runs `.github/workflows/publish.yml`, which installs, typechecks,
tests, and publishes via OIDC.

> The first release of a brand-new package name needs its trusted publisher
> configured before the first tag push; a new trusted publisher configuration
> must complete its first successful publish within 2 days.

## License

MIT
