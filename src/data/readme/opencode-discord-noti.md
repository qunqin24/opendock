# opencode-discord-noti

Discord webhook notifications for **OpenCode v1**: know when a response finishes, a permission needs attention, or the agent asks a question.

## Features

- **Response completed** (green): final assistant text, session title, directory, model, and token information.
- **Permission required** (orange): permission type, title, and patterns. Skips permissions already marked `allow` when the hook runs; auto-denied permissions include their status.
- **Question asked** (blue): questions, answer options, tool name, and call ID.
- Completion notifications skip subagent sessions. Directories under your home folder use `~`.
- Notification failures do not interrupt OpenCode. Webhook requests time out after 10 seconds.

This package uses the v1 `@opencode-ai/plugin` API and is typechecked against **1.14.28**. It does not target OpenCode v2.

## Install and configure

Create a webhook in your Discord channel under **Edit Channel → Integrations → Webhooks**. Add the pinned package and its options to `~/.config/opencode/opencode.jsonc` (or your project's `opencode.json`):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    [
      "opencode-discord-noti@0.2.0",
      {
        "enabled": true,
        "webhookUrl": "{env:DISCORD_WEBHOOK_URL}",
        "username": "OpenCode Notifier",
        "avatarUrl": "https://opencode.ai/logo.png"
      }
    ]
  ]
}
```

Set `DISCORD_WEBHOOK_URL` in the environment used to launch OpenCode, or replace `{env:DISCORD_WEBHOOK_URL}` with your webhook URL directly. OpenCode resolves environment substitutions before passing options to the plugin; an unset variable becomes an empty string and disables notifications.

OpenCode installs the npm package automatically. If you already have plugins configured, append the `[package, options]` entry to the existing array.

### Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `enabled` | boolean | `false` | Set to `true` to send notifications. |
| `webhookUrl` | string | none | Discord webhook URL; required when enabled. |
| `username` | string | `OpenCode Notifier` | Display name for webhook messages. |
| `avatarUrl` | string | none | Optional avatar URL. |

Keep the webhook URL private: it allows messages to be posted to your channel. Notifications include session content, question options, and permission patterns.

Options are captured when the plugin initializes. Missing/invalid `enabled` or `webhookUrl` values disable notifications; invalid optional display settings use their defaults. The plugin uses only the second-argument options object and does not read a separate configuration file or `project.config`.

**Quit and restart OpenCode after installing the plugin or changing its options.**

### Migrate from 0.1.0 or the local plugin

Version **0.2.0 changes the configuration format**. Replace the old string entry with the `["opencode-discord-noti@0.2.0", { ...options }]` tuple above. Move `enabled`, `webhookUrl`, `username`, and `avatarUrl` from `~/.config/opencode/discord-notification-config.json` into that options object. The old file is no longer used. Use only one plugin entry to avoid duplicate notifications.

### OpenCode v1 API references

- [Official configuration schema](https://opencode.ai/config.json): `Config.properties.plugin.items` accepts either a package string or a two-element `[string, object]` tuple.
- [v1.14.28 plugin types](https://github.com/anomalyco/opencode/blob/v1.14.28/packages/plugin/src/index.ts): `Plugin = (input: PluginInput, options?: PluginOptions) => Promise<Hooks>`, where `PluginOptions = Record<string, unknown>`.
- [v1.14.28 plugin loader](https://github.com/anomalyco/opencode/blob/v1.14.28/packages/opencode/src/plugin/index.ts): the loader calls each plugin with `(input, load.options)`.
- [Configuration variables](https://opencode.ai/docs/config/#env-vars): `{env:VARIABLE_NAME}` substitution is handled by OpenCode.
- [Plugin installation guide](https://opencode.ai/docs/plugins/#from-npm): npm plugins are installed automatically at startup. The guide's examples show string entries; the schema and v1 source above specify the options tuple.

TypeScript consumers can import `DiscordNotificationOptions` from `opencode-discord-noti`.

### Token information

The completion embed preserves the original plugin's calculation: `Total Tokens` is the largest assistant-message sum of input, output, and cache-read tokens in the session, rather than a cumulative billing total. Context percentage is available only when the session response includes the model's context limit; otherwise it displays `N/A`.

## Development

Requires Bun and Node.js (CI uses Node 24).

```sh
bun install
bun run check:ci
bun run typecheck
bun run knip
bun run test:coverage
bun run build
bun run test:package
```

`test:package` packs the release, checks its exact file list, installs it into an isolated consumer, and verifies that its v1 hooks use the supplied options in Node. Notification tests mock Discord and cover options isolation, defaults, invalid values, and removal of the legacy configuration fallback.

For local OpenCode testing, build and replace the package string inside the options tuple with `file:///absolute/path/to/opencode-discord-noti/dist/index.js`, then restart OpenCode.

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
