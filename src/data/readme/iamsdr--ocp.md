# @iamsdr/ocp

A small OpenCode plugin that connects **any OpenAI-compatible `/v1` endpoint** and
auto-loads its models into OpenCode's picker at startup. Supports multiple
providers with full CRUD via an interactive setup script.

- Fetches `GET /v1/models` on every OpenCode start/restart.
- Sends models to OpenCode's static catalog **and** (for a single provider) the
  dynamic `provider.models()` hook.
- API keys live in OpenCode's own `auth.json`; provider metadata lives in a
  separate registry file.
- Smart model mapping with fallbacks: context/output limits, vision/tool/reasoning
  flags, modalities, and per-million-token pricing.
- Per-provider enable/disable and include/exclude model filters.
- Health check before saving a provider.

---

## Install

### From npm (recommended)

```bash
npm install @iamsdr/ocp
```

Then add the plugin to your OpenCode config:

```jsonc
// ~/.config/opencode/opencode.jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@iamsdr/ocp"]
}
```

Or install it with the OpenCode CLI:

```bash
opencode plugin @iamsdr/ocp
```

### From GitHub (latest unreleased)

Install directly from the `main` branch — npm will clone, build, and link it:

```bash
npm install github:IAMSDR/ocp
```

Or pin to a specific commit or tag:

```bash
npm install github:IAMSDR/ocp#<commit-or-tag>
# examples:
npm install github:IAMSDR/ocp#88eede6
npm install github:IAMSDR/ocp#v0.2.0
```

> **Note:** GitHub installs run `npm run prepare` (which calls `tsc`) automatically,
> so Node.js and TypeScript are required in the install environment.

Then add to your OpenCode config exactly as above:

```jsonc
{
  "plugin": ["@iamsdr/ocp"]
}
```

### Add a provider

```bash
npx @iamsdr/ocp        # or: bunx @iamsdr/ocp
# or, after installing as a dependency:
ocp-setup
```

Choose **Add provider**, enter an id, display name, base URL, and API key
(optional). The script runs a connectivity check and saves everything.

### Restart OpenCode

OpenCode loads config and plugins once at startup. Quit and relaunch, then pick
`<provider-id>/<model-id>` in the model picker.

---

## Publishing to npm

These steps are for maintainers publishing a new release.

### First-time setup

```bash
npm login           # authenticates with your npm account
```

### Release steps

```bash
# 1. bump the version (patch | minor | major)
npm version patch   # e.g. 0.1.0 -> 0.1.1
# or manually edit "version" in package.json

# 2. build and verify tests pass
npm test

# 3. preview what will be published
npm pack --dry-run

# 4. publish
npm publish --access public

# 5. push the version commit and tag created by `npm version`
git push && git push --tags
```

### Publish a pre-release (beta / rc)

```bash
npm version prerelease --preid=beta   # e.g. 0.2.0-beta.0
npm publish --tag beta --access public
```

Users install it with:

```bash
npm install @iamsdr/ocp@beta
```

### Useful commands

| Command | Purpose |
|---|---|
| `npm pack --dry-run` | List files that would be published |
| `npm pack` | Create a local `.tgz` for manual testing |
| `npm info @iamsdr/ocp` | Check what is live on the registry |
| `npm dist-tag ls @iamsdr/ocp` | List all dist-tags |
| `npm deprecate @iamsdr/ocp@"<0.1.0" "upgrade to 0.1.0"` | Deprecate old versions |

---

## Where things are stored

| What | Path | Notes |
| ---- | ---- | ----- |
| Provider registry | `~/.config/opencode/ocp-providers.json` | ids, names, base URLs, flags, filters (mode `600`) |
| API keys | `~/.local/share/opencode/auth.json` | entries `{ "type": "api", "key": "...", "baseURL": "..." }` (mode `600`) |

Both paths respect `OCP_CONFIG_DIR` and `OPENCODE_DATA_DIR` / `OCP_DATA_DIR`
environment overrides (useful for testing).

Existing entries in `auth.json` are preserved — the plugin only ever touches the
providers it owns.

---

## Registry format

```jsonc
{
  "version": 1,
  "providers": {
    "local9": {
      "id": "local9",
      "name": "Local 9Router",
      "baseURL": "http://localhost:20127/v1",
      "enabled": true,
      "apiKeyRef": "local9",              // key name in auth.json; defaults to id
      "headers": { "X-Tenant": "acme" },  // optional extra inference headers
      "models": {                          // optional allow/block lists
        "include": ["gpt-*"],              // empty/absent = all
        "exclude": ["*-preview"]
      }
    }
  }
}
```

Filter patterns support exact ids (`gpt-5`), bare suffixes (`gpt-5` also matches
`openai/gpt-5`), and wildcards (`claude-*`, `*-free`, `*`). **Exclude always
wins.**

---

## Setup script

`ocp-setup` is an arrow-key menu:

- **List providers** — id, name, state, masked key, base URL.
- **Add provider** — prompts for id/name/URL/key, then an optional connectivity check.
- **Edit provider** — change name, base URL, rotate the key.
- **Enable / disable** — toggle without deleting credentials.
- **Test connection** — re-run the health check (`GET /v1/models`) and report the count.
- **Edit model filters** — per-provider include/exclude lists.
- **Remove provider** — deletes the registry entry and its `auth.json` key.

The setup script does **not** require the plugin to be loaded, and OpenCode does
**not** need to be running.

---

## Model mapping

Raw `/v1/models` entries are mapped to OpenCode's catalog with sensible
fallbacks:

| OpenCode field | Source (first match wins) |
| -------------- | ------------------------- |
| `limit.context` | `context_length`, `capabilities.contextWindow`, `context_window`, `context`, `limit.context` → default `128000` |
| `limit.output` | `max_completion_tokens`, `capabilities.maxOutput`, `max_output_tokens`, `max_tokens`, `limit.output` → default `4096` |
| `attachment` | `capabilities.vision`/`pdf`, or `input_modalities` containing `image`/`pdf` |
| `tool_call` | `capabilities.tools`/`tool_calling`, `tool_call`, `tools` |
| `reasoning` | `capabilities.reasoning`/`thinking`, `reasoning`, `thinking` |
| `modalities` | derived from vision/pdf/audio/video flags or `input_modalities`/`output_modalities` |
| `cost` | `pricing.input`/`output` (per-million), `pricing.prompt`/`completion` (per-token, ×1e6), `cost.*` |

Unknown fields fall back to safe defaults rather than breaking the model.

---

## How loading works

At OpenCode startup the plugin:

1. Reads `ocp-providers.json` and `auth.json`.
2. For each **enabled** provider, fetches `/v1/models` (versioned URL first, then
   `/models`; 10s timeout, one retry; Bearer auth when a key is present).
3. Filters the models and writes a `config.provider.<id>` block
   (`npm: "@ai-sdk/openai-compatible"`, `options.baseURL`, `options.apiKey`, `models`).
4. Soft-fails per provider: an unreachable endpoint is logged and skipped, never
   breaking OpenCode startup.

When exactly one provider is enabled (or `providerId` is passed as a plugin
option), the plugin also registers the dynamic `provider.models()` hook for live
model resolution.

---

## Suggested / possible next features

These are not implemented yet — good candidates if you want to grow the plugin:

- **TTL refresh + disk snapshot** — keep working when the gateway is briefly down,
  and refresh within a session without a restart.
- **A `/models` refresh tool** — force-refresh the catalog from inside OpenCode.
- **Provider display-name tags** — prefix model names so duplicates from different
  upstreams are distinguishable.
- **Cost overlays from a management API** — pull curated names/pricing beyond what
  `/v1/models` exposes.
- **Per-model overrides** — hand-tuned names, limits, or flags.

---

## Development

```bash
npm install
npm run typecheck   # tsc --noEmit
npm run build       # tsc -> dist/
npm test            # tsc + vitest
```

Source layout:

```
src/
  index.ts            # plugin entry (default export only)
  lib.ts              # reusable library API (import from "@iamsdr/ocp/lib")
  catalog.ts
  log.ts
  paths.ts
  config/{registry,auth}.ts
  fetch/models.ts
  map/{model,capabilities,cost,filters,util}.ts
  bin/setup.ts        # interactive CLI
```

> **Note:** the plugin entry intentionally exports only the default plugin
> function. OpenCode's plugin loader iterates every module export and rejects
> non-functions, so the reusable helpers live in `@iamsdr/ocp/lib`.

## License

MIT


---

## Where things are stored

| What | Path | Notes |
| ---- | ---- | ----- |
| Provider registry | `~/.config/opencode/ocp-providers.json` | ids, names, base URLs, flags, filters (mode `600`) |
| API keys | `~/.local/share/opencode/auth.json` | entries `{ "type": "api", "key": "...", "baseURL": "..." }` (mode `600`) |

Both paths respect `OCP_CONFIG_DIR` and `OPENCODE_DATA_DIR` / `OCP_DATA_DIR`
environment overrides (useful for testing).

Existing entries in `auth.json` are preserved — the plugin only ever touches the
providers it owns.

---

## Registry format

```jsonc
{
  "version": 1,
  "providers": {
    "local9": {
      "id": "local9",
      "name": "Local 9Router",
      "baseURL": "http://localhost:20127/v1",
      "enabled": true,
      "apiKeyRef": "local9",              // key name in auth.json; defaults to id
      "headers": { "X-Tenant": "acme" },  // optional extra inference headers
      "models": {                          // optional allow/block lists
        "include": ["gpt-*"],              // empty/absent = all
        "exclude": ["*-preview"]
      }
    }
  }
}
```

Filter patterns support exact ids (`gpt-5`), bare suffixes (`gpt-5` also matches
`openai/gpt-5`), and wildcards (`claude-*`, `*-free`, `*`). **Exclude always
wins.**

---

## Setup script

`ocp-setup` is an arrow-key menu:

- **List providers** — id, name, state, masked key, base URL.
- **Add provider** — prompts for id/name/URL/key, then an optional connectivity check.
- **Edit provider** — change name, base URL, rotate the key.
- **Enable / disable** — toggle without deleting credentials.
- **Test connection** — re-run the health check (`GET /v1/models`) and report the count.
- **Edit model filters** — per-provider include/exclude lists.
- **Remove provider** — deletes the registry entry and its `auth.json` key.

The setup script does **not** require the plugin to be loaded, and OpenCode does
**not** need to be running.

---

## Model mapping

Raw `/v1/models` entries are mapped to OpenCode's catalog with sensible
fallbacks:

| OpenCode field | Source (first match wins) |
| -------------- | ------------------------- |
| `limit.context` | `context_length`, `capabilities.contextWindow`, `context_window`, `context`, `limit.context` → default `128000` |
| `limit.output` | `max_completion_tokens`, `capabilities.maxOutput`, `max_output_tokens`, `max_tokens`, `limit.output` → default `4096` |
| `attachment` | `capabilities.vision`/`pdf`, or `input_modalities` containing `image`/`pdf` |
| `tool_call` | `capabilities.tools`/`tool_calling`, `tool_call`, `tools` |
| `reasoning` | `capabilities.reasoning`/`thinking`, `reasoning`, `thinking` |
| `modalities` | derived from vision/pdf/audio/video flags or `input_modalities`/`output_modalities` |
| `cost` | `pricing.input`/`output` (per-million), `pricing.prompt`/`completion` (per-token, ×1e6), `cost.*` |

Unknown fields fall back to safe defaults rather than breaking the model.

---

## How loading works

At OpenCode startup the plugin:

1. Reads `ocp-providers.json` and `auth.json`.
2. For each **enabled** provider, fetches `/v1/models` (versioned URL first, then
   `/models`; 10s timeout, one retry; Bearer auth when a key is present).
3. Filters the models and writes a `config.provider.<id>` block
   (`npm: "@ai-sdk/openai-compatible"`, `options.baseURL`, `options.apiKey`, `models`).
4. Soft-fails per provider: an unreachable endpoint is logged and skipped, never
   breaking OpenCode startup.

When exactly one provider is enabled (or `providerId` is passed as a plugin
option), the plugin also registers the dynamic `provider.models()` hook for live
model resolution.

---

## Suggested / possible next features

These are not implemented yet — good candidates if you want to grow the plugin:

- **TTL refresh + disk snapshot** — keep working when the gateway is briefly down,
  and refresh within a session without a restart.
- **A `/models` refresh tool** — force-refresh the catalog from inside OpenCode.
- **Provider display-name tags** — prefix model names so duplicates from different
  upstreams are distinguishable.
- **Cost overlays from a management API** — pull curated names/pricing beyond what
  `/v1/models` exposes.
- **Per-model overrides** — hand-tuned names, limits, or flags.

---

## Development

```bash
npm install
npm run typecheck   # tsc --noEmit
npm run build       # tsc -> dist/
npm test            # tsc + vitest
```

Source layout:

```
src/
  index.ts            # plugin entry (default export only)
  lib.ts              # reusable library API (import from "@iamsdr/ocp/lib")
  catalog.ts
  log.ts
  paths.ts
  config/{registry,auth}.ts
  fetch/models.ts
  map/{model,capabilities,cost,filters}.ts
  bin/setup.ts        # interactive CLI
```

> **Note:** the plugin entry intentionally exports only the default plugin
> function. OpenCode's plugin loader iterates every module export and rejects
> non-functions, so the reusable helpers live in `@iamsdr/ocp/lib`.

## License

MIT