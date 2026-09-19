# opencode-discord-noti

Discord webhook notifications for **OpenCode v2**: know when a response finishes, a permission needs attention, or the agent asks a question.

## Features

- **Response completed** (green): final assistant text, session title, directory, model, and token information.
- **Permission required** (orange): the pending permission's action, message, and resources. Automatically allowed or denied permissions do not generate alerts.
- **Question asked** (blue): question-form fields, answer options, and tool call ID when available.
- **Clickable session links** (opt-in): when `webUrl` is set, every notification's title links to the session in that OpenCode app and includes a **🌐 Open Session** button.
- **Subagent idle and completion never send notifications.** Subagent permissions and questions still request attention. Directories under your home folder use `~`.
- Location filtering prevents notifications from being repeated by plugin instances in other directories.
- Notification failures do not interrupt OpenCode. Webhook requests time out after 10 seconds; unloading the plugin aborts its subscription and in-flight webhook requests. Rate-limited (HTTP 429) webhooks are retried up to twice using Discord's advertised delay; other failures log Discord's redacted status and message.
- Every embed is trimmed to fit Discord's limits: 1500-character description, 1024-character field values, 2048-character footer, and the combined embed stays within the 6000-character budget. Truncation never splits an emoji in half.

Version **1.1.0** uses the v2 `@opencode/plugin` API and depends on **2.0.4**. Its stable plugin ID is `opencode-discord-noti`. OpenCode v1 users should stay on package version `0.2.0`.

## Install and configure

Create a webhook in your Discord channel under **Edit Channel → Integrations → Webhooks**. Add the pinned package and its options to `~/.config/opencode/opencode.jsonc` (or your project's `opencode.json`):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "opencode-discord-noti@1.1.0",
      "options": {
        "enabled": true,
        "webhookUrl": "{env:DISCORD_WEBHOOK_URL}",
        "webUrl": "http://localhost:4096",
        "username": "OpenCode Notifier",
        "avatarUrl": "https://opencode.ai/logo.png"
      }
    }
  ]
}
```

Set `DISCORD_WEBHOOK_URL` in the environment used to launch OpenCode, or replace `{env:DISCORD_WEBHOOK_URL}` with your webhook URL directly. OpenCode resolves environment substitutions before passing options to the plugin; an unset variable becomes an empty string and disables notifications.

OpenCode installs the npm package automatically. If you already have plugins configured, append the `{ "package": "...", "options": { ... } }` entry to the existing `plugins` array.

### Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `enabled` | boolean | `false` | Set to `true` to send notifications. |
| `webhookUrl` | string | none | Discord webhook URL; required when enabled. |
| `webUrl` | string | none | Base URL of the OpenCode web/serve/desktop app; adds a clickable link to each session. |
| `username` | string | `OpenCode Notifier` | Display name for webhook messages. Falls back to the default when it exceeds Discord's 80-character limit or contains a reserved/branded word (`clyde`, `discord`, `everyone`, `here`). |
| `avatarUrl` | string | none | Optional avatar URL. |

Keep the webhook URL private: it allows messages to be posted to your channel. Notifications include session content, question options, and permission resources.

Options are captured from `ctx.options` when the plugin initializes. Missing/invalid `enabled` or `webhookUrl` values disable notifications without starting a subscription; invalid optional display settings use their defaults. An invalid `webUrl` disables only the session links and still sends notifications. The plugin does not read a separate configuration file or `project.config`.

**Quit and restart OpenCode after installing the plugin or changing its options.** If you use a persistent v2 background server, restart that server too so the server plugin is reloaded.

### Session links

When `webUrl` is set, every notification includes the session's title as a link and a **🌐 Open Session** button. Both open the session in the OpenCode app running at that address. Only protocol, hostname, and port are used; the plugin normalizes the value the same way OpenCode does (a missing scheme becomes `http://`). Discord's limits are enforced: links longer than 2048 characters are omitted, and buttons longer than 512 characters are dropped while the notification is still sent.

Requirements and caveats:

- Run the web/desktop app at that address. A terminal-only session is not reachable in a browser, so links are added only when you configure `webUrl`.
- The plugin cannot detect the server's port. `opencode web` and `opencode serve` pick a random port unless you pass `--port`, so pin one (for example `opencode web --port 4096`) and use the same value here.
- Use the exact address you open that instance with. Links to `localhost` only work from the same machine; use a LAN, VPN, or tunnel address to open sessions from another device such as a phone.
- The link is generated as `{webUrl}/server/{key}/session/{sessionID}`. This internal app route is confirmed from OpenCode's source, not a published API, so a future OpenCode release could change it. If links stop working, remove `webUrl` or update it.

### Migrate from 0.2.0 (OpenCode v1)

1. Upgrade OpenCode to v2 and this package to `1.1.0`.
2. Rename `plugin` to `plugins` and replace the `[package, options]` tuple with the object shown above. Keep the same four option names.
3. Remove the old plugin entry or local v1 implementation to avoid duplicate loading.
4. Quit and restart OpenCode, including its background server when applicable.

Behavior changes:

- Completion uses `session.execution.succeeded`, not the deprecated `session.idle`. Failed or interrupted executions do not generate success notifications. The old 1.5-second delay is removed.
- Permissions use `permission.asked`, which represents an actual pending decision. Auto-denied permission notifications are removed.
- Questions use `form.created` with `metadata.kind === "question"`. Tool-name heuristics such as `ask` or `mcp_Question` are removed; arbitrary tools do not imply an interactive question form.
- Token fields use native v2 metrics described below.
- If the session lookup fails, the event is skipped and a redacted error is logged. The plugin does not guess ownership and risk sending another location's notification.

For version `0.1.0` or older local installations, move the four options from `~/.config/opencode/discord-notification-config.json` into the new options object. That file is no longer read.

### OpenCode v2 API references

- [V1 migration guide](https://opencode.ai/v2/docs/build/plugins/migrate-v1)
- [Plugin API](https://opencode.ai/v2/docs/build/plugins)
- [V2 configuration](https://opencode.ai/v2/docs/config#plugins)

The v2 guide and source define the `plugins` object format above. At migration time, the shared `config.json` URL still advertised the v1 plugin field, so an editor using that schema may lag behind the v2 implementation.

TypeScript consumers can import `DiscordNotificationOptions` from `opencode-discord-noti`.

### Token information

- **Session Tokens** is the cumulative usage reported by `session.tokens`, including input, output, reasoning, cache-read, and cache-write tokens.
- **Context Usage** uses the latest completed assistant message with token information after the most recent completed compaction, divided by that model's context limit from the catalog. This follows v2's context-meter calculation; it is not a cumulative percentage. Missing usage or limits display `N/A`.
- Completion text comes from the latest completed assistant message in `session.context()`. This API exposes retained model-context history, not the entire transcript. Only text content is sent, excluding reasoning and tool output.

## Development

Requires Bun and Node.js 24 for the package verification workflow (CI uses Node 24).

```sh
bun install
bun run check:ci
bun run typecheck
bun run knip
bun run test:coverage
bun run build
bun run test:package
```

`test:package` packs the release, checks its exact file list, installs it into an isolated consumer, and runs its v2 setup and event subscription in Node against a real local HTTP receiver. It exercises all three notification types, verifies subagent completion/idle suppression and cleanup, and typechecks the installed public declaration. Unit tests cover native event shapes, options isolation, location filtering, token metrics, failures, and cancellation.

For local OpenCode testing, build and set the entry's `package` to `/absolute/path/to/opencode-discord-noti/dist` (the directory containing `index.js`), then restart OpenCode. In the active plugin list, confirm ID `opencode-discord-noti` and the local source. Exercise a root-session completion, a pending permission, and a question; a subagent completion must remain silent. Reload or remove the plugin to verify cleanup.

## Publishing

The npm tarball contains only `dist/index.js`, `index.d.ts`, `package.json`, `README.md`, and `LICENSE`. `prepack` rebuilds the JavaScript before every pack or publish.

### First release

Run the development checks above, then:

```sh
npm login
npm publish --access public
```

### Subsequent releases

This project follows `opencode-translate`'s main-branch release pattern. After the first publish, configure an npm **trusted publisher** in the package settings:

- Provider: **GitHub Actions**
- Organization or user: **ysm-dev**
- Repository: **opencode-discord-noti**
- Workflow filename: **publish.yml**
- Environment: leave blank

Bump `package.json`'s version, update the pinned installation example, and push the release changes to `main`. The workflow runs checks, publishes unpublished versions with npm provenance through OIDC, and creates a GitHub release. It also supports manual dispatch and skips versions already on npm. No `NPM_TOKEN` is needed.

## Credits and license

Based on [frieser/opencode-discord-notification](https://github.com/frieser/opencode-discord-notification), with local additions for question notifications, permission hooks, root-session filtering, and session details. Package structure follows [ysm-dev/opencode-translate](https://github.com/ysm-dev/opencode-translate).

MIT — see [LICENSE](./LICENSE).
