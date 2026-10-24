# opencode-go-usage-plugin

An [OpenCode](https://opencode.ai) TUI sidebar plugin that shows your OpenCode Go plan usage (5h / weekly / monthly) from the official usage API — no dashboard scraping.

```text
Go Usage
5h █▏░░░░░ wk ████▏░░ mo ███████
22% · 2h   81% · 7d   100% · 28d
```

## OpenCode compatibility

**Plugin 1.x supports OpenCode 2.x only, starting at 2.1.3.** OpenCode 1.x and OpenCode 2.0–2.1.2 are not supported by this release line.

| Plugin version                                                                                         | OpenCode version          |
| ------------------------------------------------------------------------------------------------------ | ------------------------- |
| 1.x                                                                                                    | 2.1.3 or newer within 2.x |
| [0.1.4](https://www.npmjs.com/package/@davidaayers/opencode-go-usage-plugin/v/0.1.4) — last V1 release | 1.x                       |

Still using OpenCode 1.x? Pin `@davidaayers/opencode-go-usage-plugin@0.1.4` and keep that release's V1 configuration. Do not use the V2 `cli.json` instructions below with OpenCode 1.x. Upgrading the plugin to 1.x requires upgrading OpenCode too.

## Features

- **Plan gauges** — three eighth-block gauges (5h / wk / mo) sized to the sidebar, with percent and reset countdown beneath each
- **Proximity colors** — gauge and percent ramp through theme tokens as limits approach: `success` <50% → `accent` 50–74% → `warning` 75–89% → `error` ≥90% or `rate-limited`
- **Compact prompt line** — `Go month 100%` on narrow terminals (or with `compact: true`), showing the binding constraint
- **Official API** — polls `GET https://opencode.ai/zen/go/v1/usage` with your active OpenCode Console login (or a legacy Go key); zero config, no page scraping
- **Live updates** — 60s polling plus refresh on message/session events
- **Silent by design** — hidden entirely when no OpenCode credential is present or the session is not using Go

## Install

Requires OpenCode **2.1.3 or newer within 2.x**. Add the package to `~/.config/opencode/cli.json`:

```json
{
  "$schema": "https://opencode.ai/v2/cli.json",
  "plugins": ["@davidaayers/opencode-go-usage-plugin@^1.0.0"]
}
```

Restart OpenCode after installing. The gauges appear once the session uses an `opencode-go` model.

### From source

Run `pnpm install --frozen-lockfile && pnpm build`, then load the repository directory from global `~/.config/opencode/cli.json`, not the server configuration:

```jsonc
// ~/.config/opencode/cli.json
{
  "$schema": "https://opencode.ai/v2/cli.json",
  "plugins": ["/absolute/path/to/opencode-go-usage-plugin"],
}
```

The build generates an ignored root `tui.js` re-export for OpenCode 2.1.3's local-directory resolver. npm installs use the sole `./tui` export pointing to `dist/tui.js`; only `dist` is published. Remove any old discovery wrapper for this plugin under `~/.config/opencode/plugins/` when switching to the direct directory entry so it is not loaded twice.

## Configuration

Pass options using the object form in global `~/.config/opencode/cli.json`. The `package` value can be the npm package or a local repository directory:

```jsonc
{
  "$schema": "https://opencode.ai/v2/cli.json",
  "plugins": [
    {
      "package": "@davidaayers/opencode-go-usage-plugin@^1.0.0",
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

- **Usage windows**: polls the official endpoint using the active OpenCode Console credential from the connected server's credential API every 60s and on session events. A legacy `opencode-go` key is used only when Console is not connected. No legacy `auth.json` access is needed. Each window reports `percent` (0–100), `status` (`ok` / `rate-limited`), and `resetsAt`.
- **Rendering**: Solid JSX via `@opentui/solid`, registered into `sidebar.content` and `prompt.footer.status` through `@opencode/plugin/tui`. Colors come from the active OpenCode theme.
- **Sidebar geometry**: the session sidebar is a fixed 42 columns (37 usable after padding); the gauge columns are sized so the widest possible row (`100% · 28d`) fits exactly.

## Development

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm build
```

`pnpm check` runs typecheck, unit tests, and the packed-install render/update/cleanup test.

Source lives in `src/tui.tsx`. `build.mjs` applies the Solid transform and generates `dist/tui.js` plus the root `tui.js` local-loading bridge; `prepack` runs the build automatically. Output stays unminified, and the plugin API, Effect, Solid, and OpenTUI runtimes remain external and host-provided. Generated files are ignored and replaced atomically; do not hand-edit or commit them.

Run `bun scratch-repro.tsx` for the fixture-based headless render harness.

## Roadmap

Cross-repository follow-up work is tracked in the [OpenCode Plugins project](https://github.com/users/davidaayers/projects/1).

## Releases

Releases are managed by [Release Please](https://github.com/googleapis/release-please) from Conventional Commit messages. Merging a Release Please pull request bumps the version, updates `CHANGELOG.md`, creates the GitHub release and tag, and publishes the package to npm.

The 1.0.0 release is explicitly targeted using `release-as` in `release-please-config.json`. Remove that one-time override after the 1.0.0 release PR is merged; leave the historical release manifest for Release Please to update.

See [CHANGELOG.md](CHANGELOG.md) for release history.

## License

[MIT](LICENSE) © 2026 David Ayers
