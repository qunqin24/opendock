# opencode-workbuddy-connect

English | [简体中文](README.zh-CN.md)

An [opencode](https://opencode.ai) provider plugin that connects [WorkBuddy AI](https://www.workbuddy.ai) — the Tencent CodeBuddy / WorkBuddy assistant models — to opencode as a first-class provider, **including the 1M-token context models**.

Zero-credential setup if you use the WorkBuddy / CodeBuddy desktop app: the plugin auto-discovers its auth file. No API key to paste, no quota to buy.

## Features

- **Real 1M context** — every 1M-tier model is registered with `limit.context = limit.input = 1_000_000`, so opencode compacts at ~1M instead of the 200k default. The 1M window is native to these models; no wire parameter is needed. Thirteen on the international endpoint (`gpt-6-astra`, `gpt-5.6-*`, `gpt-5.5`, `deepseek-v4.1-flash[-sg]`, `hy4-preview`, `kimi-k3`, `kimi-k2.8-preview`, `gemini-3.5-flash`, `glm-5.3`, `glm-5.2`) and ten on CN (`hy4-preview`, `hy4-preview-x`, `glm-5.3`, `glm-5.3-flash`, `glm-5.2`, `kimi-k3-1`, `kimi-k2.8-preview`, `deepseek-v4-flash`, `deepseek-v4.1-flash`, `deepseek-v4-pro`).
- **Live model discovery** — the plugin asks the gateway which models *your* account can actually buy, at its real token budgets, and merges that over a bundled per-region table. Renames, new releases and context-window changes land without a plugin update, and no discovery failure can affect auth.
- **Pure OpenAI-compatible SSE** against `https://www.workbuddy.{ai|cn}/v2/chat/completions`, with `reasoning_content` streamed as native thinking.
- **Full agentic tool use** — parallel tool calls, streaming tool-argument deltas, and `tool`-role result replay verified against the live gateway.
- **Credential discovery chain** — plugin options → environment → own store → desktop app auth file. Works out of the box next to a logged-in WorkBuddy desktop.
- **Account tools** — read your remaining credits per grant (`_quota`), claim the daily check-in (`_checkin`) and inspect which credential is live (`_account`). Strictly off the request path: every failure is returned as a message rather than thrown, and both billing tools can be switched off by environment variable without a plugin update.
- **Self-healing auth** — a 401/403 triggers one token refresh (via the desktop refresh endpoint) and one automatic replay of the request.
- **Browser login in `opencode auth login`** — OAuth-style login with polling, stored to `~/.config/opencode/workbuddy-auth.json`.
- **Reasoning-effort variants** (`low` / `medium` / `high` / `xhigh` / `max`) exposed as opencode model variants.
- **Loop guard** — the flash models are known to burn budget in `OK / Let me write / Go` reasoning loops; their `max_tokens` is capped at 16,384 per request (upstream behavior copied from the reference adapter).

## Requirements

- opencode 2.x
- Node.js ≥ 20 (global `fetch`)
- A WorkBuddy account: browser login, an env-var token, or a desktop app logged in on this machine

## Install

Install from npm (recommended):

```bash
opencode plugin add opencode-workbuddy-connect
```

Or register the package in `~/.config/opencode/opencode.jsonc` using the v2
form. A single entry registers **both** endpoints (see integration points below):

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-workbuddy-connect"]
}
```

Pin a version for reproducible installs, e.g. `opencode-workbuddy-connect@0.1.2`.
The plugin loads its TypeScript source directly, so there is no local build step.
Options such as `apiKey`, `userID` and `setDefault` apply to both endpoints;
per-region `region` / `providerID` / `storeName` / `baseUrl` are set automatically
and cannot be overridden per endpoint from a single entry.

### Installing from GitHub instead

Some OpenCode standalone builds cannot install git-hosted plugins: their package
installer spawns the OpenCode binary as if it were `node`, so npm's flags are
rejected and the install fails with `git dep preparation failed`. Prefer the npm
package above. If you still want GitHub, use the explicit `git+https://` form:

```bash
opencode plugin add 'git+https://github.com/runfengtsui/opencode-workbuddy-connect.git#v0.1.2'
```

Do **not** use the `github:` shorthand — it defaults to SSH and fails without a
GitHub SSH key. If that also fails (for example on the standalone build above),
clone the repo and register the local path instead:

```bash
git clone https://github.com/runfengtsui/opencode-workbuddy-connect.git
```

```jsonc
{ "plugins": ["/path/to/opencode-workbuddy-connect"] }
```

Then run `opencode auth login` for browser login; the plugin publishes all
models under the chosen providers.

## Integration points

WorkBuddy has two independent endpoints, and an account on one does **not**
work on the other. The plugin ships both, as two provider ids:

| Provider | Endpoint | Browser Login opens | Credential store |
|---|---|---|---|
| `workbuddy` | `www.workbuddy.ai` (international) | international login | `~/.config/opencode/workbuddy-auth.json` |
| `workbuddy-cn` | `www.workbuddy.cn` (CN) | CN login | `~/.config/opencode/workbuddy-cn-auth.json` |

Each endpoint is an independent provider with its own login, credential store
and base URL, so **logging into one never overwrites the other** and CN traffic
can never leak to the international endpoint. Pick by model name:
`workbuddy-cn/hy3` vs `workbuddy/hy3`.

Both providers are registered by a **single** plugin instance. Do not load the
package twice: OpenCode keeps only the first plugin with a given id, so a second
entry would be silently dropped. One `plugins` entry is all you need.

If your opencode loads plugins from `~/.config/opencode/plugins/` instead, drop
in one shim file that re-exports the dual-region default:

```js
// ~/.config/opencode/plugins/workbuddy.js
export { default } from "opencode-workbuddy-connect";
```

The named `definePlugin("intl" | "cn")` export is still available for callers
that deliberately want a single region per plugin instance.

### What shows when nothing is logged in

The model list tracks login state, so it never advertises models the account
cannot actually buy:

- **Neither endpoint logged in** — a single offline placeholder model
  `workbuddy-offline` (named *WorkBuddy (offline — login required)*) is shown,
  proving the plugin loaded; the other endpoint stays silent. Selecting it
  prompts a `/connect` login instead of firing a request that cannot succeed.
- **Exactly one logged in** — only that account's model list is shown; the
  unauthenticated endpoint shows no models.
- **Both logged in** — both endpoints' model lists render normally (each
  independent and region-isolated).

The decision uses a **non-network** credential-existence check (env var / own
store / desktop auth file), so being unauthenticated never pings the endpoint
or logs any login failure.

## Authentication

The first successful source wins, in this order:

1. **Plugin options** — `"options": { "apiKey": "<token>", "userID": "<uid>", "baseUrl": "https://www.workbuddy.cn" }` on the provider (or on the plugin entry in `opencode.json`).
2. **Environment** — `WORKBUDDY_TOKEN` + `WORKBUDDY_UID` for the international point, `WORKBUDDY_CN_TOKEN` + `WORKBUDDY_CN_UID` for the CN one. The split is deliberate: a single token variable would let a CN credential sign international requests (and light up a provider you never logged into). Optionally `WORKBUDDY_BASE_URL` and `WORKBUDDY_AUTH_FILE`.
3. **Own store** — the per-integration-point file from the table above (written by Browser Login below, and by every successful token refresh).
4. **Desktop auth file** — automatically located in
   `%LOCALAPPDATA%\CodeBuddyExtension\Data\Public\auth\workbuddy-desktop.info`
   (CN desktop, `www.workbuddy.cn`) or `workbuddy-desktop-ai.info` (international).

If you already run the WorkBuddy / CodeBuddy desktop app signed in, **nothing to do** — step 4 signs every request.

### Interactive login

```bash
opencode auth login   # pick "WorkBuddy AI" or "WorkBuddy AI (CN)"
```

Two methods are offered per integration point:

- **Access Token** — paste a raw token; optionally in the form `token|uid|https://www.workbuddy.cn` to pin the account and host.
- **Browser Login** — opens that integration point's own login page and polls for the credential. No environment variable needed: `WorkBuddy AI (CN)` already opens `www.workbuddy.cn`.

## Models

Each integration point has its **own** model table, because the two sites sell different catalogues under the same names.

**`workbuddy` (international)** — 21 models, default `hy3`. This is the table served by the desktop client's own product config (`/v3/config`), and the credits are the rates the gateway actually bills:

| Model | Context | Max output | Effort variants | Notes |
|---|---|---|---|---|
| `gpt-6-astra` | **1,000,000** | 128,000 | low…max | |
| `gpt-5.6-sol` | **1,000,000** | 128,000 | low…max | |
| `gpt-5.6-terra` | **1,000,000** | 128,000 | low…max | |
| `gpt-5.6-luna` | **1,000,000** | 128,000 | low…max | |
| `gpt-5.5` | **1,000,000** | 128,000 | low…xhigh | |
| `deepseek-v4.1-flash` | **1,000,000** | 128,000 | low, high, max | free; output capped to 16,384 (loop guard) |
| `deepseek-v4.1-flash-sg` | **1,000,000** | 128,000 | low, high, max | |
| `hy4-preview` | **1,000,000** | 64,000 | high | **billed x0.29** (not free) |
| `kimi-k3` | **1,000,000** | 32,000 | low…max | |
| `gemini-3.5-flash` | **1,000,000** | 65,536 | low…max | |
| `kimi-k2.8-preview` | **1,000,000** | 32,000 | low, high, max | |
| `glm-5.3` | **1,000,000** | 48,000 | low, high, max | |
| `glm-5.2` | **1,000,000** | 48,000 | high, xhigh | |
| `fast-model` | 200,000 | 32,000 | low…max | Auto-tier alias |
| `balanced-model` | 256,000 | 32,000 | low…max | Auto-tier alias |
| `primary-model` | 272,000 | 72,000 | low…max | Auto-tier alias |
| `gpt-5.4` | 272,000 | 72,000 | low…xhigh | |
| `kimi-k2.6` | 256,000 | 32,000 | low…max | |
| `hy3` | 192,000 | 64,000 | low, high | free |
| `deep-model` | 176,000 | 24,000 | — | Auto-tier alias |
| `default-model` | 176,000 | 24,000 | — | "Auto" |

**`workbuddy-cn` (CN)** — 29 models, default `hy3`. The CN catalogue is mixed: some entries neither stream reasoning nor take images, so capability varies per model rather than being uniform. Notable entries (full list is published at startup):

| Model | Context | Max output | Effort variants |
|---|---|---|---|
| `auto` | 168,000 | 32,000 | low…max |
| `hy3` | 192,000 | 64,000 | low, high |
| `hy3-x` | 192,000 | 64,000 | low, high |
| `hy4-preview` | **1,000,000** | 64,000 | high |
| `hy4-preview-x` | **1,000,000** | 64,000 | high |
| `glm-5.3` | **1,000,000** | 64,000 | low, high, max |
| `glm-5.3-flash` | **1,000,000** | 32,000 | low, high, max |
| `glm-5.2` | **1,000,000** | 64,000 | low…max |
| `kimi-k3-1` | **1,000,000** | 32,000 | low…max |
| `kimi-k2.8-preview` | **1,000,000** | 64,000 | low, high, max |
| `deepseek-v4-flash` | **1,000,000** | 50,000 | low…max |
| `deepseek-v4.1-flash` | **1,000,000** | 128,000 | low, high, max |
| `deepseek-v4-pro` | **1,000,000** | 128,000 | low…max |
| `minimax-m3` | 512,000 | 64,000 | low…max |
| `kimi-k2.7` | 256,000 | 32,000 | low…max |
| `kimi-k2.5` | 164,000 | 32,000 | low…max |
| … | 13 more | | |

These are the *statically bundled* tables. The plugin also queries the live catalogue endpoint at startup and replaces them with whatever your account can actually buy (see [Model discovery](#model-discovery) below).

## Model discovery

The gateway exposes the same endpoint the WorkBuddy CLI uses:

```
CN:    GET {baseUrl}/console/enterprises/personal/models   (falls back to /v3/config)
Intl:  GET {baseUrl}/v3/config                             (falls back to /v2, then /console)
```

`/v3/config` is the desktop client's own product config: it is what the official clients render in their model pickers, and the credits it carries are the rates the gateway actually bills. International leads with it; CN leads with the console endpoint it has always answered on, and falls back to `/v3/config`. The legacy `/v2/enterprises/personal/models` path still answers `200` for international, but it is stale and narrower (18 entries, no DeepSeek variants, and it advertises `hy4-preview` as free when the gateway bills `x0.29`), so it is now only a fallback probe. Paths are probed in order and the first that answers wins, so a dead prefix cannot disable discovery for a region.

It returns the models *your* credential is allowed to use, at the gateway's true token budgets — the only way the table stays accurate after WorkBuddy renames a model or moves its context window. On startup (and at most once per hour) the plugin fetches it, writes a per-region disk cache under `~/.cache/opencode/`, and applies the result:

- **ids** are authoritative: a model the endpoint omits stops being offered, a new one starts.
- **numbers** (`contextWindow`, `maxOutputTokens`, `credits`) come from the gateway. The endpoint is the only place the plugin learns that e.g. `kimi-k2.5` is 164k, not 256k, or that `hy4-preview` is billed `x0.29` rather than free.
- **effort ladders** fall back to the static table where the endpoint is silent. The endpoint only lists `supportedEfforts` for some models; inventing the full `low…max` ladder for a model like `hy3` (which really only accepts `low`/`high`) would produce `400 invalid effort` responses, so "absent" is treated as *unknown*, not as "all five".

Nothing about discovery can break auth. A 500, a timeout, an empty response, or a response so small it looks truncated is logged and ignored, and the last good table is served — worst case the static table. Failures back off for 60 s so a broken endpoint isn't hammered on every startup. Both endpoint families are confirmed answering live with their own credentials; if a path is ever wrong, the probe falls through to the next one and then to the static table, which costs a warning line and nothing else.

| Variable | Effect |
|---|---|
| `WORKBUDDY_DISABLE_MODEL_DISCOVERY=1` | Never call the endpoint; use only the static tables. |
| `WORKBUDDY_MODEL_CACHE_SECONDS=<n>` | Change the refresh interval (default 3600). |
| `WORKBUDDY_MODEL_DISK_CACHE=<path>` | Relocate the cache. **End it with `/` (or point it at an existing directory)** so each region writes its own file — with both integration points loaded, a bare file path would be shared and the last region to write would serve its catalogue to the other. |
| `WORKBUDDY_MODEL_FIXTURE=<path>` | Replace the network with a saved response. For debugging and tests; applies to whichever region is refreshed. |

To see what a region resolved to, check opencode's log for `catalogue[<region>]: N models …` — it names the source (`live`, `cache`, `fixture` or `static`).

## Usage

Pick a model (e.g. the 1M one):

```bash
opencode run -m workbuddy/deepseek-v4.1-flash "hello"
```

or set it as the default:

```json
{ "model": "workbuddy/glm-5.3" }
```

**Reasoning effort** — use the model variant:

```json
{ "model": "workbuddy/gpt-6-astra", "variant": "max" }
```

**Plugin options** (on the plugin entry, or under `provider.workbuddy.options`):

| Option | Effect |
|---|---|
| `apiKey` / `userID` / `baseUrl` | explicit credentials, top of the chain |
| `providerID` | register under a different id (default `workbuddy`) |
| `providerName` | display name in `/connect` and the picker (default `WorkBuddy AI`) |
| `storeName` | which own-store file this integration point reads/writes |
| `setDefault: true` | make `<provider>/hy3` the default model unless `model` is already set |
| (agent pins) | `plan` / `general` / `explore` / `title` / `compaction` subagents are pinned to `<provider>/hy3` if you haven't configured them |

`definePlugin("intl" | "cn")` pre-fills `providerID`, `providerName`, `storeName` and (for CN) `baseUrl`; anything you pass on the entry overrides them.

All models are registered with cost `0` — the desktop credential's quota is billed by WorkBuddy, not by opencode.

### Account tools

Each integration point ships three agent-visible tools, named after the provider (`workbuddy_*` international, `workbuddy_cn_*` CN):

| Tool | What it does |
|---|---|
| `_account` | Resolved provider, uid, expiry, base URL and credential source — never the token value. *"which WorkBuddy account is active?"* |
| `_quota` | Remaining credits across every active grant: per-package remain/total, expiry, and which one expires first. *"how much quota do I have left?"* |
| `_checkin` | Claims the daily check-in grant. Idempotent: a second call the same day reports `already`. |

The balance endpoint wraps one level deeper than chat (`data.Response.Data.Accounts`) and each row is a **grant instance**, not a package — repeated top-ups and daily check-ins each mint their own row with its own expiry, which is why an expiring-soon row is worth showing separately from your total.

Ask the agent: *"check my WorkBuddy balance"*, *"签到"* — it picks the tool for the integration point you're on.

**`_checkin` writes to your account.** It is only ever fired from an explicit tool call — never on startup, never on a request path, and it is never retried. If the campaign ends, changes shape, or the endpoint goes away, nothing breaks: every failure is returned as a message the agent can read, and the credential is untouched. Two switches turn it off without a plugin update:

| Variable | Effect |
|---|---|
| `WORKBUDDY_DISABLE_CHECKIN=1` | `_checkin` short-circuits before even resolving credentials; zero network calls. `_quota` still works. |
| `WORKBUDDY_DISABLE_BILLING=1` | Umbrella: disables `_quota` and `_checkin` together. |

This isolation is not just claimed, it is tested: `test/quota.mjs` injects a transport failure, an HTTP 500, an HTML login wall served at `200`, an emptied payload, a vanished campaign (`404`) and a credential-less environment, and asserts on each one that the billing functions *return* a failure instead of throwing, that the credential file is byte-for-byte unchanged, and that with every billing request throwing the plugin still registers its tools and answers non-billing calls normally.

The one case worth knowing about: a `200` response that carries **no gateway business code** is treated as a failure, not a success. An HTML page or a proxy interstitial would otherwise read as "check-in claimed" and silently report credits you never got.

## Troubleshooting

The plugin keeps the terminal clean. Lifecycle summaries (startup, model
registration, `setup[v2]` phases) go to **opencode's own log file** via
`client.app.log`, not to stderr. Only `warn`/`error` lines — prefixed
`[workbuddy]` and written to stderr — surface in your terminal, because those
are the ones that need you.

- **`[workbuddy] warn: ...` / `[workbuddy] error: ...` in the terminal** —
  a real problem: refresh failed, login failed, credential rejected. Act on it.
- **Need the full trace** — set `WORKBUDDY_DEBUG=1` to mirror every level
  (debug/info/warn/error) to stderr, for CLI debugging.
- **Adjust what lands in the log file** — `WORKBUDDY_LOG=debug|info|warn|error`
  moves the floor (default `info`); `debug` adds the per-request detail (token
  refreshes that recovered, handler hits, dropped SSE lines). `WORKBUDDY_LOG=off`
  mutes the plugin entirely, terminal and file both.

Find the file under `~/.local/share/opencode/log/` and grep it for
`catalogue[` (which model source won for each region), `registered` (final model
counts) or `setup[v2]`.

- **A model you expected is missing** — the live catalogue is authoritative for ids, so if the endpoint doesn't list a model for your account, the plugin won't offer it. Check the log line `catalogue[<region>]: N models <source>`: with `source=live|cache` the gateway is deciding; set `WORKBUDDY_DISABLE_MODEL_DISCOVERY=1` to go back to the bundled table and confirm the model reappears.

- **`401`/`403` even after refresh** — the desktop session expired: sign in to the WorkBuddy desktop app again, or use `opencode auth login`.
- **Browser Login never completes** — the account belongs to the *other* endpoint. Pick the matching integration point (`WorkBuddy AI` vs `WorkBuddy AI (CN)`); each one opens its own login page, so no `WORKBUDDY_BASE_URL` juggling is needed.
- **`WorkBuddy credentials not found. Run /connect workbuddy-cn`** — that integration point has never logged in. Its store is separate from `workbuddy`'s by design; sign in once per endpoint.
- **Flash models answering with tiny loops** — intended guard is active; if it still misbehaves, pick a non-flash model.
- **Answer renders as one token per line** — each streamed chunk was closing the open text block (see `test/stream.mjs`). Fixed; if it reappears after an upstream change, run `node test/stream.mjs` and compare the `blocks:` line — one contiguous answer must be exactly one `text-start`/`text-end` pair.
- **`languageModel is not a function`** — your own entry file exports something named `create*` before `createWorkBuddy`: opencode's legacy provider loader calls the module's **first** `create*` export and expects an AI-SDK provider, so that prefix is reserved. Use the exported `definePlugin()` for entry files. (The published package loads `src/index.ts` directly, so there is no build step involved.)
- **`NpmInstallFailedError: git dep preparation failed` / `Unrecognized flag: --force in command opencode`** — a bug in some standalone OpenCode builds: the installer spawns the OpenCode binary as the Node runtime for git dependencies, so npm flags are parsed as OpenCode flags. It affects *every* git-hosted plugin. Install from npm (`opencode plugin add opencode-workbuddy-connect`) instead, or register a local checkout as described in Install.

## Tests

```bash
npm test          # build + tsc + biome + the offline suite
npm run test:live # needs a signed-in credential
```

The offline suite runs with no credentials and no network, against a sandboxed cache/config root:

| File | Covers |
|---|---|
| `test/plugin.mjs` | registration contract for both integration points, per-region tables |
| `test/catalogue.mjs` | payload parsing, credits normalisation, merge rules, region isolation, the cache fallback ladder, cache-path overrides |
| `test/quota.mjs` | billing isolation: transport failure, HTTP 500, an HTML wall served at `200`, an emptied payload, a vanished campaign, missing credentials, both kill-switches, expiry parsing — and that none of it can throw, mutate a credential, or unregister a tool |
| `test/stream.mjs` | SSE framing (one answer must be one `text-start`/`text-end` pair) |
| `test/log.mjs` | logging policy: clean terminal, full trace to the log file |

`test/live.mjs [model] [intl|cn]` and `test/tools.mjs [model] [intl|cn]` hit the real gateway and need a login for the access point they target (`hy3` is free on both, so it is the cheapest default). Both also read `$WORKBUDDY_REGION`.

## Development

```bash
npm run build     # optional local tsc check -> dist/ (published package loads src directly)
npm run check     # tsc --noEmit
npm run lint      # biome check .
npm run lint:fix  # biome check --write .
```

ESM, TypeScript strict, `@ai-sdk/provider` `LanguageModelV3`, Biome for lint + format. `src/index.ts` wires both the legacy `config`-hook registration and the v2 `setup`/catalog/`aisdk.language` path; `src/models.ts` owns the per-region tables and the catalogue merge rules; `src/catalogue.ts` owns discovery and caching; `src/language-model.ts` owns the wire format.
