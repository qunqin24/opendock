# opencode-actualyze

[![CI](https://github.com/actualyze-ai/opencode-actualyze/actions/workflows/ci.yml/badge.svg)](https://github.com/actualyze-ai/opencode-actualyze/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/opencode-actualyze)](https://www.npmjs.com/package/opencode-actualyze)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

The first-party [opencode](https://github.com/opencode-ai/opencode) plugin
for [Actualyze](https://actualyze.ai): point it at your Actualyze server with
a personal access token and opencode's model picker fills with exactly the
models your token can invoke — correct context windows, output limits, and
capability flags, with zero manual model configuration.

## Quick Start

```bash
opencode plugin opencode-actualyze
```

Then add an Actualyze provider to your `opencode.json`. Two details matter:
the OpenAI-compatible surface lives at `https://app.actualyze.ai/openai/v1`,
and your personal access token (PAT) goes in `apiKey`:

```json
{
  "provider": {
    "actualyze": {
      "npm": "@ai-sdk/openai-compatible",
      "options": {
        "baseURL": "https://app.actualyze.ai/openai/v1",
        "apiKey": "<your PAT>",
        "probe": "actualyze"
      }
    }
  }
}
```

Restart opencode. The model picker now lists exactly the models your PAT can
invoke — workspace- and team-scoped — each with accurate context window
sizes, output limits, and capability flags (tool calling, vision, reasoning)
discovered automatically.

## The Problem

The standard OpenAI-compatible model listing reports almost nothing about
what each model can actually do. Without this plugin, opencode sees only bare
model IDs from Actualyze — no context window, no output limit, no capability
flags. It can't size requests correctly (oversized `max_tokens` produces 400
errors), can't tell whether tool calling or vision are available, and can't
distinguish models in the picker.

**opencode-actualyze** fixes this with a 3-layer metadata enrichment pipeline
that runs at startup. It discovers every model your PAT can invoke, fetches
authoritative per-model metadata from Actualyze's enriched model endpoints,
and falls back to the [models.dev](https://models.dev) database for anything
still missing. The result: every discovered model gets accurate context
limits, capability flags, and modality information — automatically, with zero
manual configuration.

## How It Works

The plugin runs during opencode's config hook (before any session starts) and
enriches model entries through three layers, applied in order:

1. **Discovery + keyword categorization** — Queries `GET /v1/models` to get
   the raw model list your PAT can see. Model IDs are categorized as chat,
   embedding, or unknown based on name patterns.

2. **The Actualyze probe** — When the provider has `"probe": "actualyze"` (or
   `"probe": "auto"`) in its options, the probe fetches each model's detail
   endpoint, which exposes the metadata the generic OpenAI listing does not:
   exact context window, max output tokens, and capability flags. The probe is
   the most authoritative source and overrides keyword guesses.

3. **models.dev fallback** — For any model that still has gaps after probing,
   the plugin matches the model ID against opencode's built-in
   [models.dev](https://models.dev) database (~4,000 models) using family +
   parameter size matching. This fills in capability flags like `tool_call`,
   `reasoning`, and `attachment` for models the probes don't cover.

Each layer only sets fields that aren't already present — manually configured
metadata in your `opencode.json` is never overwritten, and probes always take
priority over models.dev guesses.

## Installation

**The `opencode plugin` CLI is the recommended way to install in every case.**
It reads the package manifest and registers the plugin in **both**
`opencode.json` (the server plugin that runs model discovery) **and**
`tui.json` (the TUI plugin that provides the `/actualyze` dialog) for you. The
spec it accepts can be an npm package name (preferred), a `github:` reference,
or a local `file://` path:

```bash
# From npm (recommended)
opencode plugin opencode-actualyze

# From GitHub (tracks the repo instead of a published release)
opencode plugin github:actualyze-ai/opencode-actualyze

# From a local checkout (development)
opencode plugin file:///absolute/path/to/opencode-actualyze
```

After installation, add provider configuration with the `probe` field — see
[Configuration](#configuration) below.

> **Why two files?** opencode loads **server** plugins from the `plugin` array
> in `opencode.json` and **TUI** plugins from a _separate_ `plugin` array in
> `tui.json`. The server side drives startup model discovery; the TUI side
> drives the `/actualyze` dialog. `opencode plugin …` writes both. If you
> configure the plugin by hand, you **must** add it to both files or the
> `/actualyze` command will not appear (see [Manual configuration](#manual-configuration)).

### Manual configuration

If you prefer to edit config by hand (or install the package yourself), add the
plugin to **both** files. Use the same spec in each — the npm package name
(optionally pinned, e.g. `opencode-actualyze@1.6.2`), a `github:` reference,
or a `file://` path:

`~/.config/opencode/opencode.json` (server — model discovery):

```json
{
  "plugin": ["opencode-actualyze"]
}
```

`~/.config/opencode/tui.json` (TUI — the `/actualyze` dialog):

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["opencode-actualyze"]
}
```

For a local checkout, clone and build first, then reference the directory with a
`file://` path in both config files:

```bash
git clone https://github.com/actualyze-ai/opencode-actualyze.git
cd opencode-actualyze
npm install
npm run compile
```

```json
{
  "plugin": ["file:///absolute/path/to/opencode-actualyze"]
}
```

## Configuration

The full provider block from the [Quick Start](#quick-start):

```json
{
  "provider": {
    "actualyze": {
      "npm": "@ai-sdk/openai-compatible",
      "options": {
        "baseURL": "https://app.actualyze.ai/openai/v1",
        "apiKey": "<your PAT>",
        "probe": "actualyze"
      }
    }
  }
}
```

The `probe` field **must** be inside `options`, not at the provider top level,
because opencode's provider schema rejects unknown top-level fields. `"probe":
"auto"` also works — the plugin recognizes Actualyze from the `/v1/models`
response automatically.

The Actualyze probe reuses the `/v1/models` response, then fetches encoded
`/v1/models/{id}` detail endpoints with a bounded worker pool. Requests inherit
the config-hook abort signal, and one failed model does not discard metadata
from the others. The probe is tested against a live Actualyze endpoint.

Actualyze reports capability booleans authoritatively. A reported `false` blocks
a models.dev fallback from enabling that capability, but the final opencode
config still omits false flags. Missing, malformed, or otherwise unknown values
remain eligible for fallback enrichment.

## `/actualyze` Command

Inspect the discovered models in a TUI dialog:

```
/actualyze    Open a dialog listing discovered models with metadata
```

Selecting `/actualyze` from the slash autocomplete opens a scrollable dialog —
it never sends a message to the model and never starts an assistant turn. Press
**`esc`** to close it.

Models are grouped by provider. Each model is shown on two compact lines: its
id on the first, and a detail line with model type, context/output limits
(compact, e.g. `ctx 262K`), and capability flags (Vision, Tools, Reasoning).
Example contents:

```
Actualyze

actualyze — 3 models
  team-coder
    llm  ·  ctx 262K  ·  out 33K  ·  Tools Reasoning
  team-chat
    llm  ·  ctx 203K  ·  out 33K  ·  Vision Tools
  team-research
    llm  ·  ctx 1.0M  ·  out 64K  ·  Vision Tools Reasoning
```

> **Requires a TUI-capable opencode.** The command is registered through
> opencode's TUI plugin command API; the model-discovery and enrichment that
> happen at startup work everywhere, but on a host without the TUI plugin
> runtime the `/actualyze` command simply does not appear. The dialog lists
> every model from the providers in the merged config — it
> does not separately label already-configured or skipped models, since that
> discovery-only framing is not exposed to the TUI process.

## Timeouts and Resilience

The plugin is designed to never block opencode startup:

- **Individual fetch calls** use a 3-second timeout (model list) or 2-second
  timeout (probes), all via the shared `probeFetch()` wrapper
- **The entire config hook** has a 5-second abort timeout. Model-list requests,
  auto-detection, and Actualyze detail requests all consume that signal.
- **Per-provider isolation** — each provider is wrapped in its own try-catch,
  so a failing provider never prevents discovery for other providers
- **Per-model Actualyze isolation** — detail requests use bounded concurrency and
  individual timeouts; a failure only skips enrichment for that model
- **All errors are caught and isolated** — a failing probe, an offline provider,
  or a malformed response never crashes the plugin or prevents opencode from
  starting
- **Capability flags are never emitted as `false`** — an authoritative probe
  value can block fallback internally, while unknown values remain eligible for
  enrichment

## Manually Configured Models

Models you explicitly configure in `opencode.json` are **never modified** by
the plugin. If you have:

```json
{
  "provider": {
    "actualyze": {
      "npm": "@ai-sdk/openai-compatible",
      "options": {
        "baseURL": "https://app.actualyze.ai/openai/v1",
        "apiKey": "<your PAT>",
        "probe": "actualyze"
      },
      "models": {
        "team-coder": {
          "name": "My Coder",
          "limit": { "context": 8192, "output": 2048 }
        }
      }
    }
  }
}
```

The plugin will discover any **other** models Actualyze advertises to your PAT
and enrich them, but `team-coder` keeps your custom name and limits untouched.

## License

MIT. Based on [opencode-lmstudio](https://github.com/agustif/opencode-lmstudio).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for architecture details, how to build
new probes, and development workflow.
