# opencode-9router

OpenCode V2 plugin for [9Router](https://github.com/decolua/9router) — **usage by provider in
the session sidebar** and a **model picker with per-model thinking levels**, right inside the
terminal UI.

```
 9Router Usage  ●
 today · $4.20 · 18 req · 96k tok
 Kiro AI       ▰▰▰▰▰▰▰▱  62k tok $1.42
 Inferhub      ▰▰▰▰▱▱▱▱  21k tok $0.98
 OpenCode Free ▰▰▱▱▱▱▱▱   9k tok $0
 ● 1 running
```

opencode-9router is a **two-part plugin**:

- **Server part** (`.`) — registers the `9router` provider and injects every routed model with
  capabilities, token limits, and **thinking variants aligned to what each model actually
  serves** (Claude 4.6 has no `xhigh`, Gemini 4 has no `minimal`, `zai` GLM is on/off only,
  kimi is `none→max`, deepseek clamps, …). Refreshes live; keeps the last good inventory when
  the router is unreachable.
- **TUI part** (`./tui`) — the visible half: sidebar usage section, `/9router` model picker,
  `/9usage` period switcher, live "running" indicator, toasts.

## Install

```bash
opencode plugin add opencode-9router
```

Then edit your global config — `~/.config/opencode/opencode.jsonc` — to point it at your
9Router (replace the string entry with an object and fill in your values):

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [{
    "package": "opencode-9router",
    "options": {
      "baseURL": "http://localhost:20128",        // your 9Router URL
      "apiKey": "sk-your-router-api-key",          // from the 9Router dashboard
      "password": "your-dashboard-password"        // optional — see below
    }
  }]
}
```

Restart OpenCode (TUI-side features need a full restart, not just `/reload`). Until `baseURL`
is set, the sidebar shows setup guidance and the plugin stays inert — nothing is guessed.

**Development (from a clone):**

```bash
git clone https://github.com/mrrobot1o1/opencode-9router.git
```

```jsonc
{
  "plugins": [{
    "package": "/absolute/path/to/opencode-9router",   // the config does not expand ~
    "options": { "baseURL": "http://localhost:20128", "apiKey": "sk-…" }
  }]
}
```

Environment: `OPENCODE_9ROUTER_URL` and `OPENCODE_9ROUTER_API_KEY` work as fallbacks for
`baseURL`/`apiKey`. A `baseURL` (option or env) is **required**: the plugin never guesses —
no localhost fallback, no local-install assumptions. Unconfigured, it stays inert.

### Options

| option | default | effect |
| --- | --- | --- |
| `baseURL` | — (required) | 9Router base URL, e.g. `https://your-router` or `http://localhost:20128` |
| `apiKey` | — | router API key (for `/v1/*`) |
| `password` | — | optional dashboard password — the official `9router connect` flow (see below) |
| `timeoutMs` | `30000` | fetch timeout |
| `connectedOnly` | `"auto"` | show only providers with **active connections** (see below) |
| `thinkingOverrides` | `[]` | per-model level corrections (see below) |

## Only connected providers

A router with zero connections serves the **whole static catalog** from `/v1/models` — models
that can't actually serve requests. (With a healthy connection list, 9Router already gates
`/v1/models` to connected providers + free lanes + combos — there, an alias appearing at all
means it's active.)

With `connectedOnly: "auto"` (default) the plugin additionally fetches the router's connection
list (`GET /api/providers`) and registers **only models whose provider has an active
connection**, plus the always-on free lanes (`oc`, `ollama`) and combos. Custom compatible
providers are matched by their configured prefix.

- works out of the box on routers that serve `/api/*` unauthenticated (local installs with
  login disabled)
- list unreachable → **fail-open**: full inventory, unchanged behavior
- `false` disables filtering entirely

### Optional: dashboard password (hosted routers)

Hosted routers guard `/api/*` behind the dashboard session. When you add a `password` option,
the plugin uses the **official remote flow** — the same one `npx 9router connect` uses:
`POST /api/auth/login` → session cookie → read-only `/api/providers` + usage. This enables the
connected-providers filter **and** router-wide usage stats on hosted instances. The session
cookie lives in memory only, is bound to the configured baseURL, never logged, and is
re-established automatically when it expires. A rejected login fails open (full list) with a
warning, exactly like an unreachable list. Without a password, nothing changes.

```jsonc
{
  "package": "opencode-9router",
  "options": {
    "baseURL": "https://your-router.example",
    "apiKey": "sk-…",
    "password": "your-dashboard-password"
  }
}
```

The plugin uses only the public surface: your API key on `/v1/*`, and `/api/*` when the router
itself permits it. No `~/.9router` file reads, no pasted session JWTs — undocumented coupling
is not an integration path. (Wish-list for 9Router upstream: expose connection state on a
public endpoint so every client can filter without credentials.)

```jsonc
{
  "package": "opencode-9router",
  "options": {
    "baseURL": "https://your-router.example",
    "apiKey": "sk-…",
    "connectedOnly": "auto"
  }
}
```

Restart OpenCode, then:

- pick any `9router/…` model in the model switcher (they are registered automatically), or use **`/9router`**
- watch the sidebar for **9Router Usage**
- `/9usage` switches the usage period (today / 24h / 7d / 30d / 60d / all)

## Provider names — dynamic, never hardcoded

Categories, model names, and usage rows show real provider names resolved from the router
itself: `GET /api/usage/providers` (the router's own id → name resolution), connection records
(custom gateways use their **node name** — the name you gave the provider, e.g. `inf` →
"Inferhub" — then the connection label), bridged to model-id aliases via the registry alias
map. Names with quotes, `!`, `&`, unicode, or `//` are handled everywhere, and control
characters (ANSI escapes) are stripped before anything reaches the terminal. When the lists
are unreachable, keys pass through as-is — nothing is invented.

The usage bar is **scoped to 9Router**: the session fallback counts only `9router` models,
and the plugin never touches providers you configured yourself — every registration write
targets the `9router` provider id only.

## Never in the request path

The plugin is a **registrar, not a proxy**. It registers the `9router` provider (baseURL +
apiKey) once, and OpenCode's own HTTP client makes every chat request **directly** to your
router. The plugin never proxies, intercepts, throttles, times out, or closes anything on the
AI path — nothing it does can stop a running generation.

All plugin timeouts (`timeoutMs`, the 60s catalog refresh) apply only to its **own background
fetches** (model catalog, connection list, usage stats). Those fail open: an unreachable router
keeps the last known inventory and your session keeps working.

## Usage panel

Primary source is 9Router's own dashboard API (`/api/usage/stats` + live SSE stream) — so, when
the router serves it, the panel shows **all tools** routed through 9Router (Claude Code, Codex,
Cursor, …), not just OpenCode.

If the dashboard API is unreachable (e.g. a hosted router that guards `/api/*` behind login),
the panel falls back to the current session's own usage, labeled `9Router Usage ○ session`.

## Thinking levels, aligned — no hardcoded model tables

OpenCode's variant picker should only ever offer levels the model actually serves, but
9Router doesn't publish resolved level lists over HTTP. opencode-9router derives them **from the
capability data `/v1/models` already emits** (`reasoning`, `thinkingFormat`,
`thinkingCanDisable`, `thinkingEffortSupported`) — no model names hardcoded in the plugin:

- a model-independent `thinkingFormat → level set` table carries the router's wire contract
  (`openai` → none…xhigh, `claude-budget`/`claude-adaptive` → none…max, `kimi` → none…max,
  `zai` → on/off, …)
- effort-capable `zai` models (GLM-5.2/5.3) get the exact wire set `low | high | max`
- `thinkingCanDisable: false` removes the `none` entry

Verified against 9Router's own resolver over a full live inventory: identical on ~86% of
models; the residuals are gateway catalog quirks that degrade gracefully — an over-advertised
level surfaces OpenCode's clean *"Variant unavailable"* error, never a crash.

**Opt-in corrections.** If a specific model's published capabilities diverge from its wire
behavior, correct it in your config — not in plugin code:

```jsonc
"thinkingOverrides": [
  { "pattern": "*gemini-4*", "levels": ["low", "medium", "high"] }
]
```

`provider` (optional) scopes an entry to one 9Router alias; `pattern` is a `*`-glob on the
model id, first match wins. When a future 9Router publishes fully-resolved levels
(`capabilities.thinkingLevels`), the plugin prefers that field automatically and needs no update.

`/9router` → pick a model → pick a thinking level from **only the levels that model serves** →
the session switches live. Variants are registered up-front by the server part, so a
selection can never produce an unknown-variant failure on the next prompt.

## Development

```sh
git clone https://github.com/mrrobot1o1/opencode-9router.git
cd opencode-9router
npm install
npm run check          # typecheck
npm run mock           # mock 9router on :20128 (mutating stats, SSE, guarded /api)
```

Point a local OpenCode at the clone (see the development snippet under Install), restart the
TUI, and `/9router` lists the mock inventory. `OPENCODE_9ROUTER_DEBUG=<file>` appends diagnostics
from both parts — plugin console output is invisible in `--print-logs`.

Hosted routers: the same `baseURL`/`apiKey` work for `/v1/*`; add `password` (dashboard
password, the official `npx 9router connect` flow) to unlock `/api/*` — connected-providers
filtering and router-wide usage stats.

## Architecture

```
src/
  index.ts            server part: Plugin.define → provider/model transforms + refresh loop
  server/
    register.ts       /v1/models → Model.Info (caps, limits, variants, names)
    alias.ts          alias → 9Router provider id (scopes thinkingOverrides)
  tui.tsx             TUI part: sidebar slot + commands
  tui/
    store.ts          usage store (period fetch + SSE, persisted prefs, manual reconnect)
    sidebar.tsx       "9Router Usage" sidebar section (+ session fallback, crash boundary)
    picker.tsx        /9router model + thinking-level dialogs → session.switchModel
    config-source.ts  TUI options self-serve (the relay drops options → read config from disk)
    debug.ts          OPENCODE_9ROUTER_DEBUG file sink
  shared/
    router.ts         9Router client (/v1 + /api, optional dashboard login, SSE)
    levels.ts         capability-driven thinking-level resolver (+ user overrides)
    display.ts        dynamic provider names, token/cost formatting
    provider-aliases.ts  provider id → output alias (registry-derived wire vocabulary)
```

## Planned

- Add-provider dialog (`POST /api/providers` for key/free providers; OAuth → dashboard deep-link)
- Fullscreen usage dashboard (`session.panel`): byModel / byAccount tables
- Model detail view: context window, cost, capabilities

## License

MIT
