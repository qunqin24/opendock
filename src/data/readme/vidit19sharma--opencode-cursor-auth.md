# opencode-cursor-auth

Use your **Cursor subscription** inside [opencode](https://opencode.ai) — no proxy server, no port, no separate API bill.

The plugin bridges opencode's OpenAI-style chat requests to the official [`@cursor/sdk`](https://www.npmjs.com/package/@cursor/sdk) **in-process**, so every model your Cursor plan includes (GPT, Claude, Gemini, Kimi, GLM, Composer, …) shows up as a `cursor/*` model in opencode.

## Features

- **Official SDK, not a reverse-engineered API** — auth, checksums, and client versioning handled by `@cursor/sdk`
- **In-process bridge** — no local HTTP proxy, no port to collide on, no extra daemon
- **Full tool loop** — opencode's native tools (read, edit, bash, MCP, …) work end-to-end via a held-run bridge: one Cursor run spans the whole tool exchange. Cursor's own built-in tools are disabled, so the model can only act through opencode
- **Thinking blocks** — Cursor reasoning streams into opencode as proper thinking blocks (`reasoning_content`)
- **Images** — attachments in a message are forwarded to Cursor (every model is advertised as image-capable; a model that cannot take images answers with Cursor's own error)
- **Session resume** — conversations map to native Cursor agents (`Agent.resume`), in-memory and persisted to disk for 7 days, scoped per opencode session so parallel sub-agents never share an agent
- **System prompts** — delivered via `AGENTS.md` in a per-session workspace (the `--system-prompt` flag is server-gated by Cursor)
- **Dynamic model list with variants** — fetched live from `Cursor.models.list()`, cached 24h; one id per model, with every reasoning-effort / thinking / fast / context variant on opencode's Ctrl+T variant picker
- **Context limits** — each model publishes the context window of Cursor's default variant, so opencode's auto-compaction and context indicator work
- **Real error statuses** — 400 / 401 / 402 / 403 / 409 / 429 / 502 instead of a 200 stream carrying an error
- **Cancellation** — Esc or a sub-agent timeout cancels the Cursor run and closes the agent
- **Concurrency cap and retry** — at most 4 Cursor runs at once (configurable); transient failures retried before the first byte
- **Usage** — prompt, completion, cached-read, and reasoning tokens reported to opencode
- **Zero cost display** — models are marked cost-free since you're on subscription billing

## Requirements

- Node >= 22.13 (opencode runs the plugin on its bundled Bun; Node is needed for the `npx` CLI)
- opencode >= 1.19. Older versions lack the `chat.headers` hook and `session.status` events: sessions fall back to content-hash keys and a long tool call is cut off after 10 minutes.
- A Cursor plan that includes agent usage

## Install

All three methods end with `opencode auth login`, then a restart of opencode, then `opencode models | grep cursor/` (next section).

### 1. One command (npx)

```sh
npx @vidit19sharma/opencode-cursor-auth setup
```

Adds the plugin to the `plugin` array of your opencode config; running it again is a no-op. The config is the first of: `--config <path>`, `$OPENCODE_CONFIG`, `opencode.jsonc` / `opencode.json` (`.jsonc` preferred) in `$OPENCODE_CONFIG_DIR`, `$XDG_CONFIG_HOME/opencode/` or `~/.config/opencode/`; if none exists, `opencode.json` is created there. The original is backed up to `<file>.bak-cursor-auth`; the file's permission mode is kept and a symlinked config is edited in place.
`--dry-run` shows the change without writing. A file that only parses after stripping comments or trailing commas is never rewritten, whatever its extension (exit 2, you get the one-line manual edit instead); a comment-free `.jsonc` is rewritten normally.

### 2. Manual

Add the plugin to `~/.config/opencode/opencode.json`:

```json
{
  "plugin": ["@vidit19sharma/opencode-cursor-auth@latest"]
}
```

The plugin auto-registers the `cursor` provider — no manual provider config needed.

### 3. Let an AI agent do it

Paste this into any LLM agent:

```
Install the @vidit19sharma/opencode-cursor-auth plugin and configure it by following: https://raw.githubusercontent.com/vidit19sharma/opencode-cursor-auth/main/installation.md
```

See [installation.md](installation.md) for the step-by-step agent instructions.

## Authenticate

```sh
opencode auth login
```

Pick **Cursor**, then either:

- **Log in with Cursor (browser)** — opencode prints (and may open) a cursor.com login URL; signing in mints a 90-day SDK key, stored at `~/.cursor/sdk/auth.json`. On a headless/SSH machine, open the printed URL on any device; the key is saved on the machine running opencode.
- **Paste a Cursor API key** — from [cursor.com/dashboard](https://cursor.com/dashboard)

Alternatively set `CURSOR_API_KEY` in your environment.

**Restart opencode after logging in.** The model list and a pasted key are read at startup; until you restart, only `cursor/auto` is listed. Then check with `opencode models | grep cursor/`.

Key precedence: pasted key > `CURSOR_API_KEY` > browser-login key in `~/.cursor/sdk/auth.json`.

When the browser-login key is used, the plugin checks it before each request (cached 60s), and a one-time warning is printed to stderr within 7 days of expiry. The check is skipped for pasted keys and `CURSOR_API_KEY`. Requests fail with 401 and one of:

- ``Cursor SDK key missing — run `opencode auth login` and pick Cursor`` (never logged in)
- ``Cursor SDK key expired on <date> — run `opencode auth login` and pick Cursor``
- ``Cursor API key is empty — run `opencode auth login` and pick Cursor, or paste a key from cursor.com/dashboard`` (`invalid_api_key`, an empty pasted key)

## Use

```sh
opencode run -m cursor/gpt-5.5 "hello"
opencode run -m cursor/claude-opus-5-5 "hello"
opencode run -m cursor/auto "hello"
```

Or pick any `cursor/*` model from the opencode model selector.

## Upgrading

```sh
npx @vidit19sharma/opencode-cursor-auth update
```

Then restart opencode. opencode pins `@latest` to the version it first installed and never re-checks npm, so this deletes every cached `opencode-cursor-auth@*` copy under `<cache>/packages/` (and the legacy `<cache>/npm/`), where `<cache>` is `$XDG_CACHE_HOME/opencode` or `~/.cache/opencode`; opencode installs the current release on next start. `--dry-run` lists what would be removed; with no cached copy it prints "nothing to update". Tell-tale sign you need it: Ctrl+T shows no variants, or features from the changelog are missing. Manual equivalent:

```sh
rm -rf ~/.cache/opencode/packages/@vidit19sharma/opencode-cursor-auth@*
```

**Pinning / rollback.** `"plugin": ["@vidit19sharma/opencode-cursor-auth@0.4.1"]` pins a version; `@latest` floats but is only resolved on first install (hence `update`). To roll back, change the pin, run `update`, restart opencode.

## Models

```sh
opencode models | grep cursor/
```

- **Base ids only** — one id per Cursor model (47 today: `cursor/auto`, `cursor/gpt-5.5`, `cursor/claude-opus-5-5`, …). A base id is Cursor's own default variant (`isDefault`) and sends its params explicitly. Cursor's `default` model is exposed as `cursor/auto`.
- **Variants** — every other Cursor variant (reasoning effort, thinking, fast, context size) is an opencode model variant. In the TUI, select the model and press **Ctrl+T** to cycle them. Models with no variants (e.g. `gemini-3.1-pro`) show "No variants available".
- **Variant names** are the params that differ from Cursor's default, joined by `-`: values as-is (`low`, `xhigh`, `272k`), a boolean switched on is the param name (`fast`, `thinking`), switched off is `no-<param>` (`no-fast`, `no-thinking`). Examples: gpt-5.5 → `low`, `extra-high`, `272k-high-fast`; claude-opus-5 → `no-thinking`, `max-fast`; grok-4.7 → `256k-low-no-fast`.
- **In config**, set `variant` next to `model`:

  ```json
  { "agent": { "build": { "model": "cursor/gpt-5.5", "variant": "low" } } }
  ```

- **Limits**: `limit.context` is the default variant's context value, else the model's first listed context value, else 200k (gpt-5.5 and claude-opus-5-5 → 1M). `limit.output` is a fixed 32k accounting reserve (Cursor publishes no output cap and the bridge sends no `max_tokens`). Limits you set yourself in opencode config are kept.
- **Unknown ids** are passed through to Cursor, which answers with its own 400. An unknown variant param returns 400 `invalid_request_error` before any Cursor agent is created.
- **Blocked models**: Cursor's catalog has no per-account entitlement info. If Cursor rejects a model as "Model Blocked" (e.g. a team admin disabled it), the request fails with 403 `permission_error` carrying Cursor's message, and that model and all its variants are hidden from the list. Using a hidden id explicitly still sends it to Cursor. Blocked flags persist across catalog refreshes; delete `~/.cache/opencode-cursor-auth/models.json` to re-check.
- **Offline / logged out**: the stale cache is used if present, otherwise only `cursor/auto`.

The catalog is cached for 24h at `~/.cache/opencode-cursor-auth/models.json`; delete it to force a refresh. An expired catalog is still used at startup and refreshed in the background, so new models appear on the next start; only a first run with no cache waits for Cursor (at most 15 s).

### Migrating from 0.2.0

The suffixed ids (`cursor/gpt-5.5-low`, `cursor/claude-opus-5-5-1m-max`, …) no longer exist; Cursor rejects them with 400 "Cannot use this model".
Replace each with the base model plus a variant: `cursor/gpt-5.5-low` → `"model": "cursor/gpt-5.5", "variant": "low"`.
The models cache is refetched once on upgrade.

## Configuration

| Setting | Default | Purpose |
| --- | --- | --- |
| `OPENCODE_CURSOR_MAX_ACTIVE` | `4` | Max Cursor runs active at once; extra requests queue FIFO |
| `CURSOR_API_KEY` | unset | Use this key instead of the stored SDK key |
| `provider.cursor.options.headerTimeout` / `chunkTimeout` (opencode config) | 30 min | How long opencode waits for a reply to start / between chunks before aborting (opencode's own default is 5 min) |

| Path | Contents |
| --- | --- |
| `~/.cursor/sdk/auth.json` | 90-day SDK key from browser login (written by `@cursor/sdk`) |
| `~/.cache/opencode-cursor-auth/models.json` (or `$XDG_CACHE_HOME/opencode-cursor-auth/`) | Model catalog, 24h TTL, blocked-model flags; `0600` |
| `~/.cache/opencode-cursor-auth/sessions.json` (same dir) | opencode session → Cursor agent map, 7-day TTL, max 256 entries; `0600` |
| `$TMPDIR/opencode-cursor-XXXXXX/AGENTS.md` | Per-session workspace (dir `0700`); holds the system prompt in plaintext |
| `~/.cursor/projects/<slug>` (or `$CURSOR_DATA_DIR/projects/`) | Cursor's agent store and transcript for each bridge workspace (written by `@cursor/sdk`); removed with the workspace, or swept after 7 idle days |

The plugin sends nothing anywhere except to Cursor through `@cursor/sdk`; the SDK reports run metadata (model, prompt length/hash, run ids) to Cursor as telemetry.

## How it works

```
opencode ──(OpenAI chat JSON)──> plugin fetch() ──> @cursor/sdk Agent ──> Cursor backend
         <─(SSE stream)────────  bridge  <──(typed deltas: text / thinking / tool calls)
```

- opencode calls the provider's `fetch` — the plugin intercepts it in-process; `http://cursor.local/v1` is a dummy URL that never resolves.
- Each opencode tool is registered as a Cursor **custom tool** whose `execute()` parks a promise, emits an OpenAI `tool_calls` chunk, and resumes the *same* Cursor run when opencode sends the tool result back.
- Each opencode session + agent (sent as headers via the `chat.headers` hook) maps to one Cursor agent ID, so follow-up turns use `Agent.resume` instead of replaying history — across restarts too. A hash of the non-system messages detects a diverged history (revert, edit) and starts a fresh agent. The map persists at `~/.cache/opencode-cursor-auth/sessions.json`; expired workspaces are swept at load and released when opencode deletes the session.
- System messages are written to `AGENTS.md` in a per-session temp workspace and loaded via Cursor's project rules (`settingSources: ["project"]`). Once no session references a workspace, the bridge deletes its Cursor agent (`Agent.delete`), Cursor's store and transcript for it under `~/.cursor/projects`, and the workspace itself.
- The selected variant reaches the plugin as `providerOptions.cursor`; `@ai-sdk/openai-compatible` puts it in the request body as top-level `cursor_params: [{ id, value }, …]`, which the bridge validates and maps to Cursor `ModelSelection.params`.
- New turns take a slot from a FIFO semaphore (`OPENCODE_CURSOR_MAX_ACTIVE`); a run parked on a tool call releases its slot and the continuation re-acquires one through a priority queue. `Agent.create` / `Agent.resume` / `send` are attempted up to 3 times with jittered exponential backoff on 429, 5xx, and network errors, never after the first byte.
- The HTTP reply opens on the first text or thinking delta, so failures before any content become real HTTP errors.
- The request's abort signal and stream cancel cancel the Cursor run, close the agent, and release its slot.

### Errors

| Status | When |
| --- | --- |
| 400 | Unknown model or bad argument (Cursor's message), unknown variant param |
| 401 | SDK key missing or expired, empty pasted key (`invalid_api_key`), or Cursor rejects the key — see [Authenticate](#authenticate) for the messages |
| 402 | Plan usage limit reached (`insufficient_quota`); not retried, waiting won't help |
| 403 | Model blocked for your account (`permission_error`) |
| 409 | `continuation_in_progress`: a second tool result for the same call while one is being processed |
| 429 | Cursor rate limit (`rate_limit_error`); retried with backoff first, carries `retry-after` when Cursor's message names a wait |
| 502 | Anything else (`api_error`), after retries |

These are JSON error responses when the failure happens before the first byte; mid-stream failures emit an SSE `error` frame and close the stream without `[DONE]`.

## Development

```sh
bun install
bun run build        # tsc → dist/
bun run test         # offline: plugin unit tests, bridge unit tests, CLI tests (runs in CI)
bun run test:e2e     # bun spike/e2e-bridge.ts: real Cursor account, Tests 0-32, ~12 min, spends quota
bun run smoke        # fresh-HOME install smoke: packs the plugin, 3 checks (startup, auth login, first request before login)
bun run test:cli     # npx setup/update against temp config dirs
bun run spike        # raw @cursor/sdk validation
```

Release steps for maintainers are in [RELEASE.md](RELEASE.md).

The e2e suite covers plain streaming, a full tool loop on one held run, in-memory and disk-persisted session resume, AGENTS.md system-prompt delivery, mid-stream abort, error statuses, session scoping, context limits and key checks, model variants, the concurrency cap, retry semantics, blocked models, parked-run slot and expiry handling, token-usage estimation for tool loops, cross-process session resume, the startup workspace sweep, image forwarding, workspace validation, built-in tool refusal, replay injection, and the busy-aware idle backstop for parked runs.

## Known limitations

- `systemPrompt` as a true harness replacement is feature-gated server-side by Cursor; system text is applied via `AGENTS.md` as a project rule (merged under Cursor's harness prompt).
- Cursor's catalog has no entitlement info, so models your plan or team blocks only disappear after the first 403.
- `limit.context` is per model, not per variant: picking a smaller-context variant (e.g. gpt-5.5 `272k`) keeps the base model's 1M limit in opencode's context indicator and auto-compaction.
- A run parked waiting for a tool result is released after 10 minutes of silence from opencode; while opencode reports the session busy or retrying it is kept, up to a hard cap of exactly 2 hours. A tool result arriving later still works: the conversation is replayed into a fresh Cursor agent.
- Usage/rate limits are whatever your Cursor plan enforces — the plugin adds none beyond the concurrency cap.

## License

[MIT](./LICENSE) © Vidit Sharma
