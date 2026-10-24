# opencode-context-gauge-plugin

An [OpenCode](https://opencode.ai) TUI sidebar plugin that shows a live context-window usage gauge for the active session.

```text
🧠 ████████▋░░░░░░░░░░░░ 43%
18.4k / 200k · 💰 $0.53
```

## OpenCode compatibility

**Plugin 1.x supports OpenCode 2.x only, starting at 2.1.3.** OpenCode 1.x and OpenCode 2.0–2.1.2 are not supported by this release line.

| Plugin version                                                                                              | OpenCode version          |
| ----------------------------------------------------------------------------------------------------------- | ------------------------- |
| 1.x                                                                                                         | 2.1.3 or newer within 2.x |
| [0.1.8](https://www.npmjs.com/package/@davidaayers/opencode-context-gauge-plugin/v/0.1.8) — last V1 release | 1.x                       |

Still using OpenCode 1.x? Pin `@davidaayers/opencode-context-gauge-plugin@0.1.8` and keep that release's V1 configuration. Do not use the V2 `cli.json` instructions below with OpenCode 1.x. Upgrading the plugin to 1.x requires upgrading OpenCode too.

> **Version 0.1.2 warning:** npm `0.1.2` can overstate context when cache counters are added to an already-aggregated total. OpenCode 1.x users should upgrade to `0.1.8`; OpenCode 2.x users should use the 1.x plugin line.

## Features

- **Context gauge** — eighth-block progress bar showing used tokens vs. the active model's context window
- **Token accounting** — cache-inclusive component total from the latest assistant response, falling back to session aggregates
- **Cost display** — session spend alongside token counts (optional)
- **Threshold colors** — bar turns warning/danger colored as you approach the window limit (theme-aware)
- **Configurable** — label, bar width, thresholds, cost visibility

## Install

Requires OpenCode **2.1.3 or newer within 2.x**. Add the package to `~/.config/opencode/cli.json`:

```json
{
  "$schema": "https://opencode.ai/v2/cli.json",
  "plugins": ["@davidaayers/opencode-context-gauge-plugin@^1.0.0"]
}
```

Restart OpenCode after installing. The gauge appears once the session has a completed assistant response.

### From source

Run `pnpm install --frozen-lockfile && pnpm build`, then load the repository directory from global `~/.config/opencode/cli.json`, not the server configuration:

```jsonc
// ~/.config/opencode/cli.json
{
  "$schema": "https://opencode.ai/v2/cli.json",
  "plugins": ["/absolute/path/to/opencode-context-gauge-plugin"],
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
      "package": "@davidaayers/opencode-context-gauge-plugin@^1.0.0",
      "options": {
        "label": "Context",
        "barWidth": 20,
        "warnAt": 70,
        "dangerAt": 90,
        "showCost": true,
      },
    },
  ],
}
```

| Option     | Type              | Default | Description                                                                |
| ---------- | ----------------- | ------- | -------------------------------------------------------------------------- |
| `label`    | `string \| false` | `"🧠"`  | Gauge label; set to `false` to hide                                        |
| `barWidth` | `number`          | `20`    | Bar width in cells (clamped 4–60)                                          |
| `warnAt`   | `number`          | `70`    | Percent at which the bar switches to the warning color                     |
| `dangerAt` | `number`          | `90`    | Percent at which the bar switches to the danger color (clamped > `warnAt`) |
| `showCost` | `boolean`         | `true`  | Show session cost after token counts                                       |

### Built-in context section

OpenCode also ships a built-in context section in the sidebar. If you'd rather only see this one, press `Ctrl+P` → **Plugins** and toggle the built-in context plugin off. The choice persists across restarts.

## How It Works

- **Used tokens**: matches OpenCode's built-in context section: the most recent assistant message with output uses `input + output + reasoning + cache.read + cache.write`. Before any responses exist, session-level token/cost aggregates are used.
- **Context window**: resolved from the location's model catalog using the message's (or session's) model reference. The widget hides itself if no context limit is known.
- **Rendering**: Solid JSX via `@opentui/solid`, registered into `sidebar.content` through `@opencode/plugin/tui`. Colors come from the active OpenCode theme.

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

Inspired by [streetturtle/opencode-better-sidebar](https://github.com/streetturtle/opencode-better-sidebar) — a great collection of OpenCode sidebar plugins; its `context-progress` plugin planted the seed for this one.

## License

[MIT](LICENSE) © 2026 David Ayers
