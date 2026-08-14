# KEVIN

**K**eeps **E**very **V**erbose **I**tem **N**arrow — context offloading plugin for [OpenCode](https://opencode.ai).

Intercepts large tool outputs, writes them to disk, and replaces them with compact pointers like:

```
[fw A1B2C3D4] bun test e=1 45K 891L | 2 failed, 48 passed | retrieve with context_open tool
```

Saves ~80% of context tokens on typical coding sessions.

---

## Installation

```jsonc
// opencode.json
{
  "plugin": ["@bulga138/kevin"],
}
```

Or one-liner:

```sh
bash <(curl -fsSL https://raw.githubusercontent.com/bulga138/kevin/main/install.sh)
```

---

## How it works

1. **`tool.execute.after`** — captures every tool output above the inline threshold (default 512 B) and writes it to `~/.cache/opencode/kevin/{session}/`
2. **`chat.message`** — before the LLM sees each message, replaces stored outputs with compact `[fw XXXXXXXX]` pointers
3. **`experimental.session.compacting`** — injects the offload index into context compaction summaries so the model survives context resets
4. **`experimental.chat.system.transform`** — keeps the model passively aware of how many outputs are offloaded

---

## Output tiers

| Size         | Exit code     | What the model sees     |
| ------------ | ------------- | ----------------------- |
| < 512 B      | any           | Full output (inline)    |
| 512 B – 4 KB | any           | Compact pointer only    |
| > 4 KB       | 0 (success)   | Compact pointer only    |
| > 4 KB       | ≠ 0 (failure) | Pointer + last 10 lines |

---

## Tools available to the model

| Tool             | Description                                                                             |
| ---------------- | --------------------------------------------------------------------------------------- |
| `context_open`   | Retrieve offloaded content by ID. Supports `start_line` / `end_line` for slicing.       |
| `context_recent` | List recent offloaded outputs. Supports `tags` filter.                                  |
| `context_search` | Full-text search — plain substring or `/regex/flags`. Returns ±context lines per match. |
| `context_save`   | Manually offload arbitrary content with a label.                                        |
| `context_export` | Export current session as markdown.                                                     |
| `context_pin`    | Pin an entry to prevent LRU/TTL eviction.                                               |
| `kevin_unpin`    | Remove a pin.                                                                           |
| `kevin_note`     | Attach a free-text note to an entry.                                                    |
| `kevin_tag`      | Add or remove tags on an entry.                                                         |
| `kevin_diff`     | Unified diff between two offloaded outputs.                                             |
| `kevin_timeline` | Chronological view of all offloaded outputs for the session.                            |
| `kevin_doctor`   | Diagnostics: storage health, config, orphaned files.                                    |
| `kevin_stats`    | Token-saving statistics for the current session.                                        |

---

## Configuration

All options can be set via environment variables (`KEVIN_*`) or a config file at `~/.config/kevin/config.json` (or `.kevin/config.json` in the project directory). Environment variables take precedence.

| Env var                      | Config key           | Default | Description                                                                          |
| ---------------------------- | -------------------- | ------- | ------------------------------------------------------------------------------------ |
| `KEVIN_INLINE_MAX`           | `inline_max`         | `512`   | Bytes below which output is kept inline                                              |
| `KEVIN_COMPACT_MAX`          | `compact_max`        | `4096`  | Upper boundary of compact-pointer tier                                               |
| `KEVIN_MAX_CACHE_MB`         | `max_cache_mb`       | `250`   | Cache ceiling before LRU eviction                                                    |
| `KEVIN_TTL_SUCCESS_H`        | `ttl_success_h`      | `24`    | Hours before successful outputs expire (0 = never)                                   |
| `KEVIN_TTL_FAILURE_H`        | `ttl_failure_h`      | `48`    | Hours before failed outputs expire (0 = never)                                       |
| `KEVIN_DISABLE`              | `disabled`           | `false` | Completely disable offloading                                                        |
| `KEVIN_DISABLE_REDACTION`    | `disable_redaction`  | `false` | Skip secret redaction                                                                |
| `KEVIN_AUTO_PIN_FAILURES`    | `auto_pin_failures`  | `true`  | Auto-pin failed outputs                                                              |
| `KEVIN_AUTO_PIN_MIN_BYTES`   | `auto_pin_min_bytes` | `0`     | Auto-pin outputs above this size (0 = off)                                           |
| `KEVIN_AUTO_PIN_TOOLS`       | `auto_pin_tools`     | `""`    | Comma-separated tool names to always pin                                             |
| `KEVIN_POINTER_FORMAT`       | `pointer_format`     | `""`    | Custom pointer template (tokens: `{id}` `{tool}` `{size}` `{lines}` `{exit}` `{ts}`) |
| `KEVIN_INTERCEPT_MCP`        | `intercept_mcp`      | `false` | Intercept MCP tool outputs                                                           |
| `KEVIN_DISABLE_UPDATE_CHECK` | `disable_check`      | `false` | Disable automatic update check                                                       |

Legacy `FEWWORD_*` prefixes are accepted as fallbacks for all options.

### Config file example

```json
{
  "inline_max": 1024,
  "compact_max": 8192,
  "ttl_success_h": 12,
  "ttl_failure_h": 72,
  "auto_pin_failures": true,
  "auto_pin_tools": ["test", "build"]
}
```

### Per-project disable

```sh
mkdir -p .kevin && touch .kevin/DISABLE_OFFLOAD
```

---

## Secret redaction

Before writing any output to disk, KEVIN automatically redacts:

- AWS access keys (`AKIA…`)
- AWS secret keys
- GitHub tokens (`ghp_`, `gho_`, `ghs_`, `ghr_`, `github_pat_`)
- OpenAI / Anthropic keys (`sk-…`)
- Generic key/token/secret/password assignments
- Bearer tokens in HTTP headers
- JWTs
- PEM private keys

Matched text is replaced with `[REDACTED:{type}]` so surrounding context is preserved.

Disable with `KEVIN_DISABLE_REDACTION=1` (not recommended).

---

## Storage layout

```
~/.cache/opencode/kevin/
├── {SESSION_ID}/
│   ├── {ID}.txt           # full (redacted) output
│   ├── {ID}.meta.json     # tool, exitCode, bytes, lines, hash, signature, tags, note…
│   ├── LATEST.txt         # symlink → most recent output
│   └── LATEST_{tool}.txt  # symlink → most recent output per tool
└── stats.json
```

---

## CLI

```sh
kevin stats    # token savings for the current session
kevin list     # list all offloaded outputs
kevin clear    # clear the cache
kevin migrate  # backfill metadata fields from old versions
```

---

## Architecture

```
src/
├── index.ts                  # Integration layer — hook/tool wiring only
├── config.ts                 # Env var + config file resolution
├── redaction.ts              # Secret pattern matching and redaction
├── pointer.ts                # Re-exports from offloadService (backward compat)
├── stats.ts                  # Session statistics sidecar
├── update-check.ts           # GitHub API update check
├── transport/
│   ├── fileTransport.ts      # FileTransport interface
│   │                           NodeFileTransport (production)
│   │                           MemoryTransport (tests)
│   └── index.ts
├── domain/
│   └── offloadService.ts     # ALL business logic (offload, search, diff, TTL…)
└── cli/
    ├── main.ts               # CLI dispatcher
    └── commands/
        ├── stats.ts
        ├── list.ts
        ├── clear.ts
        └── migrate.ts
```

**Dependency flow:** `index.ts` → `offloadService` → `transport`. No cycles.

---

Inspired by [FewWord](https://github.com/sheeki03/Few-Word) (Claude Code plugin),

## License

MIT
