# opencode-usage-report

[![npm version](https://img.shields.io/npm/v/opencode-usage-report)](https://www.npmjs.com/package/opencode-usage-report)
[![CI](https://github.com/kaanchinar/opencode-usage-report/actions/workflows/ci.yml/badge.svg)](https://github.com/kaanchinar/opencode-usage-report/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/npm/l/opencode-usage-report)](./LICENSE)

An [opencode](https://opencode.ai) plugin that shows how much of your inference
subscriptions you have left. It adds a `/usage` command and a `usage_report`
tool covering both the **context window** of the current session and the
**quota windows** (5-hour, weekly, monthly) of your provider plans —
**Kimi Code** (`kimi-code-plan-global` on kimi.ai and `kimi-code-plan-cn` on
kimi.com), **OpenCode Go** (`opencode-go`), **GitHub Copilot**
(`github-copilot`) and **ChatGPT** (`openai`). Results are cached on disk, fall
back to a local estimate when an API is unreachable, and raise background
low-quota toasts in the TUI.

## Features

- `/usage` command and `usage_report` tool for on-demand quota reports, with
  JSON output and single-provider filtering.
- **Context usage panel** (new in 0.4.0) — the exact prompt-token total against
  the model's context window, a cell grid that fills by category, the
  auto-compaction point with live headroom, and session cost.
- TUI sidebar panel with live progress bars, `NN%` usage and reset countdowns
  for every quota window.
- On-disk caching with a configurable TTL, plus an explicit refresh that
  bypasses it.
- Local fallback estimate when a provider API is unreachable and no cache
  exists.
- Low-quota warnings on startup and on `session.idle`.
- Privacy-first: API keys are never logged, cached, or rendered.

## Install

The plugin exposes **two entrypoints** and opencode loads them from two
different config files. Install both for the full experience:

| Config          | Entrypoint    | Provides                                                |
| --------------- | ------------- | ------------------------------------------------------- |
| `opencode.json` | server plugin | `usage_report` tool, low-quota warnings, prompt capture |
| `tui.json`      | TUI plugin    | `/usage` command, sidebar panel                         |

The quickest path is opencode's own installer, which detects both entrypoints
and writes both configs for you:

```sh
opencode plugin opencode-usage-report          # project scope (./.opencode)
opencode plugin -g opencode-usage-report       # global scope
```

Or add the plugin manually to each file and restart opencode:

```jsonc
// opencode.json — server plugin
{
  "plugin": ["opencode-usage-report"],
}
```

```jsonc
// tui.json — TUI plugin
{
  "plugin": ["opencode-usage-report"],
}
```

> **Use the bare package name in both files.** opencode reads the package
> `exports` map itself and resolves `exports["./tui"]` for the TUI and
> `exports["./server"]` (or `main`) for the server. A subpath spec such as
> `opencode-usage-report/tui` is **not** valid and will silently load nothing.
> `opencode plugin opencode-usage-report` prints `Detected server + tui targets`
> when the resolution works.

> **OpenCode 2.x (0.6.0).** Both entrypoints now default-export a dual
> definition. The server entrypoint exports `{ id, setup, server }` — V2 calls
> `setup`, V1 calls `server`. The TUI entrypoint exports `{ id, setup, tui }` —
> V2 calls `setup` (its `keymap.layer` runs from a headless `app`-slot
> component), V1 calls `tui`. OpenCode 2's TUI loader rejects a default export
> without a `setup` function (`Invalid V2 TUI plugin module`); before 0.6.0 the
> TUI module exported only the V1 `tui` shape and failed to load on 2.x.
> OpenCode 1.18.29+ and 2.x both load either entrypoint.

Options can be passed in the tuple form, independently per entrypoint:

```jsonc
{
  "plugin": [["opencode-usage-report", { "thresholdPercent": 75 }]],
}
```

### Local development

Point the configs at the source instead of the published package. Config is read
once at startup and is not hot-reloaded, so restart opencode after every edit:

```jsonc
// opencode.json
{ "plugin": ["file:///abs/path/to/opencode-usage-report/src/index.ts"] }
// tui.json
{ "plugin": ["file:///abs/path/to/opencode-usage-report/src/tui.tsx"] }
```

## Commands

- `/usage` — open the report dialog: the context panel for the current session
  on top, and every configured provider's quota windows below. This is a local
  TUI command, so it costs no model tokens. Requires the TUI plugin. Providers
  whose credential cannot be resolved are skipped in this view.
- `/usage` dialog keys — `esc` close, `r` refresh now, `tab` cycle provider
  scope (all → each provider), `j` toggle the raw JSON view.
- `usage_report` tool — the same report for agents and headless runs. Takes
  `provider` (exact id: `kimi-code-plan-global`, `kimi-code-plan-cn`,
  `opencode-go`, `github-copilot` or `openai`; an unknown id returns an error
  listing the known ids), `json` (raw `ProviderReport[]`) and `refresh` (bypass
  the on-disk cache).

> **Changed in 0.4.0.** `/usage` used to be an LLM-mediated prompt template that
> routed through the model, and it accepted `--json` / `--refresh` / a provider
> id as slash arguments. The TUI command now owns the name, so `/usage` reaches
> no model and those capabilities moved to the dialog keys and the
> `usage_report` tool arguments. Running `/usage --json` is no longer supported.

## Context usage panel

The top of the `/usage` dialog reports how full the model's context window is
for the current session:

```
  Context
  Kimi K2 (High) · 42,318 / 200,000 tokens (21.2%)

  ████████████████████████████  ████████████████████████████████  ████████████  ░░░░░░░░░░░░░░
  ████████████████████████████  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  ░░░░░░░░░░░░░░  ░░░░░░░░░░░░░░
  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  ░░░░░░░░░░░░░░  ░░░░░░░░░░░░░░
  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  ░░░░░░░░░░░░░░  ░░░░░░░░░░░░░░
  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  ░░░░░░░░░░░░░░  ░░░░░░░░░░░░░░
  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  ░░░░░░░░░░░░░░  ░░░░░░░░░░░░░░

  ● User messages      8,204   4.1%      ● System & tools    8,144   4.1%
  ● Agent responses   11,650   5.8%      ● Free space     157,682  78.8%
  ● Reasoning          2,140   1.1%
  ● Tool calls        12,180   6.1%

  Auto-compacts at 180,000 · 137,682 headroom        $0.42 spent
```

**What is exact.** The headline total, the percentage, free space, the
compaction point, the cost and the number of pruned tool outputs all come from
numbers the provider and opencode report. The total is the prompt size —
`input + cache.read + cache.write` — which is what actually occupies the context
window. opencode's own sidebar Context block sums five fields including the
completion, so it reads slightly higher than this panel by design.

**What is estimated.** The per-category rows. opencode records no token count
per message or part, so each category is estimated with the same `characters / 4`
heuristic opencode itself uses, then normalized so the rows agree with the exact
total.

**System & tools.** opencode assembles the system prompt and tool definitions on
every request and never persists them. The server plugin measures the real
system string through the `experimental.chat.system.transform` hook and stores
only its size, so the row can be split into `system prompt` and
`tools & framing`. That hook is undocumented, so it is treated as best-effort:
if it stops firing, the sidecar goes stale, or anything fails to validate, the
panel falls back to the derived residual and labels the row `(derived)`. The
plugin never breaks a request over it.

**Compaction headroom.** `Auto-compacts at N` mirrors opencode's own overflow
check, including the configured `compaction.reserved` buffer. This is the point
at which opencode automatically summarizes the session — a number opencode
exposes nowhere else.

## Options

Shared by both entrypoints:

| Option             | Type               | Default | Meaning                                                      |
| ------------------ | ------------------ | ------- | ------------------------------------------------------------ |
| `thresholdPercent` | `number`           | `80`    | Warn when a window is at/above this percent used.            |
| `cacheTtlSeconds`  | `number`           | `120`   | How long a cached API result is considered fresh.            |
| `providers`        | `string[] \| null` | `null`  | Providers to report; `null` = every registered adapter.      |
| `fallback`         | `boolean`          | `true`  | Use a local estimate when the API fails and no cache exists. |

TUI only:

| Option                   | Type     | Default | Meaning                                            |
| ------------------------ | -------- | ------- | -------------------------------------------------- |
| `refreshIntervalSeconds` | `number` | `60`    | Sidebar/dialog refresh cadence, clamped to 5–3600. |
| `barWidth`               | `number` | `14`    | Progress-bar width in cells, clamped to 4–40.      |

`fallback` is fixed at `true` for the TUI entrypoint. Malformed option values
are ignored and the defaults are kept.

## Warnings

On startup and again on `session.idle` (both throttled to at most once every
10 minutes, sharing one timer), the plugin checks the cached reports. Any window
at or above `thresholdPercent`, or whose status is `rate-limited` / `frozen`,
produces a TUI toast. A warning fires once per window until that window resets;
it re-arms after usage drops below `thresholdPercent - 10`. Toast failures
(headless/server mode) are swallowed.

## Data sources & privacy

- **Credential resolution order.** First `OPENCODE_USAGE_<ID>_KEY` (optionally
  paired with `OPENCODE_USAGE_<ID>_ACCOUNT_ID`, e.g.
  `OPENCODE_USAGE_OPENAI_ACCOUNT_ID`, to supply the ChatGPT account id), then
  `~/.local/share/opencode/auth.json`: a `type: "api"` entry's `.key`, or a
  `type: "oauth"` entry's `.access` (falling back to `.refresh` for GitHub
  Copilot, which stores its token there). For ChatGPT the oauth entry's
  `.accountId` is read automatically. `$OPENCODE_DATA_HOME` overrides the data
  directory.
- **APIs.** `https://api.kimi.ai/coding/v1/usages` (global plan),
  `https://api.kimi.com/coding/v1/usages` (China plan),
  `https://opencode.ai/zen/go/v1/usage` (requires a custom `User-Agent`),
  `https://api.github.com/copilot_internal/user` (GitHub Copilot) and
  `https://chatgpt.com/backend-api/wham/usage` (ChatGPT).
- **Auth.** Run `opencode auth login` and pick **GitHub Copilot** or **OpenAI
  ChatGPT**. ChatGPT additionally needs the account id that login writes to
  `auth.json`; the plugin reads it automatically.
- **Cache and state** live in `<data-home>/usage-report/`: the TTL cache, the
  session id, the warn state, and `context/<sessionID>.json` — the system-prompt
  size sidecar, which holds counts only and never prompt text.
- **Local fallback** reads `opencode.db` read-only.
- **API keys are never logged, cached, or rendered.** Adapter errors are
  sanitized (key substrings replaced with `<redacted>`) before they reach any
  output, and the live smoke script never prints credentials.

## Troubleshooting

**`/usage` does not appear in the command list.**
Both configs are required — the command comes from the TUI plugin, not the
server plugin. Check that `tui.json` lists `"opencode-usage-report"` (bare name)
and restart opencode; config is not hot-reloaded. To confirm the package exposes
what opencode expects, run `opencode plugin opencode-usage-report` — it should
print `Detected server + tui targets`.

**The sidebar is empty and no providers are reported.**
Every window belongs to a provider whose credential could not be resolved, so it
is skipped. Run `opencode auth login`, or set
`OPENCODE_USAGE_<ID>_KEY` for the provider in question.

**An old version keeps loading after you upgrade.**
opencode caches installed plugin packages under
`~/.cache/opencode/packages/<name>@latest/` and re-resolves versions on install,
not on every start. Re-run `opencode plugin opencode-usage-report`, or delete
that cache directory, to force a refresh. This is the usual cause of "I
published a new version but opencode still runs the old one".

**Quota numbers look stale or marked `(stale)` / `(est)`.**
`(stale)` means a cached result was served past its TTL without a successful
refresh; `(est)` means the API was unreachable and a local estimate was used.
Press `r` in the dialog (or `ctrl+shift+u` in the sidebar) to force a refetch.

## Extending

New providers are trivial:

1. Implement `ProviderAdapter` (`src/types.ts`) — an `id`, `displayName`, and
   `fetch(cred, opts)` returning `{ windows, extras? }`.
2. Register it in `src/providers/index.ts` (`adapters` array).
3. Add fixture-driven tests under `test/`.

Reference endpoints for future adapters (not built in v1):

- **Gemini**: `cloudcode-pa.googleapis.com/v1internal:retrieveUserQuota`
  (requires Google OAuth).
- **Claude**: `api.anthropic.com/api/oauth/usage` (requires
  `anthropic-beta: oauth-2025-04-20`, the claude-code User-Agent, and
  `~/.claude/.credentials.json`).

## Development

```sh
npm run lint                      # oxlint
npm run lint:fix                  # oxlint --fix
npm run format                    # oxfmt (write in place)
npm run format:check              # oxfmt --check
npm test                          # vitest, no network
npm run typecheck                 # tsc --noEmit
npm run check                     # lint + format:check + typecheck + test
npm run smoke -- --yes-live       # manual live check (real keys; opt-in)
```

## Releasing

Releases are **staged**, not published directly. Pushing a `v*` tag triggers
`.github/workflows/publish.yml`, which verifies that the tag matches
`package.json`, runs `npm ci`, and uploads the tarball with
`npm stage publish --provenance --access public` using npm Trusted Publishing
(OIDC — no `NPM_TOKEN` secret). Nothing goes live until a maintainer approves
the staged release with 2FA:

```sh
git tag v0.4.1 && git push origin main v0.4.1
npm stage list                    # find the stage id
npm stage approve <stage-id>      # 2FA prompt; or approve in the npm UI
```

`prepublishOnly` runs lint, format check, typecheck and tests before the upload,
so a failing check blocks the stage.

## Changelog

- **0.4.1** — internal: shared provider HTTP plumbing (`src/providers/http.ts`)
  replaces the copy-pasted fetch/retry/error code; context estimates simplified;
  reset times render as `Wed, Sep 16`.
- **0.4.0** — context usage panel (`/usage` now shows context breakdown, grid,
  compaction headroom and cost); `/usage` became a local TUI command that costs
  no model tokens; sidebar rendering extracted to `src/quota-lines.ts`.
- **0.3.0** — GitHub Copilot and ChatGPT (OpenAI) adapters.
- **0.2.0** — Kimi Code split into the kimi.ai (`kimi-code-plan-global`) and
  kimi.com (`kimi-code-plan-cn`) plans.

## License

MIT © [Kaan Chinar](https://github.com/kaanchinar)

Security policy: [SECURITY.md](./SECURITY.md)
