## opencode-kimi-v2

An [OpenCode](https://opencode.ai) **v2** plugin that makes the Kimi Code path work like the official `kimi-cli`: official OAuth device flow, kimi-cli request fingerprint, server-driven model discovery, thinking/effort variants and Kimi prompt-cache reuse.

It is the OpenCode v2 successor of [opencode-kimi-full](https://github.com/lemon07r/opencode-kimi-full) (v1 only, incompatible with the v2 plugin API). Same wire behavior, rewritten on top of the v2 SDK (`@opencode/plugin`).

What you get:

- **Official Kimi OAuth device flow** against `https://auth.kimi.com`, stored in OpenCode's credential store. Tokens refresh automatically (OpenCode calls the plugin's refresh 5 minutes before expiry).
- **Tokens migrated from v1 keep working.** OpenCode v2 imports the old `auth.json` entry; this plugin registers its OAuth method under the same method id, so the migrated token refreshes without a new login.
- **kimi-cli fingerprint**: the `KimiCLI/<version>` User-Agent and the seven `X-Msh-*` headers on every request (Moonshot rejects Kimi Code requests without them), sharing `~/.kimi/device_id` with a locally installed kimi-cli.
- **Interrupted turns do not wedge a session**: Kimi rejects the whole request when the replayed history contains an assistant message with no content and no tool calls (`400 the message at position N with role 'assistant' must not be empty`). OpenCode stores exactly that when a turn is cut off before the model produced anything (app closed or stream dropped while it was still thinking). The plugin drops such messages from the request, so the session can be continued after a restart without editing history.
- **Prompt cache reuse**: `prompt_cache_key` is set to the OpenCode session id on every chat completion, exactly like kimi-cli, so follow-up turns hit Kimi's prompt cache (verified: second turn of a session reports ~all input tokens as cache reads).
- **Server-driven model list**: `GET /coding/v1/models` is queried on every start, on every credential change and on `/kimi-sync`. New Kimi Code models appear in the picker without a plugin update. The last successful list is cached in OpenCode's plugin storage and used only when the query fails (offline start, lapsed membership).
- **Thinking / effort variants** per model: `off`, `auto`, and the tiers the server advertises (`think_efforts.valid_efforts`, e.g. `low`/`high`/`max` on k3). Each variant is a request-body overlay carrying the exact `thinking` + `reasoning_effort` pair; `max` is clamped to `high` unless advertised, `xhigh` always clamps.
- `reasoning_content` streaming, images (`supports_image_in`), context windows and display names taken from the discovery response.
- `/kimi-usage` (subscription usage with reset hints), `/kimi-sync` (re-discover models), `/kimi-status` commands, plus a `kimi` RPC for UIs.

### Requirements

- OpenCode **>= 2.0** (`@opencode/cli`). For OpenCode 1.x use `opencode-kimi-full`.
- A Kimi account with an active **Kimi For Coding** subscription.

### Install

From npm (once published):

```sh
opencode plugin add opencode-kimi-v2
```

Or add it to `~/.config/opencode/opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-kimi-v2"]
}
```

From a local checkout (development), use a `file://` URL or an absolute path to the repo directory:

```json
{
  "plugins": ["file:///absolute/path/to/opencode-kimi-v2"]
}
```

Local checkouts are watched: editing the sources hot-reloads the plugin. Run `opencode reload` after changing the config.

### Log in

```sh
opencode auth login kimi-for-coding-oauth
```

Pick **Kimi Code (device flow)**, open the printed URL, approve the code. The plugin discovers your account's models right after (a `provider.updated` event refreshes the picker), no restart needed.

If you migrated from OpenCode v1 with `opencode-kimi-full`, the stored token was imported by OpenCode and refreshes automatically — `opencode auth list` shows "Kimi For Coding (OAuth)" as stored and no login is required.

### Use

Select any model under `kimi-for-coding-oauth/` — for example:

```
kimi-for-coding-oauth/k3
kimi-for-coding-oauth/k3-256k
kimi-for-coding-oauth/kimi-for-coding
kimi-for-coding-oauth/kimi-for-coding-highspeed
```

Model ids are the server slugs (what kimi-cli prints), so `opencode run -m kimi-for-coding-oauth/k3#high "…"` works from the CLI, and `model: kimi-for-coding-oauth/k3` works in agent files. Variants are selected with `#<variant>` (`#off`, `#auto`, `#low`, `#high`, `#max`) or the variant cycle key in the TUI.

| variant | `thinking` | `reasoning_effort` |
|---|---|---|
| `off` | `{ "type": "disabled" }` (thinking-only models: `enabled`) | omitted |
| `auto` | omitted (thinking-only models: `enabled`) | omitted, server default |
| `low` / `medium` / `high` | `{ "type": "enabled" }` | as named |
| `max` | `{ "type": "enabled" }` | `max` when advertised, else `high` |

All current Kimi Code models advertise `supports_thinking_type: "only"`, so thinking is always enabled for them and `off`/`auto` only leave the effort to the server.

#### Commands

- `/kimi-usage` — weekly and rolling-window limits with reset hints.
- `/kimi-sync` — re-run model discovery and refresh the picker.
- `/kimi-status` — connection state, discovered models, last sync, last warning.

### Configuration

Nothing is required. The provider entry (`kimi-for-coding-oauth`, package `@opencode/ai/providers/openai-compatible`, base URL `https://api.kimi.com/coding/v1`) and one model per discovered entry are injected at runtime.

The provider id is intentionally **not** one of the built-in `kimi-code-plan-*` providers: those are API-key providers in OpenCode's catalog. A separate id keeps the OAuth path from colliding with them.

### Troubleshooting

- **Provider not in the picker** — the provider is only shown while a Kimi connection exists (`activation: "auto"`). Run `opencode auth login kimi-for-coding-oauth`, then `/kimi-status`.
- **`model sync failed (HTTP 402)`** — the membership check failed; renew or verify your plan at https://kimi.com/coding. The last known model list stays available.
- **`HTTP 401/403`** — log in again. A `403 access_terminated_error` means the fingerprint headers were stripped; the plugin re-adds them in its request hook, so check for another plugin rewriting requests.
- **`the message at position N with role 'assistant' must not be empty`** — a turn in that session was cut off before the model produced anything, and the stored empty assistant message was being replayed. Versions from 0.1.1 drop it from the request automatically; upgrade the plugin and send the message again.
- **Plugin not loading** — `opencode plugin list` must show `opencode-kimi-v2`. For local checkouts the config entry must point at the repository directory (which has `server.ts` at its root).

### Development

```sh
bun install
bun run typecheck && bun run typecheck:tests
bun test
```

Layout:

| file | role |
|---|---|
| `server.ts` | OpenCode server entrypoint (re-exports `src/index.ts`) |
| `src/index.ts` | integration (OAuth method + refresh), provider transform, `http.request` hook, commands, RPC |
| `src/catalog.ts` | pure conversion from `/coding/v1/models` entries to `Model.Info` (variants, capabilities, limits) |
| `src/oauth.ts` | device flow, token refresh, model listing |
| `src/headers.ts` | kimi-cli fingerprint headers and `~/.kimi/device_id` |
| `src/usage.ts` | `/coding/v1/usages` parsing |
| `src/rpc.ts` | shared RPC contract (`kimi.usage`, `kimi.status`, `kimi.sync`) |

### How it maps onto OpenCode v2

```
opencode auth login ──> integration.method "oauth" (device flow) ──> credential store
                        refresh(credential) called by OpenCode 5 min before expiry

startup / credential change ──> GET /coding/v1/models ──> provider.transform (editor.add)
                                                     └──> plugin storage cache (last known good)

chat request ──> credential.access → Authorization: Bearer   (OpenCode)
             ──> model/variant body overlays: thinking, reasoning_effort (OpenCode)
             ──> session.hook("http.request"): prompt_cache_key, X-Msh-* headers (plugin)
```

### License

MIT. Portions derived from `opencode-kimi-full` (MIT, © lemon07r).
