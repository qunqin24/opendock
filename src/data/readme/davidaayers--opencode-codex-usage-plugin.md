# opencode-codex-usage-plugin

An [OpenCode](https://opencode.ai) TUI sidebar plugin that shows Codex 5-hour and weekly quota usage as compact gauges with reset countdowns.

```text
Codex Usage
5h   ████▎░░░░░  week ████████▏░
42% · 2h         81% · 7d
```

The gauge row occupies 32 terminal cells, matching the default context gauge and Go usage plugins. Two fixed 15-cell columns contain 10-cell bars, separated by two spaces. A single available window expands to a 27-cell bar in the same allocation. Reset text stays within its column and is truncated if necessary; compact prompt lines are unchanged.

## OpenCode compatibility

**Plugin 1.x supports OpenCode 2.x only, starting at 2.1.3.** OpenCode 1.x and OpenCode 2.0–2.1.2 are not supported by this release line.

| Plugin version                                                                                            | OpenCode version          |
| --------------------------------------------------------------------------------------------------------- | ------------------------- |
| 1.x                                                                                                       | 2.1.3 or newer within 2.x |
| [0.1.2](https://www.npmjs.com/package/@davidaayers/opencode-codex-usage-plugin/v/0.1.2) — last V1 release | 1.x                       |

Still using OpenCode 1.x? Pin `@davidaayers/opencode-codex-usage-plugin@0.1.2` and keep that release's V1 configuration. Do not use the V2 `cli.json` instructions below with OpenCode 1.x. Upgrading the plugin to 1.x requires upgrading OpenCode too.

## Features

- **Quota gauges** — compact eighth-block gauges for the available 5-hour and weekly Codex limits
- **Proximity colors** — gauge and percentage use the active theme: `success` <50% → `accent` 50–74% → `warning` 75–89% → `error` ≥90%
- **Reset countdowns** — short reset times appear beneath each available window
- **Compact prompt line** — identifies the most constrained window on narrow terminals (or with `compact: true`)
- **Codex App/CLI support** — reads usage through the Codex app-server protocol, sharing a WebSocket-over-Unix server across OpenCode instances
- **Live updates** — refreshes every 60 seconds and on message/session events
- **Silent by design** — hidden for non-Codex sessions

## Install

Requires OpenCode **2.1.3 or newer within 2.x**. Add the package to `~/.config/opencode/cli.json`:

```json
{
  "$schema": "https://opencode.ai/v2/cli.json",
  "plugins": ["@davidaayers/opencode-codex-usage-plugin@^1.0.0"]
}
```

Restart OpenCode after installing. The gauges appear once the session uses an OpenAI/Codex model.

### From source

Run `pnpm install --frozen-lockfile && pnpm build`, then load the repository directory from global `~/.config/opencode/cli.json`, not the server configuration:

```jsonc
// ~/.config/opencode/cli.json
{
  "$schema": "https://opencode.ai/v2/cli.json",
  "plugins": ["/absolute/path/to/opencode-codex-usage-plugin"],
}
```

The build generates an ignored root `tui.js` re-export for OpenCode 2.1.3's local-directory resolver. npm installs use the sole `./tui` export pointing to `dist/tui.js`; only `dist` is published. Remove any old discovery wrapper for this plugin under `~/.config/opencode/plugins/` when switching to the direct directory entry so it is not loaded twice.

### Codex App or CLI

Install either **Codex App** or the **Codex CLI**. The plugin looks for Codex in common locations and on your `PATH`.

If your Codex command lives somewhere else, set `OPENCODE_CODEX_USAGE_COMMAND`:

```sh
export OPENCODE_CODEX_USAGE_COMMAND="/path/to/codex"
```

## Configuration

Pass options using the object form in global `~/.config/opencode/cli.json`. The `package` value can be the npm package or a local repository directory:

```jsonc
{
  "$schema": "https://opencode.ai/v2/cli.json",
  "plugins": [
    {
      "package": "@davidaayers/opencode-codex-usage-plugin@^1.0.0",
      "options": {
        "compact": true,
      },
    },
  ],
}
```

| Option    | Type      | Default | Description                                                                         |
| --------- | --------- | ------- | ----------------------------------------------------------------------------------- |
| `compact` | `boolean` | `false` | Force the compact prompt line on wide terminals when the sidebar is manually hidden |

The compact line appears automatically on narrow terminals and in child sessions. V2 does not expose the user's sidebar visibility preference to plugins; use `compact: true` when hiding the sidebar manually on a wide terminal.

## How It Works

- **Usage source**: the Codex app-server provides normalized 5-hour and weekly rate-limit windows.
- **Rendering**: Solid JSX via `@opentui/solid`, registered into `sidebar.content` and `prompt.footer.status` through `@opencode/plugin/tui`. Colors come from the active OpenCode theme.
- **Lifecycle**: the Effect-based service reuses or starts a shared Codex app-server over a Unix socket, connects with WebSocket, and falls back to a dedicated stdio server when the shared path is unavailable. It owns request timeouts and connection cleanup.
- **Runtime**: OpenCode supplies Effect 4.0.1 and the shared renderer; the plugin does not bundle or install its own runtime copies.
- **Transport client**: Node uses the bundled `codex-websocket` alias of `ws`; Bun uses its native client with an explicit Unix-socket URL. The Node client is not a host-provided runtime.

## Development

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm build
```

`pnpm check` runs typecheck, unit tests, and the packed-install render/update/cleanup test.

Source lives in `src/tui.tsx`. `build.mjs` applies the Solid transform and generates `dist/tui.js` plus the root `tui.js` local-loading bridge; `prepack` runs the build automatically. Output stays unminified, and the plugin API, Effect, Solid, and OpenTUI runtimes remain external and host-provided. Generated files are ignored and replaced atomically; do not hand-edit or commit them.

## Roadmap

Cross-repository follow-up work is tracked in the [OpenCode Plugins project](https://github.com/users/davidaayers/projects/1).

## Releases

Releases are managed by [Release Please](https://github.com/googleapis/release-please) from Conventional Commit messages. Merging a Release Please pull request bumps the version, updates `CHANGELOG.md`, creates the GitHub release and tag, and publishes the package to npm.

The 1.0.0 release is explicitly targeted using `release-as` in `release-please-config.json`. Remove that one-time override after the 1.0.0 release PR is merged; leave the historical release manifest for Release Please to update.

See [CHANGELOG.md](CHANGELOG.md) for release history.

## Credits

This is a maintained fork of [zaniluca/opencode-codex-usage-plugin](https://github.com/zaniluca/opencode-codex-usage-plugin). It keeps the original Codex App/CLI integration. The gauge presentation is inspired by [@davidaayers/opencode-go-usage-plugin](https://github.com/davidaayers/opencode-go-usage-plugin) and [@davidaayers/opencode-context-gauge-plugin](https://github.com/davidaayers/opencode-context-gauge-plugin).

## License

[MIT](LICENSE). See the upstream project for the original implementation and attribution.
