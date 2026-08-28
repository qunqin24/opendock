# opencode-codex-usage-plugin

An [OpenCode](https://opencode.ai) TUI sidebar plugin that shows Codex 5-hour and weekly quota usage as compact gauges with reset countdowns.

```text
Codex Usage
5h   ███░░░░  week █████▋░
42% · 2h      81% · 7d
```

This is a maintained fork of [zaniluca/opencode-codex-usage-plugin](https://github.com/zaniluca/opencode-codex-usage-plugin). It keeps the original Codex App/CLI integration and presents the usage data in the gauge style used by the other David Ayers OpenCode plugins.

## Features

- **Quota gauges** — compact eighth-block gauges for the 5-hour and weekly Codex limits
- **Proximity colors** — gauge and percentage use the active theme: `success` <50% → `accent` 50–74% → `warning` 75–89% → `error` ≥90%
- **Reset countdowns** — short reset times appear beneath each available window
- **Compact prompt line** — identifies the most constrained window when the sidebar is hidden
- **Codex App/CLI support** — reads usage through the Codex app-server protocol with command discovery and fallback handling
- **Live updates** — refreshes every 60 seconds and on message/session events
- **Silent by design** — hidden for non-Codex sessions

## Install

```sh
opencode plugin --global @davidaayers/opencode-codex-usage-plugin
```

Or from inside OpenCode: press `ctrl+p` → "Install Plugin" → `@davidaayers/opencode-codex-usage-plugin`. Restart OpenCode and the gauges appear once the session uses an OpenAI/Codex model.

### From source

OpenCode TUI plugins load from the `plugin` array in **`~/.config/opencode/tui.json`** (or a project-level `tui.json`) — _not_ from `opencode.jsonc`, whose `plugin` array is server-side only.

```jsonc
// ~/.config/opencode/tui.json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["file:///absolute/path/to/opencode-codex-usage-plugin/dist/tui.js"],
}
```

## Requirements

Install either **Codex App** or the **Codex CLI**. The plugin looks for Codex in common locations and on your `PATH`.

If your Codex command lives somewhere else, set `OPENCODE_CODEX_USAGE_COMMAND`:

```sh
export OPENCODE_CODEX_USAGE_COMMAND="/path/to/codex"
```

## How It Works

- **Usage source**: the Codex app-server provides normalized 5-hour and weekly rate-limit windows.
- **Rendering**: the plugin uses OpenTUI and the active OpenCode theme, with the gauge renderer kept separate from the Codex transport.
- **Lifecycle**: the existing Effect-based service owns command discovery, socket reuse, stdio fallback, request timeouts, and cleanup.

## Development

```sh
pnpm install
pnpm check
pnpm test
pnpm build
```

The published plugin entrypoint is [`dist/tui.js`](dist/tui.js), generated from [`src/tui.ts`](src/tui.ts).

## Roadmap

Cross-repository follow-up work is tracked in the [OpenCode Plugins project](https://github.com/users/davidaayers/projects/1).

## Credits

The Codex integration is forked from [zaniluca/opencode-codex-usage-plugin](https://github.com/zaniluca/opencode-codex-usage-plugin). The gauge presentation is inspired by [@davidaayers/opencode-go-usage-plugin](https://github.com/davidaayers/opencode-go-usage-plugin) and [@davidaayers/opencode-context-gauge-plugin](https://github.com/davidaayers/opencode-context-gauge-plugin).

## License

[MIT](LICENSE). See the upstream project for the original implementation and attribution.
