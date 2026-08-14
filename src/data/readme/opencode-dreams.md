# opencode-dreams

[![npm version](https://img.shields.io/npm/v/opencode-dreams.svg)](https://www.npmjs.com/package/opencode-dreams)
[![CI](https://github.com/Ryurexflipper/Opencode-Dreams/actions/workflows/ci.yml/badge.svg)](https://github.com/Ryurexflipper/Opencode-Dreams/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node ≥20](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)

> Stops your AI coding agent from repeating the same mistakes.

`opencode-dreams` is an [OpenCode](https://github.com/sst/opencode) plugin that reflects on every coding session and consolidates **failure modes, learned patterns, and preferences** into a persistent knowledge base. That knowledge is automatically injected back into every future session — so your agent stops hitting the same walls, making the same wrong choices, and asking the same questions twice.

Inspired by the **OpenDream** conceptual model. This repository is the OpenCode-specific implementation: concrete plugin packaging, external memory integrations, and a hardened baseline validated through eight phases of adversarial regression testing. Credit for the underlying Reflect/Dream backbone belongs to the original OpenDream work and its maintainers.

**What it does in one sentence:** after each session the agent reflects on what went wrong and what worked, consolidates that into durable memory, and injects it into every session that follows.

### Key features

- **Failure mode tracking** — mistakes, wrong approaches, and dead ends are explicitly captured and stored as `failure_mode` memory entries so they are never repeated
- **Pattern and preference learning** — workflows, tool sequences, and preferences compound across sessions into `pattern`, `workflow`, and `preference` entries
- **Automatic session capture** — live events are recorded as they happen; no manual export needed
- **Two-stage pipeline** — Stage 1 (Reflect) analyses each session; Stage 2 (Dream) consolidates across all sessions into generalizable knowledge
- **Durable `AGENTS.md` export** — consolidated memory is written into a managed block your agent reads at the start of every session
- **External memory sync** — pulls in memories from `opencode-mem`, `true-mem`, `simple-memory`, and `opencode-lcm`
- **15 composable tools** — call any stage individually or chain the full pipeline in one go
- **Hardened and tested** — 182/182 tests across 8 adversarial hardening phases; structured error boundaries throughout
- **MIT licensed** — free to use, modify, and distribute

```text
Live session / imported trace
  -> Stage 1: Reflect
  -> Stage 2: Dream
  -> memory/current.md
  -> AGENTS.md
```

## Current baseline

- End-to-end pipeline is implemented
- Hardening baseline spans Phases 1–8
- Latest verified baseline: **182/182 tests passing**

See also:
- `docs/ARCHITECTURE.md`
- `docs/INSTALL.md`
- `docs/OPENDREAM-MAPPING.md`
- `docs/adversarial-hardening-status.md`

## Quick setup — copy-paste prompt for your AI

Give this prompt to your AI agent (in any OpenCode session) to have it install and configure `opencode-dreams` automatically:

```
Please set up the opencode-dreams plugin in this project by doing the following steps in order:

1. Run: npm install opencode-dreams
2. Open or create opencode.json in the project root. Add opencode-dreams to the plugin array with this config:
   {
     "$schema": "https://opencode.ai/config.json",
     "model": "github-copilot/gpt-5.4",
     "provider": { "github-copilot": {} },
     "plugin": [
       ["opencode-dreams", {
         "preferredReflectModel": "github-copilot/gpt-5.4",
         "preferredDreamModel": "github-copilot/gpt-5.4",
         "captureLiveSessions": true,
         "logLevel": "info"
       }]
     ]
   }
   If opencode.json already exists and has a plugin array, append the opencode-dreams entry to it. Do not remove existing plugins.
3. Call opendream_init to create the .opencode-dream/ workspace layout.
4. Call opendream_info to confirm the plugin is running.
5. Tell me the current pipeline status shown by opendream_info.
```

> Adjust `"model"` and `"preferredReflectModel"` / `"preferredDreamModel"` to whatever model you are using in OpenCode.

## Installation

### Requirements

- [OpenCode](https://github.com/sst/opencode) installed and configured
- Node.js `>=20`
- A model available in your OpenCode setup for reflection and consolidation

**Supported models (examples):**

| Provider | Model ID | Notes |
|---|---|---|
| GitHub Copilot | `github-copilot/gpt-5.4` | Recommended — fast, strong reasoning |
| GitHub Copilot | `github-copilot/gpt-4.5` | Good alternative |
| GitHub Copilot | `github-copilot/claude-sonnet-4-5` | Strong for nuanced reflection |
| Anthropic | `anthropic/claude-sonnet-4-5` | If using Anthropic provider |
| Anthropic | `anthropic/claude-opus-4-5` | Best quality, slower |
| OpenAI | `openai/gpt-4o` | If using OpenAI provider |
| OpenAI | `openai/o3` | Strong reasoning for consolidation |
| AWS Bedrock | `aws/claude-sonnet-4-5` | If using Bedrock provider |

Any model available in your OpenCode provider config works. Use the same format: `providerID/modelID`.

### Step 1 — Install the package

```bash
npm install opencode-dreams
```

### Step 2 — Add the plugin to `opencode.json`

In your project root, open (or create) `opencode.json` and add `opencode-dreams` to the `plugin` array:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "model": "github-copilot/gpt-5.4",
  "provider": {
    "github-copilot": {}
  },
  "plugin": [
    ["opencode-dreams", {
      "preferredReflectModel": "github-copilot/gpt-5.4",
      "preferredDreamModel": "github-copilot/gpt-5.4"
    }]
  ]
}
```

### Step 3 — Initialise the workspace

Start an OpenCode session and tell your agent:

```
Call opendream_init to set up the workspace.
```

This creates the `.opencode-dream/` directory layout and optional `AGENTS.md` markers. Only needed once per project.

### Step 4 — Verify the plugin loaded

```
Call opendream_info to confirm the plugin is running and show pipeline status.
```

### Plugin config options

| Option | Type | Default | Description |
|---|---|---|---|
| `preferredReflectModel` | string | — | Model for Stage 1 reflection (e.g. `github-copilot/gpt-5.4`) |
| `preferredDreamModel` | string | — | Model for Stage 2 consolidation |
| `projectRelativeStateDir` | string | `.opencode-dream` | Where plugin state is stored relative to project root |
| `captureLiveSessions` | boolean | `true` | Auto-capture live session events |
| `logLevel` | string | `info` | `debug` \| `info` \| `warn` \| `error` |
| `opencodeMem.enabled` | boolean | `false` | Enable opencode-mem integration |
| `opencodeMem.url` | string | `http://127.0.0.1:4747` | opencode-mem server URL |
| `opencodeMem.importMode` | string | `append` | `append` or `replace` when merging external memories |

### Using a local build instead of npm

If you want to use a local clone instead of the published package:

```bash
git clone https://github.com/Ryurexflipper/Opencode-Dreams.git
cd Opencode-Dreams
npm install && npm run build
```

Then in `opencode.json` point to the built output directly:

```jsonc
{
  "plugin": [
    ["file:///ABSOLUTE/PATH/TO/Opencode-Dreams/dist/src/index.js", {
      "preferredReflectModel": "github-copilot/gpt-5.4",
      "preferredDreamModel": "github-copilot/gpt-5.4"
    }]
  ]
}
```

## What it does

### Capture and ingest
- auto-captures live sessions into `.opencode-dream/sessions/live/`
- stores transient capture state in `.opencode-dream/sessions/runtime/`
- imports external traces into `.opencode-dream/sessions/imports/`

### Stage 1: Reflect
- renders reflection prompts
- runs LLM-backed reflection for one session or in batch
- imports externally generated reflection JSON
- stores validated reflections in `.opencode-dream/reflections/`

### Stage 2: Dream
- renders consolidation prompts
- runs LLM-backed consolidation across stored reflections
- stores validated dream outputs in `.opencode-dream/dreams/`

### Memory and export
- applies consolidation entries into `.opencode-dream/memory/current.md`
- exports current memory into one managed `AGENTS.md` block
- injects consolidated memory into session compaction context

### External memory sync
- supports:
  - `opencode-mem`
  - `true-mem`
  - `simple-memory`
  - `opencode-lcm`
- merges each source into tagged blocks inside `memory/current.md`

## Hooks

The plugin registers three hooks:
- `event` — live session capture
- `shell.env` — exports resolved state/model env vars
- `experimental.session.compacting` — injects current memory into compaction

## State layout

```text
.opencode-dream/
  sessions/
    imports/
    live/
    runtime/
  reflections/
  dreams/
  memory/
    current.md
  docs/
    README.md
```

## Available tools

The plugin currently exposes **15 tools**:

- setup/status
  - `opendream_info`
  - `opendream_init`
  - `opendream_memory_status`
- session ingest
  - `opendream_ingest_generic_jsonl`
- Stage 1 reflection
  - `opendream_reflect_prompt`
  - `opendream_reflect_import_json`
  - `opendream_reflect_run`
  - `opendream_reflect_batch`
- Stage 2 dream
  - `opendream_dream_prompt`
  - `opendream_dream_run`
- memory/export
  - `opendream_memory_apply`
  - `opendream_export_agents`
- external memory
  - `opendream_mem_probe`
  - `opendream_mem_sync`
  - `opendream_ext_mem_sync`

## Usage guide

### Typical session workflow

Run these tools inside an OpenCode session (tell your agent to call them by name):

```
1. opendream_info           — check plugin status and pipeline state
2. opendream_reflect_run    — reflect on the most recent session
3. opendream_dream_run      — consolidate all reflections into memory
4. opendream_memory_apply   — write consolidation into memory/current.md
5. opendream_export_agents  — update AGENTS.md with current memory
```

After a few sessions, memory compounds automatically — each Dream pass builds on prior ones.

---

### Tool reference

#### Setup and status

| Tool | What it does |
|---|---|
| `opendream_info` | Shows plugin config, tool inventory, and current pipeline state (session/reflection/dream counts) |
| `opendream_init` | Initialises the `.opencode-dreams/` workspace layout and optional `AGENTS.md` markers |
| `opendream_memory_status` | Shows the current memory file path, size, and whether markers are intact |

#### Session ingest

| Tool | What it does |
|---|---|
| `opendream_ingest_generic_jsonl` | Validates and stages a JSONL session export into the import queue for reflection |

#### Stage 1 — Reflect

| Tool | What it does |
|---|---|
| `opendream_reflect_prompt` | Renders the reflection prompt for a stored session (for manual inspection or external LLM use) |
| `opendream_reflect_import_json` | Validates and stores a reflection JSON you produced externally |
| `opendream_reflect_run` | Runs LLM-backed reflection for a single session |
| `opendream_reflect_batch` | Runs LLM-backed reflection for all un-reflected sessions in one pass |

#### Stage 2 — Dream

| Tool | What it does |
|---|---|
| `opendream_dream_prompt` | Renders the consolidation prompt across all stored reflections (for manual inspection) |
| `opendream_dream_run` | Runs LLM-backed consolidation and saves the dream output |

#### Memory and export

| Tool | What it does |
|---|---|
| `opendream_memory_apply` | Applies the latest dream consolidation into `memory/current.md` |
| `opendream_export_agents` | Writes current memory into the managed block in `AGENTS.md` |

#### External memory sync

| Tool | What it does |
|---|---|
| `opendream_mem_probe` | Reads raw items from the opencode-mem server without writing anything |
| `opendream_mem_sync` | Pulls opencode-mem memories into `memory/current.md` |
| `opendream_ext_mem_sync` | Pulls from **all** configured external memory sources in one command |

---

### Using opencode-mem with opencode-dreams

`opencode-mem` is a separate memory server that stores memories independently of sessions. `opencode-dreams` can pull those memories into its own pipeline so agents always have both kinds of context.

**Step 1 — Enable opencode-mem in your `opencode.json`:**

```jsonc
{
  "plugin": [
    ["opencode-dreams", {
      "preferredReflectModel": "github-copilot/gpt-5.4",
      "preferredDreamModel": "github-copilot/gpt-5.4",
      "opencodeMem": {
        "enabled": true,
        "url": "http://127.0.0.1:4747",
        "importMode": "append",
        "maxItemLength": 1000
      }
    }]
  ]
}
```

| Option | Default | Description |
|---|---|---|
| `enabled` | `false` | Must be `true` to activate the integration |
| `url` | `http://127.0.0.1:4747` | Base URL of your running opencode-mem server |
| `importMode` | `"append"` | `"append"` replaces the existing block or adds it; `"replace"` rebuilds the whole memory file |
| `maxItemLength` | `1000` | Truncates long memory items to this character limit |

**Step 2 — Sync memories during a session:**

Tell your agent:
```
Call opendream_mem_sync to pull my opencode-mem memories into the pipeline.
```

Or use the unified command to sync all sources at once:
```
Call opendream_ext_mem_sync to pull from all external memory sources.
```

You can also pass arguments:
```
Call opendream_mem_sync with url="http://127.0.0.1:4747" and dryRun=true
```

**Step 3 — After sync, export to AGENTS.md:**
```
Call opendream_export_agents to write the updated memory into AGENTS.md.
```

**Recommended session start sequence with opencode-mem:**
```
1. opendream_ext_mem_sync   — pull latest external memories
2. opendream_reflect_batch  — reflect any un-processed sessions
3. opendream_dream_run      — consolidate everything
4. opendream_memory_apply   — persist to memory/current.md
5. opendream_export_agents  — update AGENTS.md
```

---

### Environment variables

These can be set in `.env` or your shell — they are optional overrides. The plugin config in `opencode.json` takes priority.

| Variable | Description |
|---|---|
| `OPENCODE_DREAM_REFLECT_MODEL` | Model to use for Stage 1 reflection (e.g. `github-copilot/gpt-5.4`) |
| `OPENCODE_DREAM_DREAM_MODEL` | Model to use for Stage 2 consolidation |
| `OPENCODE_DREAM_LOG_LEVEL` | Log verbosity: `debug`, `info`, `warn`, `error` (default: `info`) |

## How it improves itself over time

The system improves in two ways:

1. **Knowledge compounding**
   - sessions become reflections
   - reflections become consolidations
   - consolidations become durable memory
   - memory is reinjected into future sessions and exports

2. **Reliability compounding**
   - adversarial hardening Phases 1–8 added direct regression coverage for path safety, marker handling, live-capture integrity, reflection/dream validation, and memory/export stability
   - recoverable tool-boundary failures now return structured JSON instead of crashing in key paths

## Release quality

- Node.js >= 20
- ESM-only package
- `npm run typecheck`
- `npm run build`
- `npm test`

Current maintained verification baseline: **182/182 tests passing**.

## Documentation map

- `docs/INSTALL.md` — install and first-run flow
- `docs/ARCHITECTURE.md` — subsystem/data-flow overview
- `docs/OPENDREAM-MAPPING.md` — OpenDream concept mapping
- `INTEGRATIONS.md` — external memory sources and merge model
- `docs/adversarial-hardening-status.md` — hardening history and current baseline

## Attribution

- Conceptual backbone: the broader **OpenDream** reflection/consolidation model
- This repository: an OpenCode-specific implementation, hardening pass, and releaseable plugin built on top of that conceptual foundation

## License

MIT
