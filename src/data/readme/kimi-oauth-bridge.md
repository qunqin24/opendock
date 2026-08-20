## kimi-oauth-bridge

An [opencode](https://opencode.ai) plugin that makes the Kimi Code path in opencode work like the official `kimi-cli`, using Kimi-specific extensions instead of just a generic OpenAI-compatible provider.

> **Note:** This is an unofficial community plugin. It is not affiliated with or endorsed by Moonshot AI.

Compared with stock opencode Kimi setups, this plugin:

- uses the official Kimi device-flow OAuth against `https://auth.kimi.com`
- talks to `https://api.kimi.com/coding/v1` through `@ai-sdk/openai-compatible`
- sends the same `User-Agent` / `X-Msh-*` fingerprint headers as `kimi-cli`
- reuses `~/.kimi/device_id` for `X-Msh-Device-Id`
- adds `prompt_cache_key`, `thinking`, and `reasoning_effort` only when the selected Kimi Code model's discovered capabilities permit them
- discovers the authoritative, account-specific Kimi Code catalog from `/coding/v1/models`, including exact ids, display names, context lengths, tools, media, and thinking capabilities
- keeps tokens in opencode's auth store while mirroring `kimi-cli`'s refresh / retry behavior
- provides a `/kimi:usage` TUI command to check subscription usage

Contributor and agent documentation lives in [`AGENTS.md`](./AGENTS.md).

---

### Quick Start

1. Install the plugin globally: `opencode plugin kimi-oauth-bridge --global`
2. If you are testing a local checkout instead of the published package, install the checkout path instead: `opencode plugin /absolute/path/to/kimi-oauth-bridge --global`
3. Run `opencode auth login -p kimi-oauth-bridge` and approve the device flow in your browser.
4. Paste the provider block from [Configure](#configure) into your opencode config.
5. Select any model shown in the account-specific Kimi Code catalog that login prints.

### Requirements

- `opencode` >= 1.4.6
- A Kimi account with an active **Kimi For Coding** subscription (the same plan that works with kimi-cli)

### Install

Recommended:

```sh
opencode plugin kimi-oauth-bridge --global
```

That installs the published package and adds the plugin to your global opencode config, so `opencode auth login -p kimi-oauth-bridge` works from any directory.

From a local checkout:

```sh
opencode plugin /absolute/path/to/kimi-oauth-bridge --global
```

That is the command you want when you are editing this repo and want opencode to load your working tree. Changing files in a checkout does nothing unless opencode is pointed at that checkout path.

If you prefer managing plugin registration manually, add the plugin to the `plugin` list in `~/.config/opencode/opencode.json` or a project-local `.opencode/opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["kimi-oauth-bridge"]
}
```

For a local checkout, point the `plugin` entry at the repo root instead of the npm package name:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["/absolute/path/to/kimi-oauth-bridge"]
}
```

If you use a project-local `.opencode/opencode.json`, the plugin only exists when you run `opencode` inside that project tree. If you want `opencode auth login` to work from anywhere, use the `--global` install above.

### Configure

After login, the plugin projects the authenticated catalog before OpenCode initializes the provider and prints a ready-to-paste provider block. Use that generated block when possible: its model ids and variants come directly from Kimi.

If you need a pre-login bootstrap entry, use only the canonical fallback below. It is not an entitlement list; discovery replaces it with the authenticated catalog at runtime:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "kimi-oauth-bridge": {
      "name": "Kimi For Coding (OAuth)",
      "npm": "@ai-sdk/openai-compatible",
      "options": {
        "baseURL": "https://api.kimi.com/coding/v1"
      },
      "models": {
        "kimi-for-coding": {
          "name": "Kimi For Coding"
        }
      }
    }
  }
}
```

> **Important:** Do not predeclare entitlement-gated models or static thinking levels. The authenticated catalog supplies media support and variants per model, and the plugin backfills that runtime metadata before opencode transforms the request.

This block is for using the model after login. It does **not** register the auth provider by itself. What makes `opencode auth login -p kimi-oauth-bridge` work is the plugin being loaded via `opencode plugin ...` or the `plugin` array above.

Use these ids exactly as written:

- **provider id** `kimi-oauth-bridge` -- the plugin's `auth` and `chat.params` hooks match on it.
- **bootstrap model id** `kimi-for-coding` -- retained only as the cold fallback before a successful authenticated discovery.

After discovery, select one of these exact wire ids; the labels are what OpenCode displays:

| Wire id | Label |
|---|---|
| `kimi-for-coding` | K2.7 |
| `kimi-for-coding-highspeed` | K2.7 HighSpeed |
| `k3` | K3 (1M) |
| `k3-256k` | K3 (256K) |

K2.7 has one visible always-on `on` variant, not synthetic `low`, `medium`, or `high` effort levels. Do not substitute Moonshot Platform ids.

> **Note.** The provider id is intentionally not `kimi-for-coding`. That id is already published by [models.dev](https://models.dev) and points at a static-API-key flow using a different SDK and auth shape. Using a distinct id keeps the two paths from colliding under a single `opencode auth login` entry.

### Log in

```sh
opencode auth login -p kimi-oauth-bridge
```

Then complete the device-flow approval in your browser.

During login the plugin:

- shows a verification URL and user code
- stores the OAuth token in opencode's auth store
- discovers every Kimi Code model your account is entitled to, with its exact id, display name, context length, tools, media, and thinking capabilities
- projects that full catalog before provider initialization and prints a config hint with variants at each model's top level

Access tokens refresh automatically while you use the model.

<details>
<summary><strong>Troubleshooting: Unknown provider "kimi-oauth-bridge"</strong></summary>

That error means opencode did not load this plugin at all. The Kimi OAuth flow has not started yet.

The usual causes are:

- You skipped `opencode plugin kimi-oauth-bridge --global` or `opencode plugin /absolute/path/to/kimi-oauth-bridge --global`.
- You edited a local checkout, but opencode is not pointed at that checkout path.
- You put the plugin in a project-local `.opencode/opencode.json`, but ran `opencode auth login` from another directory.
- You added the `provider` block, but not the `plugin` entry or plugin install.

Fastest fix:

1. Install the plugin globally with `opencode plugin kimi-oauth-bridge --global`, or `opencode plugin /absolute/path/to/kimi-oauth-bridge --global` for a checkout.
2. Confirm your opencode config now contains the plugin entry.
3. Run `opencode auth login -p kimi-oauth-bridge` again.

</details>

<details>
<summary><strong>Troubleshooting: Images not working / "this model does not support image input"</strong></summary>

opencode gates image input on model metadata. The plugin applies `attachment`, `modalities`, and input capabilities from the authenticated model entry before opencode transforms the request.

Fix: log in again or refresh the model list, then select a catalog model whose discovered metadata includes image input. Do not force image support into a bootstrap entry for a model Kimi has not confirmed for your account.

If a generated config block is stale after an entitlement change, replace it with the newest login hint.

</details>

<details>
<summary><strong>Login and refresh details</strong></summary>

- The plugin queries `/coding/v1/models` during login and on refresh to discover the complete current account catalog. In OpenCode 1.18.5, non-Models.dev providers skip the generic `provider.models` hook, so the plugin eagerly projects the authenticated catalog through its async `config` hook before provider initialization; `provider.models` remains for compatible hosts. A successful nonempty response removes stale configured ids; a failed or empty response leaves the cold fallback or last known-good catalog intact.
- The plugin uses each model's discovery response to backfill context, tool use, image/video support, and thinking variants into opencode's runtime metadata, so pasted or dropped images reach Kimi instead of being downgraded into local error text.
- Each generated model uses `limit: { context: context_length, output: 0 }`; `output: 0` uses OpenCode's default output ceiling rather than asserting a Kimi output limit. When Kimi metadata lacks `low`, `medium`, or `high`, the generated config adds a `{ disabled: true }` sentinel so OpenCode does not offer that synthetic effort level.
- Model discovery runs again on every token refresh, and a fresh loader instance can re-query `/coding/v1/models` on first use. Catalog metadata stays in memory only and is never persisted into opencode's `auth.json`.
- On a `401`, the loader refreshes the access token once and retries the request once.
- Refreshes are coordinated through opencode's live auth store so concurrent workspaces do not keep using an older refresh-token chain from a stale `OPENCODE_AUTH_CONTENT` snapshot.

</details>

### Debug logging

Set `KIMI_OAUTH_BRIDGE_DEBUG_LOG=1` when launching opencode to append each Kimi-bound request's timestamp, source, method, URL, and User-Agent to `~/.kimi/kimi-oauth-bridge-debug.log`; Authorization, cookies, and request bodies are never logged. Values `1` and `true` use that default path, while any other non-empty value except `0` or `false` is treated as a custom log path. An unset value, an empty value, `0`, or `false` disables logging without touching a file.

```sh
KIMI_OAUTH_BRIDGE_DEBUG_LOG=1 opencode serve ...
```

### Use

Select `kimi-oauth-bridge/<exact-discovered-id>` in opencode. The id in the request body remains exactly the selected catalog id; the plugin never aliases a dynamic selection to another discovered model.

---

## OpenClaw

This plugin also ships as an **OpenClaw** provider plugin. The same host-neutral core drives both hosts, so the OAuth device flow, the 7 `X-Msh-*` fingerprint headers, the catalog discovery, and the thinking/`prompt_cache_key` body fields are identical across hosts.

### Install (OpenClaw)

From a local checkout:

```sh
openclaw plugins install --link /absolute/path/to/kimi-oauth-bridge
```

This registers the plugin via `package.json#openclaw.extensions`, pointing at `src/adapters/openclaw/index.ts`. For production use, the built bundle (`dist/openclaw.js`, with `openclaw` externalized) is referenced via `package.json#openclaw.runtimeExtensions`.

### Log in (OpenClaw)

```sh
openclaw models auth login --provider kimi-oauth-bridge --method device-code
```

Open the verification URL, enter the device code, and approve in your browser. The token enters OpenClaw's auth-profile store (the plugin never persists tokens itself).

### Use (OpenClaw)

```sh
openclaw models
```

Lists every Kimi Code model your account is entitled to. Select one and start chatting. The OpenClaw `openai-completions` transport handles streaming; `wrapStreamFn` injects the fingerprint headers and the Kimi `thinking` body field; `prepareExtraParams` resolves the declarative `reasoning_effort`/`thinking` pair from the catalog model's metadata.

### Behavior notes (OpenClaw)

- **OAuth-only:** the plugin enforces the OAuth-only contract — a static `KIMI_API_KEY` is never used for discovery or runtime. If no OAuth profile is configured, the catalog falls back to the cold `kimi-for-coding` model.
- **Scoped catalog cache:** discovery is scoped per `(agentDir, workspaceDir)`, so a profile or agent switch does not inherit another scope's discovered models.
- **Refresh:** `refreshOAuth` is the single refresh path; OpenClaw calls it on token expiry. Same-request 401 retry is host-dependent and treated as a live-integration probe item (see AGENTS.md).

---

### Use (OpenCode)

The default variant-cycle keybind is **Ctrl+T**. Available variants are capability-derived for the selected model:

- Models with no reasoning support, or `supports_thinking_type: "no"`, expose no thinking fields or thinking variants.
- `supports_thinking_type: "only"` stays enabled and exposes one visible `on` variant, never an off or fake effort-level variant. This is how the standard and highspeed K2.7 Kimi Code entries avoid routing a disabled-thinking selection away from the selected model.
- `supports_thinking_type: "both"` without effort support exposes `off` and `on` modes.
- When `think_efforts.support` is true, variants are exactly the server-provided `valid_efforts`; the server-provided `default_effort` is used by default. For example, an entitled K3 `max` variant sends `reasoning_effort: "max"` unchanged.

These variants only affect Kimi's reasoning request fields. They do not switch models or auth paths.

Every currently managed Kimi Code catalog request gets `prompt_cache_key` set to opencode's session id. That mirrors `kimi-cli`'s cache hint so follow-up turns in the same session can reuse Kimi's prompt cache. Other providers never receive it.

#### Usage command

The plugin registers a `/kimi:usage` TUI slash command that shows your Kimi Code subscription usage (weekly and rolling-window limits) in a compact dialog. Run it from the opencode command palette.

---

<details>
<summary><strong>Why this plugin exists</strong></summary>

Stock opencode can already talk to generic Moonshot and OpenAI-compatible endpoints. This plugin exists for the Kimi Code path specifically: it brings the official Kimi OAuth flow and Kimi-specific request behavior into opencode without sharing `kimi-cli`'s credential files.

**What it adds over the generic route.**

- OAuth device flow against `https://auth.kimi.com`.
- `@ai-sdk/openai-compatible` pointed at `https://api.kimi.com/coding/v1`.
- `prompt_cache_key` set to opencode's session id for every managed catalog model, for session-scoped cache reuse.
- Per-model `thinking` + `reasoning_effort` fields derived from Kimi's current capability metadata, without invented effort levels or clamping an official value such as `max`.
- The seven `X-Msh-*` headers and a kimi-cli-shaped `User-Agent`.
- `~/.kimi/device_id` shared with a locally-installed kimi-cli.
- Runtime model discovery from `/coding/v1/models`, including every entitled exact id plus `display_name`, `context_length`, protocol, tool use, media-input, and thinking capabilities.
- Tokens stored in opencode's auth store under a dedicated provider id, so the plugin and kimi-cli keep independent refresh-token chains and do not invalidate each other.
- Live auth-store rereads plus a provider-scoped refresh lock, so concurrent opencode workspaces converge on the latest refresh-token chain instead of tripping `invalid_grant`.
- Streaming, `reasoning_content` deltas, and tool-call schemas are handled upstream by `@ai-sdk/openai-compatible` -- not reimplemented here.

</details>

<details>
<summary><strong>Request fields in detail</strong></summary>

| Field | Wire shape | Purpose |
|---|---|---|
| `prompt_cache_key` | top-level body, snake_case, set to opencode's `sessionID` | Added only for models in this provider's current catalog; enables session-scoped cache reuse. |
| `thinking` + `reasoning_effort` | `thinking: { type: "enabled" \| "disabled" }` with optional sibling `reasoning_effort` | Derived from `supports_reasoning`, `supports_thinking_type`, and `think_efforts`; official effort values are preserved exactly. |
| Seven `X-Msh-*` headers + UA | `User-Agent`, `X-Msh-Platform`, `X-Msh-Version`, `X-Msh-Device-Name`, `X-Msh-Device-Model`, `X-Msh-Device-Id`, `X-Msh-Os-Version` | Matches kimi-cli's `_common_headers()` at the pinned `KIMI_CLI_VERSION`. |
| `/coding/v1/models` discovery | `id`, `display_name`, `context_length`, `protocol`, tool/media/thinking capability fields | Supplies the authoritative, in-memory model catalog and runtime metadata. |
| `~/.kimi/device_id` | UUID persisted on disk, embedded in `X-Msh-Device-Id` | Sends the same `X-Msh-Device-Id` as a locally-installed kimi-cli. |

Thinking-field mapping is model-specific rather than a global effort table. A selected effort is sent only when that model's `valid_efforts` includes it; always-thinking models send enabled thinking and no off variant; no-reasoning models send neither thinking field.

</details>

<details>
<summary><strong>Files the plugin touches</strong></summary>

| Path | Purpose |
|---|---|
| `~/.kimi/device_id` | Stable UUID used in `X-Msh-Device-Id`. Shared with kimi-cli. |
| opencode auth store (`auth.json` in opencode's XDG data dir; on Linux typically `~/.local/share/opencode/auth.json`) | Token storage, managed by opencode through `client.auth.*`; the plugin also live-reads this entry to avoid stale workspace auth snapshots during refresh. |

No other state is persisted. Credentials are never written to `~/.kimi/credentials/`; that path belongs to kimi-cli, and sharing it would cause refresh-token races between the two clients.

</details>

<details>
<summary><strong>Architecture at a glance</strong></summary>

```
                      opencode core
 ──────────────────────────────────────────────────
  auth.login ──> plugin.auth.authorize()     device-code flow, poll
                   └──> oauth.ts

  chat ────────> plugin.loader()             custom fetch that:
                   ├──> ensureFresh()          proactive refresh
                   └──> kimiHeaders()          7 X-Msh-* headers
                                                /models catalog discovery
                                               401 -> force-refresh + retry

  chat.params ─> plugin "chat.params"        thinking / reasoning_effort /
                                              prompt_cache_key

  /kimi:usage ─> tui.tsx                     subscription usage dialog
                   └──> usage.ts
```

A full description of the invariants that keep this working is in [`AGENTS.md`](./AGENTS.md), under "Architecture" and "Contracts to keep intact".

</details>

### License

MIT.
