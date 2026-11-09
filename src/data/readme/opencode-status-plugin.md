# OpenCodeStatusPlugin

[![CI](https://github.com/hamster007Github/OpenCodeStatusPlugin/actions/workflows/ci.yml/badge.svg)](https://github.com/hamster007Github/OpenCodeStatusPlugin/actions/workflows/ci.yml)

Provider status for OpenCode Go, inside OpenCode Desktop.

OpenCode Go can degrade or go down in the middle of a session, and nothing in the desktop app tells
you. This plugin polls the official OpenCode status feed and shows the parts you care about — Go and
its models — where you already look: a compact pill above the composer, a side panel with the
detail, and a settings page that decides what is shown.

## What it shows

| Surface | Content |
| --- | --- |
| Composer pill | One line: `OpenCode [scope] mark` — `OpenCode [Go] 🟢` operational, `OpenCode [Go] 🟡` degraded, `OpenCode [Go] 🔴` outage, `OpenCode [Go] ❔️` unknown or stale. Its menu lists the watched services with their state and reason, and opens the panel. |
| Side panel | Per-service and per-model state with the reason (`errors`, `upstream`, `latency`, `availability`), the time since the current state began, median time to first token and tokens per second, ongoing incidents with their latest update, the 7-day history strip, the age of the last check, and a stale warning. |
| Settings page | Which services and models are watched, whether speed, incidents and history are shown, and when the plugin may notify. |
| CLI/TUI | Footer mark `[Go] 🟢` — the desktop pill without the `OpenCode` prefix, because terminal width is limited — in both the home footer and the session prompt footer (each can be turned off) and `/provider-status`, which lists the watched services and drills into their models. Incidents are one more entry. |
| Command | `provider-status.open` opens the panel from the command palette. The side panel's **+** menu lists it too. |

The pill is one line: the product, the watched scope and a mark. It never carries a number, a unit
or a model id: those need room, a baseline and a unit, and they live in the panel.

Deliberately not shown:

- **Models in the pill menu.** A model's state means little without its reason and speed, and the
  panel shows both with units. The menu answers "which service is not healthy" and gets out of the
  way.
- **Per-service history strips.** One strip for the watched scope answers "was it like this
  before?"; six would double the panel and repeat the answer.
- **Resolved incidents.** The 7-day strip covers the past. The status page keeps the full list, and
  the panel links to it.
- **The feed's overall `status`.** It counts services the user does not watch. The pill and the
  panel derive their state from the watched scope only, so a free-tier outage does not alarm a Go
  user.

## Screenshots

**Desktop.** The pill sits above the composer and answers one question in one line — which scope,
which state. The arrow marks what this plugin adds to the app.

<a href="https://raw.githubusercontent.com/hamster007Github/OpenCodeStatusPlugin/main/docs/images/desktop-pill.png">
  <img src="https://raw.githubusercontent.com/hamster007Github/OpenCodeStatusPlugin/main/docs/images/desktop-pill.png"
       alt="Composer with the pill OpenCode [Go] and a green mark above the prompt, the pill marked with an arrow"
       width="640">
</a>

The panel behind it carries the detail: per service and per model, with the reason, the time since the
state began, median time to first token, tokens per second, ongoing incidents and the 7-day strip.

<a href="https://raw.githubusercontent.com/hamster007Github/OpenCodeStatusPlugin/main/docs/images/desktop-panel.png">
  <img src="https://raw.githubusercontent.com/hamster007Github/OpenCodeStatusPlugin/main/docs/images/desktop-panel.png"
       alt="Provider status panel listing Go models with state, TTFT and tokens per second, plus ongoing incidents and a 7-day history strip"
       width="760">
</a>

**CLI.** The footer mark is the pill's scope and mark without the `OpenCode` prefix, because terminal
width is limited. The arrow marks it; `5.3K (1%)` and `ctrl+p commands` belong to the app.

<a href="https://raw.githubusercontent.com/hamster007Github/OpenCodeStatusPlugin/main/docs/images/tui-footer.png">
  <img src="https://raw.githubusercontent.com/hamster007Github/OpenCodeStatusPlugin/main/docs/images/tui-footer.png"
       alt="Terminal footer with [Go] and a green mark next to the app's context usage and key hint, the plugin mark marked with an arrow"
       width="760">
</a>

`/provider-status` is the panel's terminal counterpart:

<a href="https://raw.githubusercontent.com/hamster007Github/OpenCodeStatusPlugin/main/docs/images/tui-provider-status.png">
  <img src="https://raw.githubusercontent.com/hamster007Github/OpenCodeStatusPlugin/main/docs/images/tui-provider-status.png"
       alt="/provider-status list of the watched services and models with state, TTFT and tokens per second"
       width="760">
</a>

## Severity

One scale, used by every surface:

| State | Pill mark | Reads as |
| --- | --- | --- |
| `operational` | 🟢 green | nothing to do |
| `degraded` | 🟡 yellow | slower or partly failing |
| `outage` | 🔴 red | not usable |
| `unknown` | `❔️` | the plugin does not know |
| stale | `❔️` | the data is old |

The pill shows the mark only; the words are in its accessible name, its menu rows and the panel, so
colour is reinforcement and never the only signal. `unknown` and stale data never use the green
mark. Each mark is configuration (`lights`), so the pill can show words or another symbol set
instead.

## Data source

[`https://status.opencode.ai/api/status`](https://status.opencode.ai/api/status) is the JSON
snapshot behind <https://status.opencode.ai>. It is public, needs no key and is cached by the origin
for 15 seconds.

The endpoint sends no CORS header, so a browser window cannot call it directly. The plugin's server
part polls and caches it, and the GUI reads that cache over RPC: one request per OpenCode server, not
one per window. The status page's HTML is never parsed.

Every field, the service and reason enumerations, the speed units, the history buckets and the
staleness rules are documented in [`docs/status-feed.md`](https://github.com/hamster007Github/OpenCodeStatusPlugin/blob/main/docs/status-feed.md).

## Requirements

- OpenCode Desktop 2.x. The GUI plugin API is experimental and may change between releases.
- OpenCode 2.x for the CLI/TUI part. The same global plugin entry loads it; no separate `cli.json`
  entry is needed because the package has a server part.
- This build was made against `@opencode/plugin` **2.2.5**.
- The plugin listed in the **global** `opencode.jsonc`: the desktop app reads plugins only from the
  server it runs, and a plugin's GUI reaches every window only when it is configured globally.
- For development: Bun 1.x.

## Platforms

Windows, macOS and Linux. The plugin has no native code: the server part is one `fetch` plus the
app's APIs, and the GUI is a single JavaScript bundle the app loads.

| Platform | Status |
| --- | --- |
| Windows | developed and verified here: pill, panel, settings page, live feed; CI verifies the build and tests |
| Linux, macOS | CI verifies the build and tests on Ubuntu and macOS; a load in the desktop app is not yet verified |

Notes:

- The global config lives at `~/.config/opencode/opencode.json(c)` (or
  `$XDG_CONFIG_HOME/opencode/opencode.json(c)`) on every platform.
- Linux needs a colour emoji font (Noto Color Emoji is standard on desktop distributions) for the
  default marks. Without one, set `lights` to text, for example
  `{"operational":"OK","degraded":"WARN","outage":"DOWN","unknown":"?","stale":"?"}`.
- Notifications follow the app's notification settings and need a notification daemon on Linux.

## Install

Add it to the **global** config, with the command or by editing the file:

```sh
opencode plugin add opencode-status-plugin
```

```jsonc
// ~/.config/opencode/opencode.jsonc
{
  "plugins": ["opencode-status-plugin"],
}
```

The CLI reads the same global entry. No `cli.json` change is needed for this package because it has a
server part; `cli.json` is for packages with only a TUI part.

For local development, point your **global** config at this folder:

```jsonc
// ~/.config/opencode/opencode.jsonc
{
  "plugins": [{ "package": "C:/path/to/OpenCodeStatusPlugin", "options": { "services": ["go"] } }],
}
```

List the plugin in one place only. A second entry in the project config loads another instance with
the same id, and the desktop app reports the plugin as failed.

## Update

A configured plugin does not update itself. OpenCode checks unpinned npm plugins when its server
starts, but it keeps the installed version until you ask it to update:

```sh
opencode plugin check                            # is anything outdated?
opencode plugin update                           # every outdated package plugin
opencode plugin update opencode-status-plugin    # just this one
opencode plugin list                             # what is installed
```

An entry pinned to an exact version (`"opencode-status-plugin@0.1.0"`) is skipped by both commands:
drop the version, or run `opencode plugin add opencode-status-plugin@0.2.0`. A local path is never
updated by the CLI, because you edit that directory yourself.

Plugin changes reload without a restart. If the server part still reports the old version, restart
the shared service and check it:

```sh
opencode service restart
opencode service status
```

In Desktop, **Settings → Extensions → Plugins** shows the installed version, and its **Reload** button
loads a plugin again after a failed start. The per-plugin switch there only hides the desktop UI; to
turn the plugin off entirely, add `"-provider-status"` to `plugins`.

## Configuration

Options are passed in the plugin entry. OpenCode reloads the plugin when they change.

| Option | Default | Meaning |
| --- | --- | --- |
| `services` | `["go"]` | Services to watch: `console`, `logs`, `inference`, `go`, `payg`, `free`. Unknown names are dropped; an empty result falls back to `go`. |
| `models` | `"all"` | `"all"`, or an array of model ids to watch within the selected services. `[]` means `"all"`. |
| `showSpeed` | `true` | Show median time to first token and tokens per second in the panel. |
| `showIncidents` | `true` | Show ongoing incidents and their latest update. |
| `showHistory` | `true` | Show the 7-day history strip in the panel. |
| `intervalSeconds` | `60` | Poll interval, clamped to 30–3600 seconds. The origin caches for 15 seconds, so faster buys nothing. |
| `staleAfterSeconds` | `180` | Age at which a snapshot is stale, clamped to at least the poll interval. |
| `notify` | `"off"` | `"off"`, `"degraded"` or `"outage"`: a system notification when the watched scope reaches that state. |
| `tuiHomeFooter` | `true` | Show the status mark in the CLI home footer. |
| `tuiPromptFooter` | `true` | Show it in the session prompt footer as well. |
| `tuiNotify` | `"off"` | `"off"`, `"degraded"` or `"outage"`: a terminal notification for the watched scope. Separate from `notify`. |
| `apiUrl` | the official endpoint | Override for testing against a mirror. HTTPS only, or plain HTTP on `localhost`/`127.0.0.1`. |
| `lights` | `{"operational": "🟢",`<br>`"degraded": "🟡",`<br>`"outage": "🔴",`<br>`"unknown": "❔️",`<br>`"stale": "❔️"}` | The mark the pill shows for each state. Any text or symbol works; `stale` covers old data. |

```jsonc
{
  "plugins": [
    {
      "package": "opencode-status-plugin",
      "options": {
        "services": ["go", "inference"],
        "models": ["deepseek-v4.1-flash", "glm-5.3-flash"],
        "showSpeed": true,
        "notify": "outage",
        "tuiPromptFooter": true,
        "tuiNotify": "degraded",
        "lights": { "degraded": "WARN", "outage": "DOWN" }
      }
    }
  ],
}
```

**Settings → Extensions → Provider status** edits the same scope, switches and pill marks per app,
and takes precedence over the options. The settings store holds overrides only: a field you never
touched stays absent, so a changed option still applies. At least one service and one model always
stay watched.

Notifications are opt-in. They are limited to the watched scope, and the app deduplicates them by
event id, so several open windows notify once.

The CLI reads the plugin options only. Its footer placement and notification level are not part of
the desktop settings store; set `tuiHomeFooter`, `tuiPromptFooter` and `tuiNotify` in the plugin
entry. The CLI copy is English-only in this version.

The CLI has two footer slots: `home.footer.status` on the start screen, and `prompt.footer.status`
inside a session. If OpenCode restores a session on launch, you are not on the home screen; close
its tab (`Ctrl+X`, then `W`) to get back to home. Both slots show the same `[Go] 🟢` mark once the
first status read has answered.

## How it works

```text
status.opencode.ai/api/status
        │  poll + validate + cache (server part, one per OpenCode server)
        ▼
   RPC `provider-status`: snapshot, refresh, changed
        │
        ├── GUI (window)   ──  composer pill, side panel, settings page, command
        └── TUI (terminal) ──  footer mark, /provider-status service and model list
```

- `src/index.ts` — server part: the poller, the last-good cache, the RPC registration and the
  `changed` event.
- `src/rpc.ts` — the RPC contract (`opencode-status-plugin/rpc`), shared by both sides.
- `src/gui.tsx` — the `./gui-experimental` entry.
- `src/gui/` — window setup, pill, panel, settings page, store and the panel styles.
- `src/tui.tsx` — the `./tui` entry.
- `src/tui/` — CLI controller, footer mark, detail dialogs, notifications and copy.
- `src/copy.ts` — translator-based labels shared by the GUI and the CLI.
- `src/status/` — the status domain: types, fetch, parsing, watched-scope selectors, formatting and
  the shared severity mark.

Facts the code keeps:

- **The server caches a bounded snapshot, the window applies the scope.** The settings page changes
  the watched scope without reloading the server, so the server cannot be the only place that knows
  it. The cache keeps every service in the feed, the ongoing incidents and 56 history buckets; the
  window narrows that to the scope it reads from the store and the options, through the same selector
  on both sides.
- **The payload is untrusted.** Unknown states, unknown reasons, missing fields and non-numeric
  speeds degrade to `unknown` or to no value. A response that does not look like a status document
  keeps the previous cache and marks the view stale.
- **Neither surface has a timer.** The window reads the cache when a session is routed, on every
  `changed` event (one per successful poll, so a window that missed a transition still catches up),
  and when the panel is focused. The CLI reads on setup, on every `changed` event, and when its
  refresh command runs. A refresh asks the server to poll; the poller coalesces a burst of clicks.
- **The origin's model list is `breakdown[]`.** `models[]` exists but is empty; both are read so a
  change upstream does not blank the panel.

## Development

```sh
bun install          # creates bun.lock; commit it
bun run typecheck
bun test
bun run build        # emits dist/gui-experimental.cjs
bun run dev          # vite build --watch: rebuilds and reloads the GUI on every change
```

Load the plugin from this folder in a global config (see Install), then open **Settings →
Extensions → Plugins** and check that it loaded. The server part does not hot-reload; the GUI does.

The bundle is one CommonJS file built with the `gui()` preset. Modules the app provides — `effect`,
`solid-js`, `@opencode/plugin/gui` and the rest — stay external, and the app's own components come
from `ctx.ui`.

The TUI part is loaded from `./src/tui.tsx`; it has no separate bundle. Run `opencode` with the
plugin in the global config to see the footer and `/provider-status`.

### Live API check

`bun run check:api` fetches the live endpoint and passes the response through the same
`fetchStatus` → `parsePayload` → `scopeStatus` path the server uses. It reports contract drift and
exits:

- `0` when the shape holds, or when the endpoint or the network is unreachable (inconclusive),
- `1` only when the endpoint answers with a payload that no longer matches the contract.

A scheduled **API contract** workflow runs it daily and on demand. It is deliberately separate from
pull request CI: a status outage or a GitHub network problem must never block a change.

## Releasing

The version lives in `package.json` and must be bumped for every publish, because npm refuses a
duplicate version. Notes go in `CHANGELOG.md`; the full runbook is
[`docs/releasing.md`](https://github.com/hamster007Github/OpenCodeStatusPlugin/blob/main/docs/releasing.md).

```sh
bun run typecheck && bun test && bun run build && bun run check:api
bun pm pack --dry-run      # the tarball: src, dist, README, LICENSE, CHANGELOG
```

Publishing needs npm ≥ 11.15 and Node ≥ 22.14. The maintainer account uses a security key as its
second factor, so a release goes through `npm stage publish` and an approval in the browser instead of
a terminal one-time password; later releases run in the manual **Publish** workflow with npm Trusted
Publishing (OIDC). Both paths, the trusted-publisher setup, the tarball smoke test and the
post-publish checks are in [`docs/releasing.md`](https://github.com/hamster007Github/OpenCodeStatusPlugin/blob/main/docs/releasing.md).

## Not yet verified

- [ ] A load in OpenCode Desktop on Linux or macOS
- [ ] A load of the TUI part in the OpenCode CLI
- [ ] A load of the published npm package in OpenCode, on any platform

## Contributing

Issues and pull requests are welcome. Keep the payload handling defensive, keep the pill compact,
and run `bun run typecheck` and `bun test` before opening a pull request. See
[CONTRIBUTING.md](https://github.com/hamster007Github/OpenCodeStatusPlugin/blob/main/CONTRIBUTING.md),
[SECURITY.md](https://github.com/hamster007Github/OpenCodeStatusPlugin/blob/main/SECURITY.md) and
[CODE_OF_CONDUCT.md](https://github.com/hamster007Github/OpenCodeStatusPlugin/blob/main/CODE_OF_CONDUCT.md).
The feed contract is in
[`docs/status-feed.md`](https://github.com/hamster007Github/OpenCodeStatusPlugin/blob/main/docs/status-feed.md),
the release runbook in
[`docs/releasing.md`](https://github.com/hamster007Github/OpenCodeStatusPlugin/blob/main/docs/releasing.md).

## License

MIT — see [LICENSE](https://github.com/hamster007Github/OpenCodeStatusPlugin/blob/main/LICENSE).
