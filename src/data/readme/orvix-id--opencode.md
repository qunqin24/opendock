# @orvix-id/opencode

[OpenCode](https://opencode.ai) plugin for **Orvix**, supporting OpenCode **1.18.29+** and **2.0.21+**.
One installation registers two independent providers:

| Provider | Endpoint | Environment variable | Required scope |
| --- | --- | --- | --- |
| `orvix` | `https://api.orvix.id/v1` | `ORVIX_API_KEY` | `ai:invoke` |
| `orvix-coding` | `https://api.orvix.id/coding/v1` | `ORVIX_CODING_API_KEY` | `coding:invoke` |

Choose the route explicitly. The plugin never switches endpoints on an error. Orvix determines
funding from your eligible plan, campaign, or other applicable balance; the Coding endpoint is not
exclusive to Coding Plan subscribers. General discovery preserves managed and BYOK model IDs.

## Installation

### OpenCode v1 vs v2: which installation should I use?

**The npm package is the same. The plugin configuration and authentication setup differ.**
Run `opencode --version`, then follow the matching column:

#### OpenCode v1 (≥1.18.29)

Copy this into `~/.config/opencode/opencode.json` (merge with existing settings):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@orvix-id/opencode@0.2.0"]
}
```

#### OpenCode v2 (≥2.0.21)

Run this in your terminal:

```bash
opencode plugin add @orvix-id/opencode@0.2.0
```

Or copy this into `~/.config/opencode/opencode.json` (merge with existing settings):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["@orvix-id/opencode@0.2.0"]
}
```

For either version, set your key in the terminal before starting OpenCode:

```bash
export ORVIX_API_KEY="your-key"
opencode
```

Both versions use `~/.config/opencode/opencode.json` for global settings, or `opencode.json`
in your project for project-only settings. **Choose only the config key for your version**;
do not add both `plugin` and `plugins`. Restart OpenCode after installation.

The steps below include complete configuration examples for each version.

### 1. Check your OpenCode version

```bash
opencode --version
```

Use OpenCode **1.18.29 or newer in the 1.x series**, or **2.0.21 or newer in the 2.x series**.
The configuration key differs: v1 uses `plugin` (singular), v2 uses `plugins` (plural).

### 2. Create an Orvix API key

Open [API Keys](https://platform.orvix.id/api-keys) and create a key with:

- **AI Router** (`ai:invoke`) for the `orvix` provider.
- **Orvix Coding** (`coding:invoke`) for the `orvix-coding` provider.

Enable both scopes to use one key for both providers. Scopes grant endpoint access; your account
still needs the appropriate model entitlement or funding.

### 3. Set the key

If your key has both `ai:invoke` and `coding:invoke`, only set:

```bash
export ORVIX_API_KEY="your-key"
```

Replace `your-key` with your actual key. This command applies to the current terminal and processes
started from it. For future terminals, set it through your secret manager or shell profile
(`~/.zshrc` for zsh, `~/.bashrc` for bash). Do not put your key in a committed project file.

For a separate Coding key, additionally set:

```bash
export ORVIX_CODING_API_KEY="your-coding-key"
```

Coding falls back to this shared key. Set `ORVIX_CODING_API_KEY` to override it with a separate
Coding key. In v2, a key stored through the provider's `/connect` takes precedence over environment
variables. The general provider never borrows the Coding key. A rejected key is not retried with
another credential: 401/403 produces a provider-specific diagnostic and no discovered models for
that provider, while the other provider continues loading. Explicit user model overrides remain.

### 4. Install for your OpenCode version

#### OpenCode v1

Add the following to `~/.config/opencode/opencode.json` (global), or `opencode.json` in your
project (project-only). Merge it into existing settings rather than replacing the whole file.
OpenCode installs the package when it starts; you do not need `npm install -g`.

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@orvix-id/opencode@0.2.0"],
  "model": "orvix-coding/deepseek-v4-flash"
}
```

Set `ORVIX_API_KEY` and/or `ORVIX_CODING_API_KEY` for the providers you use. V1 uses the
OpenAI-compatible AI SDK driver. Coding requests carry session identity through a request-local
header that the plugin's fetch adapter removes and translates into `session_id` in the JSON body.
No process-global session state is used. Custom fetch implementations are wrapped, not discarded.

#### OpenCode v2

Install using the CLI:

```bash
opencode plugin add @orvix-id/opencode@0.2.0
```

Alternatively, add it to `~/.config/opencode/opencode.json` or your project's `opencode.json`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["@orvix-id/opencode@0.2.0"],
  "model": "orvix/deepseek-v4-flash"
}
```

Use `/connect orvix` or `/connect orvix-coding`, or the environment variables above. V2 uses
OpenCode's native OpenAI-compatible driver. Existing `orvix-coding/*` configuration remains valid.

Stored credentials are separate per provider: connecting `orvix` does not also connect
`orvix-coding`. To share one key with minimal setup, use `ORVIX_API_KEY` as shown above.

### 5. Restart and choose a model

Quit any running OpenCode session, then start it from the terminal where the key is available:

```bash
# General API: managed models and project BYOK models
opencode -m orvix/deepseek-v4-flash

# Coding API
opencode -m orvix-coding/deepseek-v4-flash
```

These are example models; choose one returned by your account's catalog if it differs.
Models with reasoning variants can be selected with a suffix such as
`orvix-coding/glm-5.2#high`. Send a short message to verify access.

## Updating or migrating

For v2, run the installation command with the desired version. For v1, update the version in
the `plugin` array. Replace the existing entry rather than adding the plugin a second time.
The examples above pin `0.2.0` so the installed release is explicit.

Replace `opencode-provider-orvix` in your plugin list when migrating from the community plugin;
both register `orvix`. Keep your existing `orvix/*` model selections and `ORVIX_API_KEY`.
Do not load both plugins for the same provider. Restart OpenCode after installation or configuration
changes. Discovery runs at startup; restart after changing keys or plan entitlements as well.

For local endpoints, set `ORVIX_BASE_URL` and/or `ORVIX_CODING_BASE_URL`. V1 also respects
`provider.<id>.options.baseURL`. An authenticated empty catalog stays empty.

Using Pi or Oh My Pi instead? See [@orvix-id/pi](https://github.com/Orvix-id/pi-plugin) and
[@orvix-id/omp](https://github.com/Orvix-id/omp-plugin).

## Models

With a key available, each provider discovers models from its own endpoint: `GET /v1/models` for
`orvix`, and `GET /coding/v1/models` for `orvix-coding`.
Without network access the plugin falls back to the lineup it shipped with. Model ids drop the `orvix/` prefix:
`orvix-coding/glm-5.2` calls `orvix/glm-5.2`.

## What the plugin does

| Piece | Why |
| --- | --- |
| Provider `orvix-coding` on OpenCode's built-in OpenAI-compatible driver | Streaming, tool calls, and usage accounting stay OpenCode's own. |
| `session_id` added to every agent and compaction request | Orvix keeps a session on the same upstream route and prompt cache only when the request body carries `session_id`. OpenCode's session id is reused, so follow-up requests hit the cache. |
| `prompt_cache_key` enabled for every model | Lets cache-aware upstreams group the session as well. |
| `x-orvix-coding-client` header | Reports the client name and plugin version. Used for diagnostics only. |

Session title requests are sent without `session_id`; they use a different, very small prompt.

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| `Model unavailable: orvix/...` or `orvix-coding/...` | Check `plugin` (v1) or `plugins` (v2), restart, and inspect `opencode --print-logs`. The model may also be absent from your account's catalog. |
| Key is set but access still uses another account | In v2, the provider's stored `/connect` credential takes precedence over environment variables. Check that connection. |
| `401 coding:invoke scope required` | The key was created without the **Orvix Coding** scope. |
| `429 coding_concurrency_exceeded` | Too many Coding requests in flight at once. OpenCode retries automatically; `retry_after` is a few seconds. |
| `429 coding_quota_exceeded` | A 5-hour, weekly, or monthly window is used up. `resets_at` says when. |

## Development

```bash
bun install
bun run check        # tsc + bun test
bun run probe        # 3 real OpenCode turns against a local mock, reports prefix reuse per request
```

## License

MIT
