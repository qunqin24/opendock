# opencode-daily-journal

An OpenCode V2 plugin that keeps a **daily journal of your conversations** — every time a session turn finishes, the exchange is summarized into a diary entry and appended to `daily/YYYY-MM-DD.md`.

**Record only, never inject.** The journal is plain Markdown on disk. It is not added to any session context unless you explicitly ask the agent to read it.

Inspired by:

- [reklis/opencode-memory-compiler](https://github.com/reklis/opencode-memory-compiler) — OpenCode V1 plugin; this project is a lightweight V2 rewrite without memory injection or knowledge-base compilation, with concurrency-safe writes
- [coleam00/claude-memory-compiler](https://github.com/coleam00/claude-memory-compiler) — the Claude Code original

## Features

- **One file per day** — `daily/YYYY-MM-DD.md`, entries ordered on a single timeline
- **Concurrency-safe** — file lock + append-only + idempotent markers; multiple sessions finishing at the same time never overwrite or duplicate each other
- **Diary-style summaries** — each turn becomes an entry with topic / key points / decisions / follow-ups
- **Model fallback chain** — the session's own model first, then other configured models in order, and only if everything fails a raw excerpt is written instead
- **Never injects** — nothing is added to session context
- **Never loses content** — if summarization fails, a raw excerpt is recorded; chit-chat can be skipped via `SKIP_LOG`

## Install

### From GitHub (recommended)

```bash
opencode plugin add github:jianzhangg/opencode-daily-journal
```

### Local clone

```bash
git clone https://github.com/jianzhangg/opencode-daily-journal
mkdir -p ~/.config/opencode/plugins
ln -sfn "$(pwd)/opencode-daily-journal" ~/.config/opencode/plugins/daily-journal
```

### From npm (once published)

```bash
opencode plugin add opencode-daily-journal
```

OpenCode auto-discovers plugins in `~/.config/opencode/plugins/`. After changing plugin code:

```bash
opencode service restart
# or, for the desktop app: quit and reopen
```

## Configure (optional)

```jsonc
{
  "plugins": [
    {
      "package": "opencode-daily-journal",
      "options": {
        "enabled": true,
        "dailyDir": "/path/to/your/daily",
        "minTurns": 2,
        "maxTurns": 16,
        "maxContextChars": 20000,
        "summarize": true,
        "includeChildSessions": false
      }
    }
  ]
}
```

| Option | Default | Description |
| --- | --- | --- |
| `enabled` | `true` | Master switch |
| `dailyDir` | local install: `<repo>/daily/`; npm install: `~/.local/share/daily-journal/daily/` | Journal output directory |
| `minTurns` | `2` | Skip if fewer new messages (2 = at least one full Q&A round) |
| `maxTurns` | `16` | Max new messages summarized per write |
| `maxContextChars` | `20000` | Context character cap before truncation |
| `summarize` | `true` | `false` = never call a model, record raw excerpts only (zero token cost) |
| `includeChildSessions` | `false` | Also journal subagent (child) sessions |

Runtime state lives in `~/.local/share/daily-journal/` (override with `DAILY_JOURNAL_HOME`).

## Journal format

```markdown
# 2026-10-11

> Automatically recorded by daily-journal (record only, never inject).

## 12:30 · my-project · anthropic/claude-sonnet-4-5

**Topic**: what this conversation was about
**Key points**:
- ...
**Decisions**: ...
**Follow-ups**: ...

<!-- dj:ses_xxx:msg_yyy -->
```

- Each entry ends with a `<!-- dj:... -->` marker used for idempotency — don't edit it.
- Entries are appended, never rewritten. You can freely add manual notes between entries.

## How it works

```
turn finishes (session.execution.succeeded / session.idle)
  → fetch session messages, diff against state to find NEW turns only
  → one-shot model call to summarize them into a diary entry
  → acquire file lock, append to daily/YYYY-MM-DD.md (idempotent)
  → update state
```

Long conversations accumulate multiple entries over time (incremental — only content since the last write is summarized). The summary call is a separate one-shot request: it does not enter the conversation history and does not affect your chat.

## Concurrency safety

1. `recordSession` reads state to find new turns, then summarizes.
2. Before writing it acquires a file lock (`~/.local/share/daily-journal/journal.lock`, atomic `open('wx')` creation, 40–120ms retry polling, stale locks auto-cleared after 60s).
3. Inside the lock it re-checks the idempotent marker, then appends.
4. Safe across multiple plugin instances in one server process and even across processes.

## Summary model fallback chain

Summarization is a standalone one-shot model call (never enters chat history). Model selection order:

1. **The session's own model** (whatever model the conversation uses);
2. On failure, try other available models from `ctx.model.list()` in order (skipping disabled/deprecated, de-duplicated);
3. 30s per-call timeout, 120s total budget (so one hung model can't stall the pipeline);
4. Only if everything fails, fall back to a raw excerpt (nothing is lost, just not AI-polished).

Failures are logged to `~/.local/share/daily-journal/plugin.log` (`WARN summarize ... failed`).

## Reliability design

- **Triggers**: `session.execution.succeeded` (every turn) plus `session.idle` (interactive sessions) — short-lived `opencode run` sessions are covered too;
- **Shutdown fallback**: on `location.shutdown`, in-flight work gets up to 8s to finish, then anything unflushed is written as a raw excerpt;
- **Event isolation**: a single event handler failure never kills the event subscription;
- **Hot-reload safe**: cross-instance state is versioned and stale running tasks are cleaned up (120s), so editing plugin code can't wedge future writes.

## Testing

```bash
npm test
```

Covers: message extraction, anchor continuation, time-based fallback, idempotency, concurrent writes from 8 sessions without loss, summary failure fallback, model fallback chain (success/failure/empty response/budget exhaustion), `SKIP_LOG`.

## File structure

```
opencode-daily-journal/
├── package.json
├── index.ts          # plugin entry (V2 API: event.subscribe + session.context + generate.text)
├── journal.ts        # core logic (decoupled from plugin API, unit-testable)
├── tests/
│   └── journal.test.ts
└── README.md
```

## Uninstall

```bash
opencode plugin remove opencode-daily-journal
# local install:
rm ~/.config/opencode/plugins/daily-journal
```

## License

MIT
