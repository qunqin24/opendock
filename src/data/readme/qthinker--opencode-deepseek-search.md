# DeepSeek Search for OpenCode V2

[![npm version](https://img.shields.io/npm/v/@qthinker/opencode-deepseek-search)](https://www.npmjs.com/package/@qthinker/opencode-deepseek-search)
[![license](https://img.shields.io/npm/l/@qthinker/opencode-deepseek-search)](./LICENSE)
[![node](https://img.shields.io/node/v/@qthinker/opencode-deepseek-search)](https://nodejs.org)
[![opencode](https://img.shields.io/badge/opencode-%E2%89%A52.2.5-black)](https://opencode.ai)

DeepSeek Search & Fetch as an OpenCode V2 plugin: **the built-in `websearch` tool routes to DeepSeek**, plus a clean
Markdown fetch tool, local usage/cost stats, a **persisted** backend switch, and **TUI + desktop sidebars** that show
the state and the numbers and flip the takeover with one click.

Ways back to native search: the sidebar switch, the `mode` option, or a `deepseek_mode` call.
中文说明见 [docs/README.zh-CN.md](https://github.com/QThinkerJR/opencode-deepseek-search/blob/main/docs/README.zh-CN.md)。

Differs from the existing same-named V1 package: this one targets the **V2 plugin API**, switches backends **at
runtime**, and reports **local usage and estimated cost**.

> Verified against `opencode 2.2.5` with `@opencode/plugin@2.2.5` on Windows. Search/Fetch API facts come from
> <https://api-docs.deepseek.com/zh-cn/guides/search>.

## Requirements

- `opencode >= 2.2.5` (V2 plugin API)
- Node.js `>= 22.18` (the plugin ships TypeScript sources)
- A DeepSeek API key with Search/Fetch access
- For the sidebars: nothing extra — the TUI and the desktop app provide the renderer (`@opentui/*`, `solid-js`) and
  load the plugin's two halves from the same package

## Install

Set the key once (Windows, user scope):

```powershell
[Environment]::SetEnvironmentVariable("DEEPSEEK_API_KEY", "sk-...", "User")
opencode service restart   # User-scope variables only reach new processes
```

Then add the plugin to `opencode.jsonc`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["@qthinker/opencode-deepseek-search"]
}
```

> **One entry is enough.** A plugin listed in `opencode.json(c)` is enabled for the server **and** for both sidebars:
> the TUI and the desktop load the corresponding half of every active plugin that ships one. Verified: with the plugin
> listed only in the global `~/.config/opencode/opencode.jsonc`, both the TUI card and the desktop panel appear.
> `cli.json` (`"plugins": [...]`) is only for **TUI-only** plugins — packages without a server half, such as
> `opencode-go-usage-tui`. Keep the entry in the **global** `opencode.jsonc` so the desktop shows it in every window.

With options (recommended — this is where `mode` and friends live):

```jsonc
{
  "plugins": [
    {
      "package": "@qthinker/opencode-deepseek-search",
      "options": {
        "mode": "deepseek",
        // "en" | "ja" | "zh-CN"; omit it to follow LC_ALL/LANG, then English
        "language": "en",
        "count": 5,
        "apiKey": "{env:DEEPSEEK_API_KEY}"
      }
    }
  ]
}
```

Local development points at the repository directory (a config entry must be a **directory**, not a file):

```jsonc
{
  "plugins": [
    { "package": "D:/repos/opencode-deepseek-search", "options": { "mode": "deepseek" } }
  ]
}
```

`opencode plugin add <package-or-directory>` does the same edit for you (it writes the **global** config), and
`opencode plugin list` should then show `deepseek-search` with source `local` or the package name.

Reload rules: the **server half** re-runs in place when you save a source file — no `/reload`, no service restart.
The other two halves are clients: restart the **TUI**, and reload the **desktop window**, to pick up a change to
`tui.ts` / `gui-experimental.cjs` (and run `npm run build:gui` first when working from a clone).

## Options

| Option | Type | Default | Meaning |
|---|---|---|---|
| `mode` | `"deepseek" \| "native"` | `deepseek` | Default backend for `websearch`; a persisted `deepseek_mode` switch overrides it |
| `language` | `"en" \| "ja" \| "zh-CN"` | auto | UI language for the sidebars, the desktop panel, `deepseek_*` tool output and errors. Auto reads `LC_ALL`, then `LANG`, then English |
| `apiKey` | string | `DEEPSEEK_API_KEY` | Usually `"{env:DEEPSEEK_API_KEY}"`; unset env becomes `""` |
| `count` | 1–50 | `5` | Results per search (does not change the price) |
| `fetchMaxChars` | 500–200000 | `30000` | Truncation limit for `deepseek_fetch`, with an explicit notice |
| `pricePerThousand` | 0–10000 | `5` | CNY per 1000 requests (integer), used only for the local cost estimate |

**UI languages.** The plugin ships `en`, `ja` and `zh-CN`; English is the default and the fallback. The server resolves
the language once — `options.language`, else the `LC_ALL`/`LANG` prefix (`ja*` → `ja`, `zh*` → `zh-CN`), else English —
and the same value drives the tool output and both sidebars, so they can never disagree. An unknown value logs a
warning and falls back to auto-detection instead of failing. The change reaches the sidebars with their next status
read (saving the config re-runs the server half; a restart always works). Model-facing text stays English in every
language — tool descriptions, the `## [title](url)` result format, `Published:` and the empty-result notice — so the
rerouted `websearch` keeps the built-in tool's shape. Docs stay English and Chinese: the Japanese UI does not add a
Japanese README.

## Tools

| Tool | What it does |
|---|---|
| `websearch` (built-in) | Same name and input; in `deepseek` mode this plugin supplies the results |
| `deepseek_fetch` | One URL in, clean Markdown out, cut at `fetchMaxChars` with a notice |
| `deepseek_usage` | Local search/fetch counts and estimated cost; `reset: true` clears it |
| `deepseek_mode` | Report or switch the search backend; the switch is persisted |

The reroute **keeps the built-in permission check and the declared `output` shape**, so approval prompts and rendering
are unchanged. Results carry `summary` (600–800 chars, written for models) or `snippet` — never the full page text,
and `need_content` is never requested.

## Switching backends

### Ways to switch

| Way | How | Persisted | Use it for |
|---|---|---|---|
| Sidebar | Click the action on the TUI card (English UI: `[Disable]` / `[Enable]`; Chinese UI: `[停用]` / `[启用]`), or the panel's button | Yes (plugin storage `mode/v1`) | While you are working |
| Config | Edit `options.mode`; applies on save | Yes (in the config file) | The long-term default |
| Tool | Ask the model to call `deepseek_mode`, or call it yourself | Yes (plugin storage `mode/v1`) | Switching mid-session without touching files |

`deepseek_mode` actions:

| Call | Effect |
|---|---|
| `deepseek_mode` (or `{"mode": "status"}`) | Report the current backend **and where it comes from** (config file / persisted switch) |
| `deepseek_mode({"mode": "deepseek"})` | Route the built-in `websearch` tool to DeepSeek |
| `deepseek_mode({"mode": "native"})` | Leave the built-in backend alone again |
| `deepseek_mode({"mode": "config"})` | Clear the persisted switch so `options.mode` decides again |

### Precedence

```
deepseek_mode switch (storage: mode/v1)  >  options.mode  >  built-in default
```

- The switch lives in OpenCode's local plugin storage (`mode/v1`) — **global to the installation and persisted across
  restarts** — and it never modifies your config file.
- Because it wins over the config file, an edit that "does nothing" means a stored switch is present: ask
  `deepseek_mode` (it names the source), then clear it with `mode: "config"`.
- The provider is registered in both modes, so the worst case at any step is "keep the previous backend" — never
  "no search available".

### What native mode still gives you

`websearch` is left completely alone and serves your existing backend. `deepseek_fetch`, `deepseek_usage` and
`deepseek_mode` remain registered (they are additive), and the provider is still registered, so you can select it
explicitly with `providerID: "deepseek"` or config `"websearch": { "provider": "deepseek" }`.

> Why the tool is rerouted instead of relying on a provider default: in 2.2.5, a plugin's `websearch.default.set()` is
> overwritten by the built-in config plugin registered later, so the tool keeps using the built-in provider. The plugin
> therefore patches the built-in tool itself; the built-in permission check is kept, while the "choose a search
> provider" form never appears in deepseek mode. If a version does not expose that tool, `deepseek_mode` says it cannot
> switch at runtime — use `websearch.provider` in the config instead.

## TUI and desktop sidebars

The plugin also shows up where you work, and can be switched without the model or the config file:

| Surface | What you get | How to switch |
|---|---|---|
| TUI | A DeepSeek block appended to the session sidebar: state, then Today / Month / Total rows (`Search` · `Fetch` · `¥` estimate) in the resolved UI language; it degrades to abbreviations and then to fewer columns as the sidebar narrows | Click the action at the right of the title, or run the `/deepseek` slash command for a menu |
| Desktop | A **DeepSeek** tab in a session's side region, listed in the side region's *New tab* page and its `+` menu, and openable with the `DeepSeek: Open usage panel` command (localized) | The panel's button, plus a refresh control |

- Both surfaces read the same ledger and the same stored switch as `deepseek_usage` / `deepseek_mode`: a single
  server-side source, reached over the plugin's own RPC, so the numbers never diverge between TUI and desktop.
- **"Stop" means hand the built-in `websearch` back to your configured backend** (exactly `deepseek_mode({"mode": "native"})`).
  It is not an uninstall: `deepseek_fetch`, `deepseek_usage` and `deepseek_mode` stay registered, and the state is
  persisted in `mode/v1` like any other switch.
- The action row always says what a click does. When no API key is configured there is no action to take, so it shows
  the fix instead (`DEEPSEEK_API_KEY`); when the built-in tool could not be patched it reports *not taken over* rather
  than pretending to be enabled.
- Stats refresh on a `changed` event emitted after every tally and every switch, with a 10-second reread as a
  fallback in both surfaces.

The desktop half ships as a prebuilt CommonJS bundle (`gui-experimental.cjs`). Published packages include it; if you
run the plugin from a clone, build it once — the TUI half needs no build and loads from TypeScript like the server half:

```bash
npm install && npm run build:gui
```

## Usage and cost

| Counter | Counted when | Billed |
|---|---|---|
| `search` | HTTP 200 and `results` non-empty | ¥0.005 per request |
| `fetch` | HTTP 200 and body non-empty | ¥0.005 per request |
| `empty` | HTTP 200 with empty results/body | not billed |
| `failed` | network error, or non-200 after one retry | not billed |

Costs accumulate in integer micro-CNY, so repeated additions never drift. `count` does not affect the price.
`deepseek_usage({ "reset": true })` clears the ledger after reporting.

- Stored under `ctx.storage` key `usage/v1`, last 60 days kept, day keys in local time.
- Storage is global to the OpenCode installation and survives restarts.
- **Local stats ≠ your DeepSeek bill**: only this machine, this plugin. Other tools and machines are not counted,
  and concurrent OpenCode servers can lose a count (last write wins).

## Rate limits and cost

Search 100 QPS / Fetch 25 QPS per account (Fetch is also limited per target domain). A single request costs
¥0.005. A single retry backs off on 408/429/5xx only, honors `Retry-After` (capped at 5s), and is cancellable.

## Privacy

Queries and URLs are sent to `https://api.deepseek.com`. Nothing else leaves your machine; the usage ledger and the
mode switch stay in local OpenCode storage. The API key is never logged.

Search results and fetched pages are **third-party text**: treat them as data, never as instructions — a page can
contain text that tries to steer the model.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Unsure which backend search uses | Call `deepseek_mode` — it reports the backend **and** its source |
| Config edit seems ignored | A persisted switch is present (the source says so); clear it with `deepseek_mode({"mode": "config"})` |
| `未配置 DeepSeek API Key` (zh-CN UI; `API key missing` elsewhere) | Set `DEEPSEEK_API_KEY`, restart the OpenCode service once so the new process inherits it |
| `401` invalid key | Check the key and that `apiKey`/env points at it |
| `402` insufficient balance | Top up; failed requests are not billed |
| `429` rate limited | Backed off once already; retry later |
| `403` / `404` on fetch | The site blocks extraction or the page has no readable text; try the built-in `webfetch` |
| Search still hits the native backend | `mode` or the persisted switch is `native`; if both are `deepseek`, the built-in `websearch` tool was not found — use config `"websearch": { "provider": "deepseek" }` |
| TUI sidebar has no DeepSeek card | Check `opencode plugin list`: the card comes from the **active server plugin**, so `opencode.json(c)` is what matters — `cli.json` does not need it. Restart the TUI after installing |
| Desktop has no DeepSeek entry in the *New tab* list | The desktop reads plugins from the **global** `opencode.jsonc`, and its bundle must exist — run `npm run build:gui` when working from a clone, then reload the window |
| Sidebar says `读取失败` (zh-CN UI; `Read failed` elsewhere) | The half cannot reach the RPC: check `opencode plugin list` reports `deepseek-search` as active, then look for `/api/rpc/deepseek-search/status` in `~/.local/share/opencode/log/opencode.log`. A `400 rpc.invalid_input` means a half and the server disagree on the contract — reload that client |

## Local development

```powershell
cd D:\repos\opencode-deepseek-search
npm install
npm run typecheck     # tsc --noEmit, both the server/TUI config and the GUI config
npm test              # node --test, pure functions, zero cost
npm run build:gui     # src/gui -> gui-experimental.cjs (the desktop half's bundle)
node --experimental-strip-types scripts/check-gui-bundle.ts   # bundle shape check, run in CI
npm run smoke         # real API smoke; skipped without DEEPSEEK_API_KEY
npm pack --dry-run    # audit the publish artifacts — run build:gui first, `pack` does not build the bundle
```

Layout:

```
index.ts              # directory-plugin entry, re-exports src/index.ts
tui.ts                # TUI entry, re-exports src/tui/main.ts
src/index.ts          # plugin: options, registration, websearch patch, three tools
src/deepseek.ts       # HTTP core: timeout/cancel, single backoff retry, localized errors, mapping
src/usage.ts          # pure ledger: micro-CNY pricing, 60-day prune, defensive parse, formatting
src/rpc.ts            # RPC contract shared by the server, TUI and desktop halves
src/status-view.ts    # pure view model both sidebars derive their copy from
src/tui/              # TUI half: card element tree + plugin wiring
src/gui/              # desktop half: side panel component + plugin wiring
vite.config.ts        # builds src/gui into the root gui-experimental.cjs bundle
test/*.test.ts        # pure-function tests
scripts/smoke.ts      # real-API smoke (5 steps)
scripts/check-gui-bundle.ts # bundle shape check, run in CI after build:gui
.github/workflows/    # ci (build + typecheck + test + bundle check) / release
```

Two packaging traps (already avoided — do not reintroduce them):

1. A configured local plugin path must be a **directory**; a single file is dropped.
2. Do **not** add `exports` to `package.json`: with `name` + `exports`, OpenCode resolves the directory by package
   name, and when the resolved entrypoint falls outside the directory it is **silently dropped** (no log line,
   it just disappears from `plugin list`).

Both hold for every half of the plugin: `index.ts`, `tui.ts` and `gui-experimental.cjs` sit at the repository root,
which is what both the directory and the installed-package resolution paths find. `test/packaging.test.ts` fails if
`exports` comes back or a root entry stops resolving.

Source edits hot-reload on save; verify with `opencode plugin list` plus one real search.

## License

MIT. Not affiliated with DeepSeek.
