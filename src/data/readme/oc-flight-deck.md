<p align="center">
  <img src="assets/icon.svg" width="128" height="128" alt="oc-flight-deck icon" />
</p>
<h1 align="center">oc-flight-deck</h1>
<p align="center"><strong>Live session telemetry in your OpenCode sidebar.</strong></p>
<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/github/license/nathwn12/oc-flight-deck" alt="License" /></a>
  <img src="https://img.shields.io/github/languages/top/nathwn12/oc-flight-deck" alt="Language" />
  <img src="https://img.shields.io/badge/platform-windows--linux-2b3137" alt="Platform" />
</p>

## What it is

oc-flight-deck is an OpenCode V2 plugin that renders live session telemetry in the sidebar: status, agent, model, cost, project, tokens, cache, context, permissions, elapsed time and throughput, every row read from the open session at render time. Cost, tokens, cache and reasoning roll up the subagent tree through the host's parentID link, falling back to the session alone when there is none. It is for anyone running agent sessions who wants the numbers where they are already looking.

## Why

A session's own cost excludes its subagents, so the reported figure understates real spend — on the session this was built against, a reported $0.2246 against true spend of $0.2447, 9% low on money and 54% low on tokens. One money row tells the truth.

## Features

- Live rows for `status`, `agent`, `model`, `cost`, `project`, `tokens`, `cache`, `context`, `perms`, `elapsed` and `tps`, plus opt-in rows: `caution`, `branch`, `total`, `spark`, `reasoning`, `turns`, `guard`, `go` and `ses`. `layout.labels` renames any of them — `{ "cost": "session", "total": "lifetime" }` draws your own cost under `session` and the family total under `lifetime`.
- Family-scoped money: cost, tokens, cache and reasoning cover the conversation plus every subagent session in its tree; the project row covers every session in the project.
- Elapsed time recomputed from the assistant-turn spans the host recorded, so a restart returns the same value instead of resetting.
- Live throughput over `sidebar.tps.scope` (`family` or `session`, default `family`), reading `0 tok/s` whenever the scope is not generating.
- Stable rail: with `sidebar.persist` every named row draws a zero skeleton until the host has data, while caution stays silent until something stops moving.
- Reads only while the opt-in guard and go surfaces stay off: no telemetry, nothing on disk, no network calls; the single write is a click on the opt-in ses row copying the full session id to the terminal clipboard. Enabling the opt-in `go` row or `sidebar.footer.go` panel polls `https://opencode.ai/zen/go/v1/usage` every 60 seconds, and only with `FLIGHT_DECK_GO_LOG=1` appends one observation line per poll to `tmpdir()/opencode/flight-deck-go.log` (never the key).
- A bad config value is ignored with its default restored and a one-time toast naming the key, so a typo never breaks the TUI.

## Install

1. Add the plugin to the `plugins` array in your `opencode.jsonc` (stable):
   ```jsonc
   { "plugins": ["oc-flight-deck@0.19.0"] }
   ```
   For bleeding edge instead of stable, not in addition:
   ```jsonc
   { "plugins": ["oc-flight-deck@git+https://github.com/nathwn12/oc-flight-deck.git#<full sha>"] }
   ```
2. Restart OpenCode.
3. Verify: the panel appears beside an open session.

See [INSTALL.md](INSTALL.md) for the three routes: pinned npm, the github package spec, and a no-npm local directory entry. To uninstall, remove the entry from `opencode.jsonc`, restart, and delete your `flight-deck.jsonc` if you made one.

## Usage

Copy [flight-deck.example.jsonc](flight-deck.example.jsonc) to the one global path, `~/.config/opencode/flight-deck.jsonc` (`$XDG_CONFIG_HOME/opencode/flight-deck.jsonc` when that variable holds an absolute path), then edit. A `.json` name works too; the `.jsonc` name is tried first. The file is optional: with no file at all you get exactly the defaults the example file writes out. There is no per-project lookup.

Every key is optional. The real config keys, taken from [flight-deck.schema.json](flight-deck.schema.json):

- `refresh` (default `100`): milliseconds between ticks; `0` turns the ticker off.
- `sidebar.enabled`, `sidebar.lines`, `sidebar.rows`, `sidebar.tps.scope` (`family` or `session`), `sidebar.persist`, `sidebar.placeholder`, `sidebar.maxLines` (default `24`), `sidebar.footer.lines`, `sidebar.footer.go`.
- `footer.enabled` / `footer.text`: a single line in the prompt footer, off unless configured.
- `caution.enabled` (default `false`), `toolWatchSeconds` (`180`), `toolCautionSeconds` (`420`), `turnWatchSeconds` (`600`), `turnCautionSeconds` (`1200`), `repeatThreshold` (`3`), `exemptTools`, `toast` (`false`). To use the annunciator, add `caution` to `sidebar.rows` and set `caution.enabled: true`.
- `layout.labelWidth` (`10`), `layout.barWidth` (`10`), `layout.sparkWidth` (`12`), `layout.labels` (per-row label renames, e.g. `{ "cost": "session", "total": "lifetime" }`; every other row keeps its built-in label).
- `format.duration` (`spaced` or `compact`).
- `glyphs.watch`, `glyphs.caution`, `glyphs.clear`.
- `style.lines` and `style.rows.*`: theme color roles with OpenTUI text attributes.

```jsonc
// ~/.config/opencode/flight-deck.jsonc
{
  "refresh": 100,
  "sidebar": {
    "maxLines": 24,
    "rows": [
      "status", "agent", "model", "cost", "project",
      "tokens", "cache", "context", "perms", "elapsed", "tps"
    ]
  },
  // spaced separates the units (2h 14m 37s, the default); "compact" hugs them (2h14m37s)
  "format": { "duration": "spaced" },
  "caution": { "toast": false },
  "style": {
    "lines": { "color": "default", "attributes": [] },
    "rows": {
      "*": { "color": "subdued", "attributes": [] },
      "cost": { "color": "success", "attributes": ["bold"] }
    }
  }
}
```

## Build from source

Prerequisites: Node 22 or newer, or Bun 1.4 or newer.

```sh
bun install
bun run check
```

`bun run check` typechecks and runs the suite, including headless OpenTUI render tests that mount the panel in a real renderer and assert the exact characters that come out. To load the plugin from a checkout while working on it, name the checkout as a git file URL in the `opencode.jsonc` of the project you run OpenCode in:

```jsonc
{
  "plugins": ["git+file:///absolute/path/to/oc-flight-deck"]
}
```

That installs a copy, not a symlink, so re-run the install after editing the checkout. Built against `@opencode/plugin` 2.0.26 on the official [OpenCode V2 CLI plugin API](https://opencode.ai/v2/docs/build/plugins/cli).

## Docs

- [INSTALL.md](INSTALL.md) — the three install routes.
- [flight-deck.example.jsonc](flight-deck.example.jsonc) — every option, documented inline.
- [flight-deck.schema.json](flight-deck.schema.json) — types, defaults and allowed values.
- [CHANGELOG.md](CHANGELOG.md) — release history.

## Status

**Active** — maintained, issues welcome.

## License

MIT — see [LICENSE](LICENSE).

<!-- nathwn12 house footer: identical in every repo. Do not edit. -->
<p align="center">
  <a href="https://github.com/nathwn12"><img src="assets/signature.svg" width="96" alt="nathwn12" /></a>
</p>
<p align="center">
  <sub>Built by <a href="https://github.com/nathwn12">nathwn12</a> · <a href="https://github.com/nathwn12?tab=repositories">All projects</a></sub>
</p>
