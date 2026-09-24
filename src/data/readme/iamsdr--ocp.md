# @iamsdr/ocp

An OpenCode V2 plugin that connects **any OpenAI-compatible `/v1` endpoint** and
loads its models into OpenCode at startup. It supports multiple providers with
an interactive setup script.

> **OpenCode V2 only.** This release uses `Plugin.define({ id, setup })` and the
> V2 provider transform API. It does not support OpenCode V1 plugin runtimes.

## Features

- Fetches `GET /v1/models` when the plugin loads.
- Registers every enabled provider through `ctx.provider.transform`.
- Preserves all enabled providers; it is not limited to a single provider.
- Keeps API keys in OpenCode's `auth.json` and provider metadata in a separate
  registry file.
- Maps context/output limits, modalities, tool support, reasoning metadata, and
  per-million-token pricing where the upstream endpoint exposes them.
- Supports per-provider enable/disable and include/exclude model filters.
- Runs a connectivity check before saving a provider.
- Soft-fails an unavailable provider without preventing OpenCode from starting.

## Requirements

- OpenCode `2.x`
- Node.js `20+` when installing directly from GitHub
- An OpenAI-compatible `/v1/models` endpoint

## Install

### OpenCode CLI (recommended)

```bash
opencode plugin add @iamsdr/ocp
```

Restart OpenCode after changing plugins or provider configuration.

### Manual configuration

```jsonc
// ~/.config/opencode/opencode.jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["@iamsdr/ocp"]
}
```

OpenCode V2 uses `plugins` (plural). The old V1 `plugin` key is accepted only for
V1 configuration compatibility; a V1 plugin implementation itself cannot run in
V2.

### From GitHub

Install the latest unreleased `main` branch:

```bash
opencode plugin add github:IAMSDR/ocp
```

Or pin a commit or tag:

```bash
opencode plugin add github:IAMSDR/ocp#<commit-or-tag>
```

GitHub installs run `npm run prepare` (TypeScript compilation), so Node.js and
TypeScript must be available in the install environment.

## Add a provider

```bash
npx @iamsdr/ocp
# or
bunx @iamsdr/ocp
# or, after installing as a dependency
ocp-setup
```

Choose **Add provider**, then enter:

- Provider ID — the prefix used in model references such as `local9/gpt-5`
- Display name
- Base URL, usually ending in `/v1`
- API key, when required

The setup script can list, add, edit, enable/disable, test, filter, and remove
providers. It does not require the plugin to be loaded and OpenCode does not need
to be running.

After changing providers, restart OpenCode or reload its configuration.

## Storage

| Data | Path | Notes |
| --- | --- | --- |
| Provider registry | `~/.config/opencode/ocp-providers.json` | IDs, names, URLs, state, headers, and filters |
| API keys | `~/.local/share/opencode/auth.json` | Existing entries are preserved |

Both files are written with mode `600`. The paths respect `OCP_CONFIG_DIR` and
`OPENCODE_DATA_DIR` / `OCP_DATA_DIR` environment overrides.

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
      "apiKeyRef": "local9",
      "headers": { "X-Tenant": "acme" },
      "models": {
        "include": ["gpt-*"],
        "exclude": ["*-preview"]
      }
    }
  }
}
```

- `apiKeyRef` defaults to the provider ID.
- `headers` are applied as provider request headers.
- Missing or empty `include` means all models.
- Exclude patterns always win.
- Patterns support exact IDs, slash-suffixed IDs, leading/trailing wildcards,
  and `*`.

## How loading works

At plugin setup OpenCode:

1. Reads `ocp-providers.json` and the API keys from `auth.json`.
2. Fetches `/v1/models` for each enabled provider. Versioned base URLs are used
   as supplied; bare hosts also try `/v1/models` and `/models`.
3. Applies model filters and removes duplicate model IDs.
4. Maps each model to OpenCode V2's `Model.Info` shape.
5. Registers the provider with `ctx.provider.transform()` using
   `@opencode/ai/providers/openai-compatible`.
6. Soft-fails an unreachable provider: it is logged and skipped without breaking
   OpenCode startup.

The current implementation loads once when the plugin is set up. It does not
periodically poll or refresh models during the same OpenCode session.

## Model mapping

Raw `/v1/models` entries are mapped to OpenCode's V2 catalog:

| OpenCode field | Source (first match wins) |
| --- | --- |
| `limit.context` | `context_length`, `capabilities.contextWindow`, `context_window`, `context`, `limit.context`; default `128000` |
| `limit.output` | `max_completion_tokens`, `capabilities.maxOutput`, `max_output_tokens`, `max_tokens`, `limit.output`; default `4096` |
| `capabilities.tools` | `capabilities.tools`, `capabilities.tool_calling`, `tool_call`, `tools` |
| `capabilities.input` | vision/PDF/audio/video flags or `input_modalities` |
| `capabilities.output` | output capability flags or `output_modalities` |
| `cost` | `pricing.input`/`output`, `pricing.prompt`/`completion`, or `cost.*`; token prices are scaled to per-million values |
| `time.released` | `release_date`, `releaseDate`, `created`, or `created_at` |

Unknown or unsupported fields use safe defaults rather than dropping the model.
V2's shared `Model.Info` capabilities primarily expose tools and input/output
modalities; provider-specific reasoning fields are left to the selected protocol
rather than guessed from a generic `reasoning` flag.

## Development

```bash
npm install
npm run typecheck
npm test
npm run build
```

Source layout:

```text
src/
  index.ts            # OpenCode V2 plugin entry
  lib.ts              # reusable library API
  catalog.ts
  log.ts
  paths.ts
  config/
    registry.ts
    auth.ts
  fetch/
    models.ts
  map/
    model.ts
    capabilities.ts
    cost.ts
    filters.ts
    util.ts
  bin/
    setup.ts
```

Reusable helpers are available from `@iamsdr/ocp/lib`; the package entry exports
only the OpenCode plugin definition.

## Troubleshooting

### Plugin reports that it must export an `id` and `setup`

The installed package is an older V1 build. Upgrade `@iamsdr/ocp`, remove the old
plugin from the OpenCode cache if necessary, and run:

```bash
opencode reload
```

### Provider is skipped

Check the OpenCode log for the provider ID and connection error. Then run the
setup script's **Test connection** action or manually check:

```bash
curl -H "Authorization: Bearer $API_KEY" "$BASE_URL/models"
```

### Verify the V2 plugin is active

```bash
opencode plugin list
```

The plugin should appear under its package ID without a load error. You can also
inspect loaded models with:

```bash
opencode models
```

## Publishing

```bash
npm test
npm pack --dry-run
npm publish --access public
```

## License

MIT
