# opencode-learning

OpenCode plugin that observes session events and writes append-only JSONL for later pattern extraction.

## What it does

Watches your OpenCode sessions and captures structured observations:

- **User messages** — what you asked, truncated to a short summary (100 chars)
- **Tool calls** — which tools ran, args (content dropped from `write`/`edit`, commands truncated for `bash`), duration, success
- **Compaction** — when the session compacted
- **Session end** — total tool count, whether files were modified, session duration, observations dropped

Observations are written to `.opencode/learning/observations.jsonl` in your project root. Nothing is sent anywhere. Nothing is auto-applied. This is the raw signal you can mine later for patterns about how you and your agents actually work.

## Install

```bash
npm install opencode-learning
```

Add to your `~/.config/opencode/opencode.jsonc`:

```jsonc
{
  "plugin": ["opencode-learning"]
}
```

## What lands in your repo

On first load, the plugin creates:

```
.opencode/
  .gitignore           # excludes everything by default
  learning/
    observations.jsonl # append-only event log
```

The `.opencode/` directory is shared with other OpenCode plugins and output (artifacts, investigations). Its `.gitignore` keeps everything out of git by default.

## Safety

- **Every hook is wrapped in `safeExecute`.** A throw in most OpenCode hooks kills your session — this plugin catches and logs all errors instead.
- **Self-event filtering.** Every observation carries `source: "learning"`. The event handler is structurally filtered to only `session.idle` and `session.compacted` — every other event type is ignored without inspection. This prevents feedback loops if a future version emits its own events.
- **Content dropping.** `write` and `edit` tool args have their content fields (`content`, `oldString`, `newString`) dropped entirely — file contents never enter the log. Bash `command` fields are truncated to 100 chars.
- **Text truncation.** User message text is truncated to 100 characters. No pattern-based redaction — the observations file lives locally in your own repo.
- **Init failure resilience.** If storage init fails (read-only filesystem, etc.), hooks still register and run — observations are silently dropped rather than crashing the session.
- **File rotation.** The observations file rotates at 10MB, keeping one backup (`.1.jsonl`).

## Observation shape

```jsonl
{"ts":"2026-04-30T01:23:45.678Z","type":"user_message","session":"abc","source":"learning","agent":"operate","parent":null,"text":"Read foo.ts and check f…<32 more>"}
{"ts":"...","type":"tool_call_start","session":"abc","source":"learning","agent":"operate","tool":"read","call_id":"xyz","args":{"filePath":"/path/to/foo.ts"}}
{"ts":"...","type":"tool_call_end","session":"abc","source":"learning","agent":"operate","tool":"read","call_id":"xyz","success":true,"duration_ms":12}
{"ts":"...","type":"compaction","session":"abc","source":"learning"}
{"ts":"...","type":"session_end","session":"abc","source":"learning","duration_ms":300000,"tool_count":42,"files_modified":true,"observations_dropped":0}
```

## Extracting patterns

The `/extract` command analyzes accumulated observations and surfaces repeating workflow patterns as proposals. Copy `commands/extract.md` from this repo to your OpenCode commands directory:

```bash
cp commands/extract.md ~/.config/opencode/commands/extract.md
```

Then run `/extract` in any OpenCode session. It scans observation files across your projects, identifies consistent behaviors (workflow sequences, delegation preferences, tool idioms), and presents proposals for codifying them into AGENTS.md, skills, or commands.

See [`commands/extract.md`](commands/extract.md) for the full command.

## Performance

Hook handlers are budgeted to <5ms p99. Measured: p50=0.035ms, p99=0.090ms, max=0.5ms over 1000 iterations. Storage is sync `fs.appendFileSync` — well under the 5ms budget.

## License

MIT
