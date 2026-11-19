# OpenCode Go Usage (Desktop GUI)

![Side panel: Go plan limits, a daily token chart with a hover tooltip, totals and per-model requests](docs/usage-panel.png)

<sub>Side panel · rendered from fixed sample data, not a live account.</sub>

**OpenCode Go usage and plan limits, in a real OpenCode Desktop side panel.** The limits card,
the daily Console chart, totals, per-model requests and a tab-strip ring, all read from the same
Console data the OpenCode website shows. No local database, no session scanner, no AI tools.

This is a fork of [`slkiser/opencode-quota`](https://github.com/slkiser/opencode-quota) (MIT),
rewritten as a Desktop-only, API-only plugin. It is not the `opencode-usage` CLI and not a
local session/TPS dashboard; see [How it differs](#how-it-differs).

> **Status:** `0.1.0`, first public release. The Desktop GUI plugin API is still experimental
> (`./gui-experimental`), so keep Desktop and the plugin in step.

## Features

- **Usage tab** in a session's side panel, laid out like the OpenCode Console's usage screen:
  a **Limits** card (Rolling 5h / Weekly / Monthly, with percent, reset time and a bar that turns
  amber then red), a green daily line chart with a hover tooltip (date, tokens, requests, cost),
  then equal-width cards for the window's **Totals** (tokens, requests, cost) and the plan's
  **Models** (share by requests). Ranges: today / 7d / 30d / month / plan.
- **Account picker** when OpenCode stores more than one Go account. A Console sign-in and one or
  more Go API keys that resolve to the same Console subscriber are shown as **one row** with both
  methods; picking it reads that account's plan and usage. Only a Console sign-in can read usage
  history; a Go API key reads limits alone, so the cards say so for a key-only account.
- **Limits chip** at the end of the side panel's tab strip, beside the new-tab **+**: a small
  progress ring for the 5-hour, weekly or monthly window you choose, plus a short label. Rest the
  pointer on it to see all three windows for **every** account that has a Go plan; click it to
  open the tab.
- **Command** “Open usage” in the command palette, and `/usage` in the composer.
- **Settings page** (Settings → Usage): turn each surface on or off, pick the range the tab
  opens with, pick the window the chip measures, and read where the numbers come from.
- **Loading states** instead of empty cards: the tab shows a spinner while accounts and limits
  are read, and the chip spins until its first answer. Refreshes keep the last numbers visible.
- **Responsive** inside Desktop: one-column cards under 480 px, an even 50/50 grid at and above
  480 px, a shorter chart on narrow widths, and a narrow-screen menu view for the Usage tab.

## Screenshots

**Limits chip** — the progress ring in the tab strip. Hovering lists every account with a Go
plan, with all three windows.

![Limits chip with its hover list of Go accounts](docs/usage-chip.png)

**Settings** — surfaces, the default range, and which window the chip measures.

![Usage settings page](docs/usage-settings.png)

The side panel is the image at the top of this page. All screenshots are rendered from fixed
sample data by `pnpm preview`, not from live accounts.

## Requirements

- **OpenCode Desktop** with GUI plugin support (`./gui-experimental`). Built against
  `@opencode/plugin` 2.3.2. If **Settings → Extensions → Plugins** does not list the plugin,
  update Desktop first.
- An **OpenCode Go** plan and an account OpenCode already stores.
- A **Console sign-in** for usage history. A Go API key can show limits only, because the
  Console's activity endpoint needs the Console session.
- **Desktop only.** The separate OpenCode web/mobile client does not load GUI plugin bundles.
  Desktop's own narrow layout still shows the panel, and Desktop sessions can use a remote server
  as long as that server loads the plugin.

The package installs **no runtime dependencies**: the server part has none, and the window bundle
uses the Solid and Effect instances the Desktop app already provides.

## Install

One command. It installs into your **global** OpenCode setup, so every window has it, and needs
no `opencode.json` edit.

### npm

```sh
opencode plugin add opencode-usage-gui
```

The package is published with a signed provenance statement and installs no runtime dependencies.

### GitHub release, no npm account

**Windows** (PowerShell):

```powershell
irm https://github.com/nguyenhoanhson797/opencode-usage-gui/releases/latest/download/install.ps1 | iex
```

**macOS, Linux, WSL**:

```sh
curl -fsSL https://github.com/nguyenhoanhson797/opencode-usage-gui/releases/latest/download/install.sh | sh
```

The script downloads the same build into `~/.config/opencode/plugins/opencode-usage-gui`, which
OpenCode loads automatically. If Windows says a file is in use, close Desktop and run it again.

### After installing

Open OpenCode Desktop. **Settings → Extensions → Plugins** lists `usage-desktop` with its switch
on. If you previously added the plugin to `opencode.json` by hand, remove that entry so it does
not load twice.

| Task | Command |
| --- | --- |
| Update | Run the same install command again. |
| Check | `opencode plugin list` |
| Update from npm | `opencode plugin update opencode-usage-gui` |
| Uninstall | `opencode plugin remove opencode-usage-gui`, or delete the plugin folder. |

### Manual npm entry

If you would rather edit the global config yourself, `~/.config/opencode/opencode.json(c)`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-usage-gui"]
}
```

### From a checkout (unreleased code)

The repository does not commit the built `dist/` folder, so a Git install needs a local build.
Clone, install, build once, then point the global config at the **directory**:

```sh
git clone https://github.com/nguyenhoanhson797/opencode-usage-gui.git
cd opencode-usage-gui
pnpm install
pnpm build
```

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["/absolute/path/to/opencode-usage-gui"]
}
```

Restart Desktop afterwards.

### Use

Open a session, then run **Open usage**, type `/usage`, or open the Usage tab from the side
panel's **+** menu. The chip lives beside that **+** button while the Usage tab is enabled.

To disable everything, remove the entry (or prefix its id with `-` in the plugin list).

## Settings

**Settings → Usage** has three groups:

| Setting | What it does |
| --- | --- |
| Usage tab in the side panel | Shows or hides the session tab, the command and the menu item. |
| Limits chip beside the new-tab button | Shows or hides the ring. It still needs the Usage tab enabled. |
| Window the chip shows | Measures Rolling 5h, Weekly or Monthly. The hover list always shows all three. |
| Range the tab opens with | Today, 7d, 30d, month or the whole plan period. |
| Data source / Privacy | A short explanation of the Console endpoints and credential handling. |

Picking an account in the Limits card changes **only what the plugin reads**. It does not change
OpenCode's active credential, so the running session keeps its current provider and model.

## How it differs

Several OpenCode usage packages exist. This one is deliberately narrow:

- **`opencode-usage`** is a CLI that tracks usage and costs from local data. This is a Desktop GUI
  with no local-history scan; numbers come from the Console.
- **`opencode-usage-desktop`** is a Desktop sidebar for local session, TPS and TTFT stats. This
  shows the OpenCode **Go plan** — limits, daily usage, costs and per-model requests.
- **`opencode-go-usage`** is a separate Go quota plugin. Check it if you prefer its surface; this
  repository is an independent Desktop GUI fork of `opencode-quota`.

There is no provider split, session-level usage, TPS/TTFT or local history here, because the
Console's Go endpoints do not expose them.

## Limitations

- **OpenCode Go only.** Other providers are not queried.
- **Daily granularity.** The Console reports one row per plan day. `today` is the latest reported
  day, and `7d` / `30d` are the last 7 / 30 reported days, not wall-clock windows.
- **Console endpoints are internal.** `/api/go/status` and `/api/activity/go` are what the Console
  website uses; they are not a documented public API and can change. The UI degrades to a short
  message if a reply stops matching.
- **Console sign-in needed for history.** A Go API key can read limits only.
- **One account at a time in the tab.** The Limits card reads the selected account. The chip's
  hover list is the all-account comparison.
- **Grouped by subscriber id.** A Console sign-in and the Go API keys that resolve to the same
  Console subscriber are one row. A key whose status route fails falls back to its percent-only
  usage route, so it cannot be matched and may appear separately.
- **Numbers can lag.** Limits are cached for a minute (ten seconds after a failure); usage for a
  minute per account and range. The tab refreshes every five minutes and has a manual refresh
  button.
- **Desktop only.** The separate web/mobile client does not load GUI plugin bundles.

## Privacy and security

| Guarantee | How |
| --- | --- |
| Only OpenCode's endpoints | `GET {console}/api/go/status` for plan limits, with either a Console sign-in or a Go API key; `GET {console}/api/activity/go` for Console history; `https://opencode.ai/zen/go/v1/usage` only as a fallback for a key. Redirects are refused; every call has a 12 s timeout and a 256 KB cap. No other host is contacted. |
| Credentials stay OpenCode's | The token/key is resolved through OpenCode's integration API (`ctx.integration.connection`); the plugin never opens the credential table or auth files and never logs a secret. Error messages have the credential replaced with `[redacted]`. |
| No credential writes | Picking an account changes only what the plugin reads. It never calls `credential.activate` and never changes OpenCode's active credential or the running session. |
| No usage history on disk | The plugin does not open SQLite or auth files. Its only local state is its own UI prefs (surface switches, range, chip window, account pick). |
| No config edits | No `opencode.json`, `settings.jsonc` or export file is written. |
| No AI surface | No model tools, no session/context hooks, no messages posted into the chat. The model cannot call or see the plugin. |
| No self-update | The plugin never downloads or executes code. Updates are `opencode plugin update` (or your package manager), run by you. |
| Local-only preview | `pnpm preview` writes `preview/*.html` from fixed sample data and never touches the network. |

### Removed from the upstream plugin

The fork drops everything that needs another provider, another host, local history or a
model-callable surface: the ~20-provider quota APIs, direct credential/auth-file reads, SQLite
history, the `models.dev` price download, OpenTelemetry export, maintainer notices rendered in
the UI, `quota_status` tools, `/quota*` prompts, session hooks, `npx …@latest` self-update, config
injection, and the TUI/CLI parts.

## How the numbers are counted

- The Console reports OpenCode Go usage per plan day: tokens, requests and cost.
- `today` is the latest reported day; `7d` / `30d` are the last 7 / 30 reported days; `month` is
  the calendar month of the latest day; `plan` is the whole period the Console reports.
- Totals are the sum of the days in the window.
- Models are the Console's per-model request counts for the whole plan period; shares are by
  requests because that is what the API reports.
- Cost is the Console's own figure in micro-cents ($1 = 100,000,000), shown as USD.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Plugin is not under Settings → Extensions → Plugins | Check the global folder `~/.config/opencode/plugins/opencode-usage-gui`, or the global `opencode.json(c)`. Run `opencode plugin list`. Desktop lists plugins when its own server is selected. |
| `opencode` is not recognized (Windows) | Desktop ships the CLI inside the app: `%LOCALAPPDATA%\Programs\@opencode-aidesktop\resources\opencode-cli.exe`. Put an `opencode.cmd` shim for it in a folder on your `PATH`, or use the release installer, which needs no CLI. |
| “Sign in to OpenCode Go” | The selected account needs a Console sign-in. Sign in through OpenCode, or pick a Console account in the Limits card. |
| Limits show, history does not | That account is a Go **API key**; history needs a Console sign-in. |
| “This account has no active OpenCode Go plan” | The credential is not subscribed, or the picker is on the wrong account. |
| Empty chart | The Console returned no daily rows for that plan period yet. |
| Chip is missing | Enable both the Usage tab and the chip in Settings → Usage. |
| Numbers feel stale | Wait for the one-minute cache, press the tab's refresh button, or move the pointer over the chip to refresh expired answers. |
| Duplicate-looking accounts in the picker | The plugin groups a Console sign-in and Go API keys that resolve to the same Console subscriber into one row. If two rows remain, they are different subscribers (or a key's status route failed and it could not be matched); remove unused credentials in OpenCode. The selected value plus its highlighted option can also look duplicated. |
| Updated a source checkout, still old | Rebuild, then **restart Desktop** for server changes. Window changes reload on rebuild; the server part loads once per app start. |
| Web/mobile client shows no GUI | GUI bundles are loaded by Desktop, not by the separate web/mobile client. |

## Development

Requires Node.js 22.12+ (Vite 7) and pnpm 11 (the repo pins the package manager).

```sh
pnpm install       # installs dev deps
pnpm typecheck     # tsc --noEmit
pnpm build         # dist/server/*.js + dist/gui-experimental.cjs
pnpm preview       # preview/*.html with fixed sample data, no network
pnpm pack:check    # npm pack --dry-run
```

Notes for contributors:

- `dist/` is generated and ignored by Git. `prepack` typechecks and builds before an npm tarball;
  `pnpm pack:check` shows exactly what npm would ship.
- The window part is a single CommonJS bundle. `gui()` in `scripts/build.mjs` keeps the app's
  modules (Solid, Effect, `@opencode/plugin/gui`) external; do not bundle your own copies.
- The server part loads once per Desktop start. After changing `src/server/**`, restart Desktop;
  window changes reload when the bundle is rebuilt.
- The preview is a styling aid: its markup mirrors the panel, chip and settings components, so update
  it when they change. It uses sample data only.
- To add an RPC: extend `src/types.ts`, add the schema in `src/rpc.ts`, register it in
  `src/server/index.ts`, and call it through `src/gui/data.ts`. Validate every input.
- Keep the privacy table true: no new hosts, no credential logging, no model-callable tools or
  hooks, and no direct credential/auth-file reads.

A quick manual check before a release: typecheck, build, `pnpm pack:check`, install the packed
tarball in a fresh profile, open a Console account, a Go API-key account, an account without Go,
and a second account, then verify the tab, chip hover, range buttons, account picker and refresh.

## Project structure

```text
.github/                  CI, release workflow and issue templates
docs/                     README screenshots (sample data)
install.ps1               one-command installer for Windows
install.sh                one-command installer for macOS and Linux
scripts/build.mjs         tsc for the server + Vite for the window bundle
scripts/preview.mjs       static preview renderer
src/
  rpc.ts                  RPC contract and Standard Schema validation
  types.ts                shapes shared by server and window
  server/
    index.ts              plugin object: one rpc.register
    activity.ts           Console activity: parse, ranges, totals, cache
    quota.ts              Console sign-ins, limits, account grouping
  gui/
    index.tsx             tab, chip, command, menu item, settings page
    panel.tsx             Usage tab and Limits card
    entry.tsx             limits chip and its hover list
    settings.tsx          Settings page
    data.ts               RPC calls held in signals
    format.ts             numbers, dates, reset times
    i18n.ts               English and Vietnamese copy
    style.ts              plugin CSS
```

`dist/` and `preview/` are generated. The npm tarball contains only `dist/`, `docs/`, `README.md`,
`CHANGELOG.md`, `LICENSE` and `package.json`.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Security reports: see [SECURITY.md](SECURITY.md) — please
do not open a public issue with a token, credential id or full Console response.

Changes are listed in [CHANGELOG.md](CHANGELOG.md).

## Licence

MIT. See [LICENSE](LICENSE). Original work © the `opencode-quota` contributors; this fork keeps
the licence and drops what it does not need.

This project is not affiliated with OpenCode, its maintainers, or the upstream `opencode-quota`
maintainers. OpenCode and OpenCode Go are trademarks of their respective owners.
