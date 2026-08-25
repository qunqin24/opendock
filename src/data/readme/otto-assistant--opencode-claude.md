<p align="center">
  <img src="docs/header.svg" width="828" alt="opencode-claude — Claude Code in OpenCode, CLI-owned auth, Agent SDK">
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@otto-assistant/opencode-claude"><img src="https://img.shields.io/npm/v/%40otto-assistant%2Fopencode-claude?style=flat-square&color=e8a87c&labelColor=140f0c&label=npm" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/@otto-assistant/opencode-claude"><img src="https://img.shields.io/npm/dm/%40otto-assistant%2Fopencode-claude?style=flat-square&color=e8a87c&labelColor=140f0c" alt="npm downloads"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-e8a87c?style=flat-square&labelColor=140f0c" alt="MIT license"></a>
  <img src="https://img.shields.io/badge/linux%20·%20macos%20·%20windows-e8a87c?style=flat-square&labelColor=140f0c" alt="linux, macos, windows">
  <a href="https://github.com/otto-assistant/opencode-claude/releases"><img src="https://img.shields.io/github/v/release/otto-assistant/opencode-claude?style=flat-square&color=e8a87c&labelColor=140f0c&label=release" alt="latest release"></a>
</p>

<p align="center">
  <strong>Claude Code inside OpenCode</strong> — CLI-owned authentication,<br>
  Agent SDK harness, effort variants, tools, images, and compact.
</p>

<p align="center">
  <a href="#install">Install</a> ·
  <a href="#authenticate">Authenticate</a> ·
  <a href="#why-this-plugin">Why this plugin</a> ·
  <a href="#architecture">Architecture</a> ·
  <a href="CHANGELOG.md">Changelog</a>
</p>

---

Run Claude Code from your Claude Pro/Max subscription inside OpenCode: Fable, Opus, Sonnet, Haiku — with thinking effort `low`→`max`, streaming, OpenCode tool calls that park and resume, MCP, image/PDF attachments, and auto-compact.

The official Claude Code CLI exclusively owns authentication. The plugin implements no OAuth of its own: it never reads, copies, refreshes, or stores your credentials. Sign-in relays the CLI's own `claude auth login --claudeai` flow into the OpenCode UI, and every inference request — including title and summary generation — runs through the Agent SDK.

Uses the same Agent SDK + `claude` CLI stack as the [OpenChamber Claude harness](https://github.com/makeittech/openchamber-alpha/tree/claude). Plugin shape mirrors [@otto-assistant/opencode-cursor](https://github.com/otto-assistant/opencode-cursor).

## Install

`claude-code` is **not** a built-in OpenCode provider. Install the plugin first, or
`opencode auth login --provider claude-code` fails with `Unknown provider "claude-code"`.

```bash
# global (recommended)
opencode plugin @otto-assistant/opencode-claude -g

# or project-local (writes .opencode/opencode.json)
opencode plugin @otto-assistant/opencode-claude
```

Optional provider naming (also seeded when the plugin loads):

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@otto-assistant/opencode-claude"],
  "provider": {
    "claude-code": { "name": "Claude Code" }
  }
}
```

Or build from source:

```bash
git clone https://github.com/otto-assistant/opencode-claude.git
cd opencode-claude
bun install && bun run build
opencode plugin file://$PWD
```

## Authenticate

Requires the plugin to be installed (see above). The official Claude Code CLI
owns all credentials — the plugin only relays the CLI's sign-in flow.

```bash
opencode auth login --provider claude-code
# CLI installed  → pick "Sign in with Claude Code CLI"
# CLI missing    → pick "Install Claude Code CLI and sign in"
```

How the sign-in works:

| Step | What happens |
|---|---|
| **Sign in with Claude Code CLI** | Shown when the CLI is installed: the plugin launches `claude auth login --claudeai` and hands you the CLI's own sign-in page |
| **Install Claude Code CLI and sign in** | Shown only when the CLI is missing: runs the official installer (`npm i -g @anthropic-ai/claude-code`, official install script as fallback), then continues with the sign-in relay |
| Paste the code from the Claude page | Goes straight to the CLI's stdin; the CLI does the token exchange and owns the result |
| Access expires later | Claude Code refreshes its own credentials — no plugin token refresh, ever |

Terminal alternative (always works, no UI needed):

```bash
claude auth login --claudeai
```

No token is ever copied into OpenCode's auth store, and the plugin never calls
Anthropic OAuth or inference endpoints directly.

Then start OpenCode, pick provider **claude-code**, choose a model, and set the
**effort** variant (`low` / `medium` / `high` / `xhigh` / `max`) when you want
deeper thinking.

```bash
opencode run "Summarise this repository in five bullets." --model claude-code/sonnet
```

## Why this plugin

| | |
|---|---|
| **Agent SDK harness** | Runs Claude through `@anthropic-ai/claude-agent-sdk` + the local `claude` CLI — same stack as OpenChamber. |
| **CLI-owned auth** | The official Claude Code CLI holds and refreshes all credentials. Sign-in is a relay of `claude auth login --claudeai` — no plugin OAuth, no token copies, no plugin refresh. API keys are stripped from the child env so billing stays on the subscription. |
| **One-click CLI install** | When `claude` is missing, the provider offers an install action (official npm package, official install script as fallback) that rolls straight into sign-in. |
| **Effort / thinking** | Native OpenCode variants `low`→`max` map to Claude `--effort` + adaptive thinking. |
| **Agent-grade tools** | OpenCode tools bridge as in-process MCP; calls park and resume instead of deadlocking or inventing output. |
| **Attachments** | Images and PDFs from OpenCode reach Claude (data URLs + remote URLs). |
| **Auto-compact** | Long sessions compact like Claude Code; boundary events are surfaced in the stream. |
| **Session resume** | Sticky foreign Claude session IDs so follow-ups continue the same Agent SDK turn. |
| **History transfer** | When no Claude session can be resumed (first claude-code turn of a chat, model switch mid-conversation, pruned transcript), the full prior conversation is serialized into the prompt — Claude never starts blind. |
| **Host history transforms** | Plugins that rewrite conversation history via `experimental.chat.messages.transform` (e.g. DCP) work on resumed turns too: when the incoming message array stops being an extension of the last one, the proxy rebuilds the Claude session from the transformed host array instead of resuming. |
| **Rate-limit counter** | Subscription limit state is tracked per account with its reset time; `GET /v1/rate-limit` answers "when are limits back", and doomed turns fail fast with 429 + `Retry-After`. Org spend-cap (`$0 group`) errors are classified as limits; 529 overload is answered as 529, not 500. |
| **Multiple accounts** | Several Claude subscriptions side by side, each a self-contained `CLAUDE_CONFIG_DIR` the CLI owns. Per-session account binding, per-account quota/limits/usage, unknown ids rejected — never silently billed to the default account. |
| **Remaining quota** | Every window (5h / 7d / Opus) tracked from SDK telemetry + the control channel's plan usage; shown as percent left in the model name, `/health`, `/quota` and 429 bodies. Explicit refresh reads the control channel of an idle CLI probe — zero tokens spent. |
| **Control panel** | Self-contained HTML at the proxy root: accounts, logins, quota, usage, session→account map, add/rename/remove/connect. Same-origin mutations, loopback-only by default. |
| **Management tools** | `claude_accounts` / `claude_account_manage` manage the roster from inside a session — no panel needed. |
| **Stall & cancel safety** | A silent turn is killed after a watchdog timeout instead of wedging the session forever, and a client disconnect tears the turn down instead of leaking a live CLI process. |

## Architecture

```text
OpenCode
  └─ /v1/chat/completions
       └─ Bun.serve proxy (ephemeral port; published via plugin config)
            └─ Claude Agent SDK query()
                 └─ claude CLI (owns subscription credentials)
```

Model catalog: aliases `fable` / `opus` / `sonnet` / `haiku` plus pinned ids.
Effort selection is encoded in `x-opencode-claude-effort` so the proxy passes the
exact `effort` (+ adaptive thinking) into the Agent SDK.

### Rate-limit counter

The proxy records Agent SDK `rate_limit_event` telemetry and hard session-limit
errors (including the parsed reset time) to
`~/.local/share/opencode-claude/rate-limit.json`, keyed per account.

- `GET /v1/rate-limit` → `{ limited, status, rateLimitType, utilization, resetsAt, resetsAtISO, resetInSeconds, message, updatedAt }` — poll this for a "limits reset in …" countdown. `utilization` is only present when the latest SDK event reported it — it is never carried over from an earlier limit window, so a freshly reset window never shows a stale percentage.
- `GET /health` includes a compact `rateLimit` summary (add `?account=<id>`
  for a specific account).
- While a confirmed hard limit is active, new chat turns return HTTP **429**
  with `Retry-After` + `x-claude-rate-limit-reset` headers and an
  `error.type = "rate_limit_error"` body. The block lifts automatically at
  reset time; the next turn then resumes the same Claude session (sticky
  session store is untouched). Limits are per account — an exhausted
  subscription never blocks a healthy one.
- Title/summary requests are never answered 429: when the account is limited,
  they return a locally derived title/summary so the host does not burn
  retries on meta calls that cannot succeed.
- Org spend-cap errors (`$0 group usage limit`) are classified as rate limits
  (429 + gate). Anthropic 529 `overloaded` is answered as HTTP 529 with a
  short `Retry-After` and does not trip the local gate.
- `OPENCODE_CLAUDE_RATE_LIMIT_FAST_FAIL=0` disables the 429 gate (turns are
  attempted and error normally).

### Multiple accounts

One OpenCode server can drive several Claude subscriptions. Each account is a
`CLAUDE_CONFIG_DIR` — a self-contained Claude CLI home with its own
credentials, transcripts and settings. The plugin never reads or writes a
credential: connecting an account means running

```bash
CLAUDE_CONFIG_DIR=~/.claude-work claude auth login
```

(the exact command is printed by the panel and the management tools), so the
CLI stays the sole owner of every credential chain.

Configure accounts one of two ways (first non-empty wins):

```bash
# 1. Environment (read-only roster; panel/tool mutations are refused)
OPENCODE_CLAUDE_ACCOUNTS='work:Work:~/.claude-work,personal:Personal:~/.claude-personal'
# or a JSON array: [{"id":"work","label":"Work","configDir":"~/.claude-work","default":true}, …]

# 2. Panel / tools — persisted to ~/.local/share/opencode-claude/accounts.json
```

With neither, the plugin behaves exactly like a single-account install.

In multi-account mode:

- Every model appears once per account: id `sonnet@work`, name
  `Claude Sonnet 4.5 (Work) · 5h 96% 2h 20m · 7d 4% 5d` (quota suffix,
  disable with `OPENCODE_CLAUDE_MODEL_QUOTA=0`).
- Requests may pin an account with the `x-opencode-claude-account` header;
  responses echo it.
- Each conversation binds to its account; follow-up turns stay put. Moving a
  conversation (model pick, header, panel, tool) clears the Claude-side
  resume target — a session id from one login is never replayed against
  another — and rebuilds the session from the transferred OpenCode history.
- Unknown account ids are rejected with 404, never silently routed to the
  default account.
- Removing an account reconciles its session bindings back to the default
  account.

### Quota, identity & usage

Post-#12 the plugin never talks to Anthropic directly, so quota is read from
two CLI-owned signals: `rate_limit_event`s harvested from running turns (one
window at a time, merged), and the SDK control channel's plan usage — the
structured data behind the CLI's `/usage` command, which reports the
five-hour, seven-day and Opus windows at once without any Messages API call.

- `GET /quota` — last known windows per account (free, read-only).
- `POST /accounts/:id/quota/refresh` — explicit refresh: boots one idle CLI
  probe, reads plan usage + account identity over its control channel, tears
  it down. Zero tokens spent; single-flight per account with cooldown and
  failure backoff.
- `GET /accounts` — accounts with login (email / organization / plan as the
  CLI reported it), quota summary, rate-limit state, usage counters and bound
  session counts. Two accounts resolving to the same email are flagged as
  duplicates.
- `GET /usage` — per-account per-day turn and token counters.
- `GET /sessions` — session→account map (`?account=<id>` filters).

### Control panel

A self-contained HTML page (no external assets) served at the proxy root
(`/` or `/panel`): accounts, logins, quota windows, rate-limit state, usage,
session→account map, plus add / rename / remove / set-default / move-session /
refresh-quota. "Connect" shows the `CLAUDE_CONFIG_DIR=… claude auth login`
command to run — the panel never handles credentials.

- Mutating routes require a same-origin request.
- The proxy binds loopback-only by default; `OPENCODE_CLAUDE_PANEL_HOST`
  widens the bind for remote setups (put a reverse proxy in front —
  `X-Forwarded-Prefix` is honoured for the base path).
- `OPENCODE_CLAUDE_PANEL=0` disables the HTML page (the JSON API stays).

### Management tools

Two OpenCode tools manage the roster from inside a session, no panel needed
(disable with `OPENCODE_CLAUDE_TOOLS=0`):

- `claude_accounts` — list accounts with login, quota, usage, limits and
  binding counts.
- `claude_account_manage` — `add` (returns the connect command), `remove`,
  `rename`, `set-default`, `bind-session`, `refresh-quota`.

### Host history & transform plugins

On follow-up turns the proxy resumes the sticky Claude-side session, so
conversation history normally comes from Claude's own transcript — not from
the message array OpenCode sends. Host plugins that rewrite history through
`experimental.chat.messages.transform` (context pruning à la
`@tarquinen/opencode-dcp`, message editing, etc.) would silently have no
effect on resumed turns.

The proxy therefore fingerprints the non-system messages of every turn
(system messages are deliberately dropped — the Claude Code preset supplies
the agent system prompt). When the incoming array is no longer an extension
of what the host sent last turn — messages were dropped, replaced, or edited —
the proxy logs a warning, abandons the Claude session, and rebuilds it from
the transformed host array via history transfer, so the transform actually
reaches Claude.

- Default: divergence → rebuild from the host array (new Claude session,
  transferred history).
- `OPENCODE_CLAUDE_DIVERGENCE_REBUILD=0` — warn-only: the divergence is
  logged but the Claude transcript still wins (pre-0.12 behavior).
- `OPENCODE_CLAUDE_HOST_TRANSCRIPT=1` — the host owns the transcript: never
  resume, rebuild from the (possibly transformed) host array every turn.
  Guarantees transform plugins always apply, at the cost of Claude-side
  cross-turn prompt caching and auto-compact continuity.

## Requirements

- [OpenCode](https://opencode.ai)
- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) — on `PATH` or installed via the provider's install action; the plugin also checks `~/.local/bin` and the npm global bin for a CLI the server PATH cannot see
- Claude plan supported by Claude Code (Pro/Max)
- Bun (plugin runtime) · Node.js ≥ 18

## Development

```bash
bun install
bun run build
bun run test
```

Debug logging: `OPENCODE_CLAUDE_DEBUG=1`.

Optional knobs:

- `OPENCODE_CLAUDE_PROXY_PORT` — optional pinned proxy port (default: ephemeral / OS-assigned; live URL is published to OpenCode via plugin config)
- `OPENCODE_CLAUDE_CWD` — working directory passed to the Agent SDK
- `CLAUDE_CODE_OAUTH_TOKEN` — operator-provided subscription token passed through to the CLI unchanged (CI / headless hosts without an on-disk CLI login); the plugin never sets or rotates it
- `OPENCODE_CLAUDE_TURN_STALL_MS` — max Agent SDK silence before a turn is declared dead and killed (default `600000`)
- `OPENCODE_CLAUDE_RATE_LIMIT_FAST_FAIL` — `0` disables the 429 rate-limit gate
- `OPENCODE_CLAUDE_ACCOUNTS` — account roster (`id:label:configDir` entries or JSON array); when set, panel/tool mutations are refused
- `OPENCODE_CLAUDE_MODEL_QUOTA` — `0` removes the remaining-quota suffix from model names
- `OPENCODE_CLAUDE_PANEL` — `0` disables the control-panel HTML page (JSON API stays)
- `OPENCODE_CLAUDE_PANEL_HOST` — bind host for the proxy/panel (default loopback)
- `OPENCODE_CLAUDE_TOOLS` — `0` disables the `claude_accounts` / `claude_account_manage` tools
- `OPENCODE_CLAUDE_RATE_LIMIT_STORE`, `OPENCODE_CLAUDE_QUOTA_STORE`, `OPENCODE_CLAUDE_IDENTITY_STORE`, `OPENCODE_CLAUDE_USAGE_STORE` — override store paths (tests)
- `OPENCODE_CLAUDE_HISTORY_MAX_CHARS` — budget for transferred conversation history when a Claude session cannot be resumed (default `400000`; newest messages are kept, `0` disables transfer)
- `OPENCODE_CLAUDE_HOST_TRANSCRIPT` — `1` makes the host own the transcript: Claude sessions are never resumed and the conversation is rebuilt from the (possibly transformed) host messages every turn
- `OPENCODE_CLAUDE_DIVERGENCE_REBUILD` — `0` downgrades host-history divergence handling to warn-only (the Claude transcript keeps winning; transformed history does not reach Claude)

## Release

Publish via GitHub Actions → **Actions → Release → Run workflow**:

| Input | Purpose |
|---|---|
| `version` | Explicit semver (`0.6.0`). Empty → use bump |
| `bump` | `minor` (default) / `patch` / `major` |
| `dry_run` | Skip npm publish; create a draft GitHub release |

Requires repo secrets: `NPM_TOKEN`, optional `DISCORD_WEBHOOK_URL`.

Local pin refresh after a release:

```bash
./scripts/update-plugin.sh --dry-run
./scripts/update-plugin.sh
```

## License

[MIT](LICENSE)
