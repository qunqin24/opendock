# @orvix-id/opencode

Official [OpenCode](https://opencode.ai) plugin for **Orvix**, for OpenCode **1.18.29+** and **2.0.21+**.
One installation registers two providers:

| Provider in `/models` | Pays with | Endpoint | Key scope |
| --- | --- | --- | --- |
| **Orvix Coding** (`orvix-coding/*`) | Coding Plan, AI Plan, campaigns | `https://api.orvix.id/coding/v1` | `coding:invoke` |
| **Orvix** (`orvix/*`) | Orvix Credits, Token Plans | `https://api.orvix.id/v1` | `ai:invoke` |

**Bought a Coding Plan? Pick models from Orvix Coding.** The same model under the Orvix provider
bills Orvix Credits, and with an empty balance it fails with `insufficient Orvix Credits` even
though your plan has tokens left. Model names in the picker end in `(Orvix Coding)` or `(Orvix)` so
you can tell them apart. The plugin never switches between the two on an error.

## Quick start (Coding Plan)

1. **Create a key.** In [platform.orvix.id/api-keys](https://platform.orvix.id/api-keys), create a key
   and tick **Orvix Coding** (`coding:invoke`). Tick **AI Router** (`ai:invoke`) too if you also
   want the Orvix provider.
2. **Install the plugin.** Check `opencode --version`:

   | OpenCode | Install |
   | --- | --- |
   | 2.x | `opencode plugin add @orvix-id/opencode@0.3.0` |
   | 1.x | add `"plugin": ["@orvix-id/opencode@0.3.0"]` to `~/.config/opencode/opencode.json` |

3. **Set the key** in the terminal you start OpenCode from:

   ```bash
   export ORVIX_CODING_API_KEY="orv-sk_live_..."
   ```

   Put it in your shell profile (`~/.zshrc`, `~/.bashrc`) or secret manager so new terminals have it.
   On OpenCode 2.x, `/connect orvix-coding` stores the key instead.
4. **Restart OpenCode** and pick a model:

   ```bash
   opencode -m orvix-coding/deepseek-v4.1-flash
   ```

   or `/models` → a model ending in **(Orvix Coding)**. Send a short message to check access.

You do not need a `provider` block in `opencode.json`: the plugin registers both providers. A hand
written `provider.orvix` block from an older guide overrides the plugin's settings for that provider,
so remove it when you install the plugin.

## Installation in detail

### OpenCode 2.x (≥ 2.0.21)

```bash
opencode plugin add @orvix-id/opencode@0.3.0
```

or in `~/.config/opencode/opencode.json` (global) or `opencode.json` in a project:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["@orvix-id/opencode@0.3.0"],
  "model": "orvix-coding/deepseek-v4.1-flash"
}
```

V2 uses OpenCode's native OpenAI-compatible driver. Keys can come from `/connect orvix`,
`/connect orvix-coding`, or the environment variables below. A key stored with `/connect` takes
precedence over the environment, and each provider stores its own: connecting `orvix` does not
connect `orvix-coding`.

### OpenCode 1.x (≥ 1.18.29)

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@orvix-id/opencode@0.3.0"],
  "model": "orvix-coding/deepseek-v4.1-flash"
}
```

OpenCode installs the package when it starts; `npm install -g` is not needed. V1 uses the
`@ai-sdk/openai-compatible` driver. Coding requests carry the session through a request-local
header that the plugin's fetch adapter turns into `session_id` in the JSON body. Custom fetch
implementations are wrapped, not discarded.

**v1 uses `plugin` (singular), v2 uses `plugins` (plural).** Use only the one for your version.

### Keys

| Variable | Used by |
| --- | --- |
| `ORVIX_CODING_API_KEY` | Orvix Coding. Falls back to `ORVIX_API_KEY` when unset. |
| `ORVIX_API_KEY` | Orvix. Never borrows the Coding key. |

One key with both scopes can be shared by setting only `ORVIX_API_KEY`. Scopes grant endpoint
access; the account still needs a plan or balance that pays for the request. A rejected key is not
retried with another credential: 401/403 logs a provider-specific message and that provider lists
no models, while the other provider keeps loading.

## Models

Each provider reads its own catalogue at startup: `GET /coding/v1/models` for Orvix Coding (your
plan's lineup) and `GET /v1/models` for Orvix (managed models plus your project's BYOK models).
Rate limits and gateway errors are retried twice. Without a key or network the plugin falls back to
the lineup it shipped with. Image, video, embedding and rerank routes are left out of the picker.

Model ids drop the `orvix/` prefix: `orvix-coding/glm-5.2` calls `orvix/glm-5.2`. Models with a
verified reasoning profile expose it as variants, e.g. `orvix-coding/glm-5.2#high`; only efforts the
model accepts are offered, because Orvix passes `reasoning_effort` to the upstream unchanged.

## What the plugin does

| Piece | Why |
| --- | --- |
| Two providers on OpenCode's OpenAI-compatible driver | Streaming, tool calls and usage accounting stay OpenCode's own. |
| `session_id` added to agent and compaction requests (Coding) | Orvix keeps a session on the same upstream route and prompt cache only when the body carries `session_id`. Title requests are sent without it. |
| `prompt_cache_key` enabled for every model | Lets cache-aware upstreams group the session as well. |
| `x-orvix-coding-client` headers | Client name and plugin version, for diagnostics only. |

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| `insufficient Orvix Credits` while the Coding Plan has tokens | The model was picked from the **Orvix** provider (`/v1`). Switch to the same model under **Orvix Coding**. |
| `Unsupported package for orvix/...` | A hand-written `provider.orvix` block uses fields from the other OpenCode version. Remove it and let the plugin register the provider. |
| `Model unavailable: orvix-coding/...` | Check `plugin` (v1) or `plugins` (v2), restart, and read `opencode --print-logs`. The model may also be missing from your plan's lineup. |
| No Orvix Coding models | The key is not in OpenCode's environment, or it lacks the **Orvix Coding** scope. |
| Key is set but another account is used | On v2 a key stored with `/connect` wins over the environment. Check that connection. |
| `401 coding:invoke scope required` | The key was created without the **Orvix Coding** scope. |
| `403 coding_not_entitled` | The account has no active Coding Plan (or AI Plan) that covers the request. |
| `429 coding_concurrency_exceeded` | Too many Coding requests in flight. OpenCode retries; `retry_after` is a few seconds. |
| `429 coding_quota_exceeded` | A 5-hour, weekly or monthly window is used up. `resets_at` says when. |

## Updating and migrating

Run the install command again with the new version (v2), or change the version in the `plugin`
array (v1). Replace the existing entry rather than adding a second one, then restart OpenCode.
Restart after changing keys or plans too: discovery runs at startup.

**From `opencode-provider-orvix`.** That community plugin is now part of this one. Its model
catalogue, verified reasoning profiles, transient-error retry and non-chat filtering live here, and
it registers the same `orvix` provider. Replace `opencode-provider-orvix` with
`@orvix-id/opencode@0.3.0` in your plugin list and keep your `ORVIX_API_KEY` and `orvix/*` model
selections. Do not load both plugins. Thanks to [Griko Nibras](https://github.com/grikomsn) for
building it.

**From a hand-written config.** Delete the `provider.orvix` (v1) or `providers.orvix` (v2) block
you copied from an older guide, then install the plugin as above.

For local endpoints, set `ORVIX_BASE_URL` and/or `ORVIX_CODING_BASE_URL`. V1 also respects
`provider.<id>.options.baseURL`. An authenticated empty catalogue stays empty.

Using Pi or Oh My Pi instead? See [@orvix-id/pi](https://github.com/Orvix-id/pi-plugin) and
[@orvix-id/omp](https://github.com/Orvix-id/omp-plugin). Full guide:
[docs.orvix.id/coding-plan](https://docs.orvix.id/coding-plan).

## Development

```bash
bun install
bun run check        # tsc + bun test
bun run probe        # 3 real OpenCode turns against a local mock, reports prefix reuse per request
```

Releases are published from CI when a `v*` tag matching `package.json` is pushed.

## License

MIT
