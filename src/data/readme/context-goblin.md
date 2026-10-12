# Context Goblin

Context Goblin gives OpenCode agents a compact, reusable overview of your repository: its stack, project structure, available scripts, and source code map.

The agent retrieves this context in one tool call, then inspects the files relevant to its task. The cache refreshes when the project changes and excludes known sensitive paths.

Supports OpenCode 1 and 2. Optional features include tool output compaction, local token usage statistics, and terminal UI cache stats.

## Install

Add the appropriate entry to your OpenCode configuration, then restart OpenCode.

### OpenCode 2

In `opencode.json` or `opencode.jsonc`:

```json
{
  "plugins": ["context-goblin@0.2.3"]
}
```

For optional TUI stats, add the same entry to `~/.config/opencode/cli.json` or `cli.jsonc`. This command reads the local filesystem; use the server stats command for remote workspaces.

### OpenCode 1

```json
{
  "plugin": ["context-goblin@0.2.3"]
}
```

Use one loading method per plugin. Combining a configured entry with an auto-discovered local shim causes a duplicate plugin ID in V2.

## Use

Give the agent this instruction with your task:

```text
Call context_goblin_get once before broad repository discovery, then inspect only the files needed for this task.
```

The plugin exposes tools; it does not automatically insert the cache into every prompt or force the agent to use it.

| Tool | Purpose |
| --- | --- |
| `context_goblin_get` | Check freshness, regenerate if needed, and return the cache in one call. |
| `context_goblin_status` | Check whether the cache exists and is fresh. |
| `context_goblin_refresh` | Regenerate the cache. |
| `context_goblin_read` | Read the existing cache without checking freshness. |
| `context_goblin_stats` | Return cache size, tracked-file count, and code-map coverage. |
| `context_goblin_usage_stats` | Return local token totals for today, the last 7 days, and the last 30 days. |

Both `get` and `refresh` accept an optional `maxCacheKb` argument.

Two server slash commands are available:

- `/context-goblin-stats` asks the agent to check cache status and summarize its statistics.
- `/context-goblin-usage` asks the agent to summarize local token usage.

These commands submit model prompts. With the optional TUI plugin enabled, the stats command instead shows a toast for the selected session's project without a model call. An unavailable session produces a warning.

If commands are missing, restart OpenCode, check whether project configuration overrides global configuration, and inspect plugin loading errors.

## Cache contents and freshness

The cache contains the detected stack, package script names, a directory map, and a ranked map of source and test files. It notes the presence of `AGENTS.md` without copying its instructions. Package script bodies and test descriptions are also excluded.

Files are stored inside the workspace:

```text
.opencode/cache/context-goblin/
  project-context.md          # Context returned to the agent
  project-context.state.json # Freshness data and cache statistics
  usage-state.json           # Local token usage totals
```

Freshness checks track Git state and ignored source files. Without Git, they compare source content. Scans are limited to 2,000 files and 32 MiB; the cache is treated as stale if freshness cannot be verified within those limits. Cache format changes trigger regeneration.

## Optional output compaction

Enable compaction to shorten large text results from `bash`, `grep`, and `glob`. V2 `shell` uses the `bash` setting.

With the defaults, results over 12,000 characters retain the first 4,000 and last 2,000 characters. A notice reports the omitted size and tells the agent to rerun a focused command when it needs the missing output. File reads are excluded by default.

OpenCode 2 configuration:

```json
{
  "plugins": [{
    "package": "context-goblin@0.2.3",
    "options": {
      "compactToolOutputs": true
    }
  }]
}
```

For OpenCode 1, use `"plugin": [["context-goblin@0.2.3", { "compactToolOutputs": true }]]`.

Additional options: `compactToolOutputThresholdChars`, `compactToolOutputKeepStartChars`, `compactToolOutputKeepEndChars`, and `compactToolOutputTools`.

## Usage tracking

Usage tracking stores daily input, output, reasoning, cache-read and cache-write tokens, completed-step counts, hashed session IDs, and reported cost. It stores no prompts, responses, tool outputs, or file contents.

V1 reads `step-finish` message parts; V2 reads `session.step.ended` events. V2 ignores cumulative usage updates and suppresses duplicate event IDs within one plugin lifetime. Transport failures or reloads can leave incomplete or duplicate totals, and auxiliary model requests are excluded. These numbers describe observed OpenCode events; provider billing may differ.

## Sensitive data

Default exclusions cover `.env` files, `*.pem`, `*.key`, `secrets.json`, `credentials.json`, dependencies, Git internals, build output, coverage, and the plugin's own cache. Source links are resolved before reading.

The filters cannot identify every secret in filenames, import paths, or source identifiers. Review generated cache content before sharing it outside your machine.

## Verified behavior and measured results

OpenCode **2.0.26** passed a packed-package integration check: the plugin loads, both server commands register, and all six tools execute without model calls. OpenCode **1.18.20** passed the registration smoke. The full test suite contains **98 passing tests**. Interactive TUI behavior remains unverified.

The latest A/B comparison used **Context Goblin 0.2.2**, **OpenCode 2.0.26**, and reasoning variant **low** on **2026-10-11**:

| Model | File reads: baseline → Goblin | Uncached input reduction | Total event token reduction | Answer-topic coverage |
| --- | ---: | ---: | ---: | ---: |
| GPT 6 Sol | 12 → 7 | 18% | 33% | 6/6 |
| GPT 6.1 Sol | 16 → 6 | 27% | 48% | 6/6 |

All four sessions completed. Goblin called `context_goblin_get` before discovery; tool-flow, cache-size, and secret-leakage checks passed. File reads count distinct files accessed through `read`. Topic coverage checks six requested answer topics; it does not prove semantic correctness.

Each arm ran once with a cold Goblin cache. Provider caching was uncontrolled, and the GPT 6 pair had a roughly five-hour gap after a quota interruption. These measurements do not establish repeatable savings or billing reductions. See [the V2 report and answers](https://github.com/MelnixDev/context-goblin/blob/main/examples/opencode-v2-ab-report.md).

### Historical OpenCode 1 comparison

Tested **2026-10-08** with **Context Goblin 0.1.22** and **OpenCode 1.18.20**:

| Model | File reads: baseline → Goblin | Uncached input reduction | Total event token reduction | Answer-topic coverage |
| --- | ---: | ---: | ---: | ---: |
| GPT-5.5 | 16 → 6 | 25% | 27% | 6/6 |
| GPT-5.6 Sol | 17 → 11 | 19% | 31% | 6/6 |

These were also single runs per model and arm. An earlier run on the same version increased GPT-5.5 uncached input by 28%. Repeated stability testing remains deferred after sessions stalled before their first event.

Detailed evidence: [token usage](https://github.com/MelnixDev/context-goblin/blob/main/examples/token-usage-ab-report.md), [answer and compatibility checks](https://github.com/MelnixDev/context-goblin/blob/main/examples/model-general-ab-report.md), [run history](https://github.com/MelnixDev/context-goblin/blob/main/examples/ab-run-history.md), and [stability status](https://github.com/MelnixDev/context-goblin/blob/main/examples/model-stability-ab-report.md).

## Development

See [development and benchmark instructions](https://github.com/MelnixDev/context-goblin/blob/main/docs/development.md) for local plugin loading, verification commands, and model comparisons.

## License

MIT
