# true-mem-v2

[true-mem](https://github.com/rizal72/true-mem) for OpenCode 2. true-mem 1.x
targets the OpenCode V1 plugin API, which OpenCode 2 cannot load. This adapter
wraps the V1 plugin, feeds it a shim context, and re-registers its hooks through
the V2 plugin API. Everything stays local: memories live in a SQLite database
under `~/.true-mem/`, no cloud and no accounts.

## What you get

- **Memory extraction and injection** — true-mem records durable facts from your
  sessions and injects relevant ones into system prompts and subagent tasks.
- **Compaction injection** — when OpenCode compacts a session, active memories
  plus preservation instructions (MUST PRESERVE / CAN DISCARD) are appended to
  the summarizer's context, so compacted sessions keep your constraints.
- **Compaction safety** — by default the adapter strips every tool from the
  compaction request, so the summarizer can only produce text, never act.

## Requirements

- OpenCode 2.x
- Node.js >= 22.5 (for `node:sqlite`; without it, only compaction injection is
  disabled — everything else works)

## Install

Add it to `opencode.jsonc`:

```jsonc
{
  "plugins": ["true-mem-v2"]
}
```

## Options

```jsonc
{
  "plugins": [
    {
      "package": "true-mem-v2",
      "options": {
        "memoryLimit": 20,      // max memories injected at compaction (default 20)
        "stripTools": true,     // remove all tools from the compaction request (default true)
        "dedupeWindowMs": 30000 // cross-instance compaction dedupe window (default 30000)
      }
    }
  ]
}
```

## Storage

Memories are stored by true-mem in `~/.true-mem/memory.db` (SQLite table
`memory_units`). Scope semantics:

- memories saved in a project apply to that project
- memories saved in your home directory are treated as global and apply to
  every project

## Debugging

The adapter logs to the console. Set `TRUE_MEM_V2_LOG=1` to also mirror the log
to `~/.true-mem/adapter.log`.

## License

MIT. true-mem itself is MIT licensed by its author.
