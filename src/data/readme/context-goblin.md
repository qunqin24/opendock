# Context Goblin

OpenCode plugin for AI coding agents that creates a compact, safe project-context cache and code map. Context Goblin helps OpenCode agents reduce repository rediscovery, lower file reads, and reuse project facts without caching secrets.

Useful for OpenCode plugin workflows, AI coding agents, repository context caching, token usage evidence, safe project summaries, and code-map based project understanding.

## Install

The npm `latest` release is the supported version.

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["context-goblin"]
}
```

For local development, build and add a shim:

```js
export { default } from "file:///absolute/path/to/context-goblin/dist/src/index.js"
```

Optional local TUI experiment shim:

```js
export { default } from "file:///absolute/path/to/context-goblin/dist/src/tui.js"
```

Shim locations:

```txt
.opencode/plugins/context-goblin.js
~/.config/opencode/plugins/context-goblin.js
```

## Tools

```txt
context_goblin_get
context_goblin_status
context_goblin_refresh
context_goblin_read
context_goblin_stats
context_goblin_usage_stats
```

OpenCode slash commands:

```txt
/context-goblin-stats
/context-goblin-usage
```

The slash commands are registered by the server plugin through OpenCode's native command config. `/context-goblin-stats` expands to a prompt that calls `context_goblin_status`, then `context_goblin_stats`, and reports cache freshness, size, tracked files, and code-map coverage. `/context-goblin-usage` calls `context_goblin_usage_stats` and summarizes local token usage rollups. Restart OpenCode after changing plugin config.

Cache files:

```txt
.opencode/cache/context-goblin/project-context.md
.opencode/cache/context-goblin/project-context.state.json
.opencode/cache/context-goblin/usage-state.json
```

The cache includes detected stack, package scripts, a compact directory map, a ranked source/test code map, safety exclusions, and project instructions when present. The state file also records cache statistics such as byte size, line count, section list, tracked-file count, and code-map coverage.

The usage state stores local numeric OpenCode token rollups only: step count, hashed session IDs for unique session counts, input/output/reasoning/cache/total tokens, and reported cost when available. It does not store prompts, responses, tool outputs, or file contents.

## Usage

After adding the plugin config:

```txt
1. Restart OpenCode.
2. Ask the agent to call context_goblin_get before broad repo discovery.
3. Type /context-goblin-stats only when you need cache diagnostics.
4. Type /context-goblin-usage to inspect local token usage rollups.
```

Recommended prompt:

```txt
Use Context Goblin before broad repository discovery. Call context_goblin_get once, then inspect only task-specific files that are still needed. Do not call separate Context Goblin diagnostics unless I ask for them.
```

`context_goblin_get` is the recommended task flow: it checks freshness, refreshes only
when necessary, and returns the safe cache in one tool call. The separate `status`,
`refresh`, `read`, and `stats` tools remain available for diagnostics and backward
compatibility.

If the slash command does not appear:

```txt
1. Confirm config includes "context-goblin".
2. Confirm npm latest is 0.1.21 or newer.
3. Fully restart OpenCode after changing config.
4. Check project config is not overriding global plugin config.
```

## Tool Output Compaction

Context Goblin can also reduce wasted LLM context from oversized tool outputs. This behavior is opt-in so the plugin does not change OpenCode's native tool results unless explicitly requested. When enabled, it compacts only large `bash`, `grep`, and `glob` outputs over 12,000 characters. It keeps the beginning and end, records the omitted size in metadata, and tells the agent to rerun a focused command if exact omitted output is required.

It does not compact exact file reads by default, because code content is often needed for correctness.

Enable output compaction explicitly with `compactToolOutputs: true`. Existing configurations that already set it to `true` keep the same behavior.

Configuration:

```json
{
  "plugin": [["context-goblin", {
    "compactToolOutputs": true,
    "compactToolOutputThresholdChars": 12000,
    "compactToolOutputKeepStartChars": 4000,
    "compactToolOutputKeepEndChars": 2000,
    "compactToolOutputTools": ["bash", "grep", "glob"]
  }]]
}
```

## Local Usage Stats

Context Goblin records approximate token usage from OpenCode `step-finish` message parts while the plugin is enabled for a workspace. This is useful for seeing local trends such as today's usage, last 7 days, and last 30 days.

```txt
context_goblin_usage_stats
/context-goblin-usage
```

Tracked numeric fields:

```txt
input tokens
output tokens
reasoning tokens
cache read tokens
cache write tokens
total event tokens
reported cost
step count
unique session count
```

Important caveat: these are OpenCode event token statistics, not a guaranteed provider billing invoice. Providers may omit fields, report `cost: 0`, or account for cached/reasoning tokens differently.

## Recommended Agent Flow

Before broad repository discovery, ask the agent to use Context Goblin in this order:

```txt
1. context_goblin_status
2. if missing or stale: context_goblin_refresh
3. context_goblin_read
4. context_goblin_stats
5. briefly summarize cache freshness, size, tracked files, and code-map coverage
6. inspect only task-specific files whose implementation details are still missing
```

Reusable agent instruction:

```txt
Before broad repository discovery, use Context Goblin. Call context_goblin_status, refresh if missing or stale, read the cache, then call context_goblin_stats and briefly mention cache freshness, size, tracked files, and code-map coverage. Use the cache to avoid broad scans and read only task-specific files that are still needed.
```

## Safety

Context Goblin must not cache secrets, dependency folders, generated output, or cache internals.

Default exclusions include:

```txt
.env
.env.*
*.pem
*.key
secrets.json
credentials.json
node_modules/**
.git/**
dist/**
build/**
coverage/**
.opencode/cache/context-goblin/**
```

## Checks

```bash
npm run typecheck
npm run test
npm run build
npm run check:reports
npm run smoke:opencode
npm run smoke:opencode:live
npm run benchmark:stable
npm run check:models:general
npm run check:tokens
```

`smoke:opencode:live` runs a real headless OpenCode model session and requires configured provider credentials. Override its defaults with `OPENCODE_MODEL` or `OPENCODE_BIN`.

## Latest A/B Evidence

### How results are judged

- **Compatibility `pass`** means both arms completed, Context Goblin used the required
  tools correctly, answer quality met the benchmark, the cache stayed within its size
  limit, and no secret leakage was detected.
- **Overall efficiency `pass`** means all three measured efficiency signals improved:
  direct file reads, uncached input tokens, and total event tokens.
- **Overall efficiency `fail`** means any measured efficiency signal regressed. A
  negative reduction is an increase in usage and can never be reported as a pass.
- **Overall efficiency `mixed`** is reserved for evidence that does not regress but is
  flat or unavailable on at least one signal.
- We do not claim guaranteed token savings from one-shot results. Repeatable savings
  require a completed multi-run stability benchmark.

Run the current coding-model comparison:

```bash
OPENCODE_MODELS="openai/gpt-5.5 openai/gpt-5.6-sol" npm run check:tokens
```

The general A/B form is also available:

```bash
OPENCODE_MODELS="openai/gpt-5.5 openai/gpt-5.6-sol" npm run check:models:general
```

Optional model groups:

```bash
MODEL_GROUP=free npm run check:models:general
MODEL_GROUP=all npm run check:models:general
```

Both reports use the same fresh-fixture A/B protocol. The token report emphasizes
accounting; the general report emphasizes completion and quality. Each arm denies
`task`, `bash`, and `edit`, and the Goblin arm uses the single low-overhead
`context_goblin_get` call before focused reads.

Latest comparison on OpenCode `1.18.20` with Context Goblin `0.1.21`:

| Model | Baseline Reads | Goblin Reads | File Reduction | Input Token Reduction | Total Token Reduction | Quality | Cache Size | Compatibility | Overall Efficiency |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| openai/gpt-5.5 | 16 | 9 | 44% | 28% | 47% | 6/6 | 2,587 bytes | pass | pass |
| openai/gpt-5.6-sol | 17 | 11 | 35% | 45% | 35% | 6/6 | 2,587 bytes | pass | pass |

Both models passed compatibility and overall efficiency with quality `6/6`, no secret
leakage, and positive reductions across all measured signals:

- `gpt-5.5`: files `−44%`, input `−28%`, total `−47%`.
- `gpt-5.6-sol`: files `−35%`, input `−45%`, total `−35%`.

Detailed reports: [general A/B](./examples/model-general-ab-report.md) and
[token usage](./examples/token-usage-ab-report.md). Total event tokens include
provider/OpenCode cache-read, reasoning, output, and multi-step records; this is
evidence, not a guaranteed billing invoice.

These are single runs per model and arm. Any future negative reduction is reported as
`fail`, never as a successful efficiency result. Raw OpenCode event logs and metadata
are ignored by git; the generated Markdown reports are committed.

## Repeated Stability Evidence

The repeated runner is available as `npm run benchmark:stable`. It uses fresh fixture
copies, alternating execution order, one cold-cache refresh control, and warm-cache
rounds. It fails closed rather than turning provider/session timeouts into metrics.

The current report is [examples/model-stability-ab-report.md](./examples/model-stability-ab-report.md).
The short live smoke and one-shot A/B evidence are valid and documented above; the
longer repeated agentic protocol is currently deferred because OpenCode stalled before
its first event on both tested models. Therefore no repeatable multi-run savings claim
is made yet.

## License

MIT
