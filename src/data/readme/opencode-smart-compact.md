# opencode-smart-compact

Smart compaction for [OpenCode](https://opencode.ai) V2 — a port of Alper's
[`pi-smart-compact`](https://github.com/alpertarhan/pi-smart-compact) ESV
pipeline (Extract → Synthesize → Verify) to the V2 plugin API.

When OpenCode compacts a session, this plugin replaces the built-in summary
with a **verified** one — or abstains and lets OpenCode's native compaction
run unchanged (fail-closed).

## What it does

On the `compaction` hook:

1. **Prune** — dedupe repeated read/search results within a mutation epoch,
   truncate oversized tool outputs.
2. **Extract** (deterministic, no LLM) — files modified/read/deleted, errors
   with retry/resolve tracking, constraints (EN + TR), decisions, open loops,
   session type, main goal.
3. **Synthesize** — one LLM call (`single-pass`) guided by the deterministic
   facts. If the call fails or returns malformed output, a deterministic
   fallback skeleton is assembled instead.
4. **Verify** — structural checks (required sections, path coverage, error
   evidence, semantic constraint/goal coverage, fabricated-file detection,
   consistency, unsupported high-risk claims like "all tests passed"), then
   deterministic repair rounds → one optional LLM patch → deterministic
   quality floor. A summary that still fails is **never applied**.
5. **Yield gate** — the summary must actually save tokens
   (default: ≥ 10% of the compacted window), otherwise abstain.

Abstention (small transcript < 5k tokens, verification rejection, yield
rejection, timeout, any error) always leaves `event.result` unset, so the
host's native compaction proceeds as if the plugin weren't there.

## Install

Add the package to `plugins` in `opencode.jsonc` (project or global):

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-smart-compact"]
}
```

Pin a version with `"opencode-smart-compact@0.1.0"`. To use a local checkout
instead, point `plugins` at its directory (`"./path/to/opencode-smart-compact"`
or a `file://` URL).

## Configuration

Plugin options (via the `plugins` object form in `opencode.jsonc`) or env vars:

| Option        | Env                                  | Default        | Meaning                              |
| ------------- | ------------------------------------ | -------------- | ------------------------------------ |
| `enabled`     | `OPENCODE_SMART_COMPACT_ENABLED`     | `true`         | Set `0`/`false` to disable.          |
| `summaryModel`| `OPENCODE_SMART_COMPACT_MODEL`       | session model  | `"provider/model"` for synthesis.    |
| `verifyModel` | `OPENCODE_SMART_COMPACT_VERIFY_MODEL`| summary model  | `"provider/model"` for the LLM patch.|
| `minYield`    | `OPENCODE_SMART_COMPACT_MIN_YIELD`   | `0.1`          | Minimum relative token saving.       |
| `timeoutMs`   | `OPENCODE_SMART_COMPACT_TIMEOUT_MS`  | `120000`       | Pipeline timeout; abstain on expiry. |

Tip: point `summaryModel` at a cheap model — the verify gate keeps quality
honest regardless of which model wrote the draft.

## MVP scope

Deliberately not ported (yet): the multi-pass Explore phase, `smart_recall` /
`smart_save_memory` tools, and the TUI status layer. The V2 hook runs
synchronously at compaction time, so Pi's handoff/pending-slot machinery was
dropped by design.

## Development

```bash
bun install
bun test
bun build src/index.ts --target=bun --outfile /dev/null   # syntax gate
```
