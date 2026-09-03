# opencode-context-gauge-plugin

An [OpenCode](https://opencode.ai) TUI sidebar plugin that shows a live context-window usage gauge for the active session.

```
🧠 ████████▋░░░░░░░░░░░░ 43%
18.4k / 200k · 💰 $0.53
```

## Features

- **Context gauge** — eighth-block progress bar showing used tokens vs. the active model's context window
- **Token accounting** — sums `input + output + reasoning + cache.read + cache.write` from the latest completed assistant message, falling back to session aggregates
- **Cost display** — session spend alongside token counts (optional)
- **Threshold colors** — bar turns warning/danger colored as you approach the window limit (theme-aware)
- **Configurable** — label, bar width, thresholds, cost visibility

## Install

```sh
opencode plugin --global @davidaayers/opencode-context-gauge-plugin
```

Or from inside OpenCode: press `ctrl+p` → "Install Plugin" → `@davidaayers/opencode-context-gauge-plugin`. The command patches `tui.json` for you; restart OpenCode and the gauge appears in the sidebar once the session has a completed assistant response.

### From source

OpenCode TUI plugins load from the `plugin` array in **`~/.config/opencode/tui.json`** (or a project-level `tui.json`) — *not* from `opencode.jsonc`, whose `plugin` array is server-side only. Adding a TUI-only module to `opencode.jsonc` will make the server fail to load it.

```jsonc
// ~/.config/opencode/tui.json
{
  "plugin": [
    "file:///absolute/path/to/opencode-context-gauge-plugin/src/context-gauge.tsx"
  ]
}
```

## Notes

OpenCode also ships a built-in context section in the sidebar. If you'd rather only see this one, press `ctrl+p` → **Plugins** and toggle the built-in context plugin off. The choice persists across restarts.

## Configuration

Pass options using the `[spec, options]` tuple form (spec being the npm package name or a `file://` path):

```jsonc
{
  "plugin": [
    [
      "@davidaayers/opencode-context-gauge-plugin",
      {
        "label": "Context",
        "barWidth": 20,
        "warnAt": 70,
        "dangerAt": 90,
        "showCost": true
      }
    ]
  ]
}
```

| Option    | Type              | Default    | Description                                                        |
| --------- | ----------------- | ---------- | ------------------------------------------------------------------ |
| `label`   | `string \| false` | `"🧠"`     | Gauge label; set to `false` to hide                                |
| `barWidth`| `number`          | `20`       | Bar width in cells (clamped 4–60)                                  |
| `warnAt`  | `number`          | `70`       | Percent at which the bar switches to the warning color             |
| `dangerAt`| `number`          | `90`       | Percent at which the bar switches to the danger color (clamped > `warnAt`) |
| `showCost`| `boolean`         | `true`     | Show session cost after token counts                               |

## How It Works

- **Used tokens**: the most recent assistant message with output tokens provides `input + output + reasoning + cache.read + cache.write`; before any responses exist, session-level token/cost aggregates are used.
- **Context window**: resolved from the message's (or session's) provider/model via `provider.models[modelID].limit.context`. The widget hides itself if no context limit is known.
- **Rendering**: SolidJS JSX via `@opentui/solid`, registered into the `sidebar_content` slot through [`@opencode-ai/plugin/tui`](https://www.npmjs.com/package/@opencode-ai/plugin). Colors come from the active OpenCode theme (`accent` / `warning` / `error`).

## Development

```sh
bun install
bun run typecheck
```

Single-file plugin: everything lives in [`src/context-gauge.tsx`](src/context-gauge.tsx).

## Roadmap

Cross-repository follow-up work is tracked in the [OpenCode Plugins project](https://github.com/users/davidaayers/projects/1).

## Releases

Releases are managed by [Release Please](https://github.com/googleapis/release-please) from Conventional Commit messages. Merging a Release Please pull request bumps the version, updates `CHANGELOG.md`, creates the GitHub release and tag, and publishes the package to npm.

See [CHANGELOG.md](CHANGELOG.md) for release history.

Before the first automated release, configure npm Trusted Publishing for `@davidaayers/opencode-context-gauge-plugin` with:

- GitHub organization or user: `davidaayers`
- Repository: `opencode-context-gauge-plugin`
- Workflow filename: `release-please.yml`
- Environment: leave empty

The `v0.1.1` baseline tag is already in place at commit `65f68a753babf7f12fe1618ff01ac14c20b5a77f`.

## Credits

Inspired by [streetturtle/opencode-better-sidebar](https://github.com/streetturtle/opencode-better-sidebar) — a great collection of OpenCode sidebar plugins; its `context-progress` plugin planted the seed for this one.

## License

[MIT](LICENSE) © 2026 David Ayers
