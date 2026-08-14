# opencode-model-tamer

[![npm version](https://badge.fury.io/js/opencode-model-tamer.svg)](https://www.npmjs.com/package/opencode-model-tamer)

Behavioral enforcement plugin for [OpenCode](https://opencode.ai) that forces AI agents to use tools, verify before claiming completion, and avoid hallucination.

Built for models that forget system prompts, skip tool calls, hallucinate file paths, and claim "done" without verification — but works with any model.

## What It Does

Your agent keeps saying "I'll check the docs" but never opens a file? Claims "fixed!" without running tests? Mentions `src/utils/magicParser.ts` when that file doesn't exist? This plugin catches that.

### 13 Enforcement Rules

| # | Rule | Catches | Required Tool |
|---|---|---|---|
| 1 | **QUESTION_TOOL_MANDATE** | Blocking questions in plain text ("What should I do?") | `question` |
| 2 | **TODO_CREATION_MANDATE** | Multi-step edits without creating a todo list | `todowrite` |
| 3 | **ASK_INSTEAD_OF_GUESS** | Uncertainty ("I'm not sure how to...") without asking | `question` |
| 4 | **WEBSEARCH_MANDATE** | Tech evaluations without research | `websearch` or `context7` |
| 5 | **CONTEXT7_MANDATE** | Library documentation questions without docs | `context7` |
| 6 | **EVIDENCE_BEFORE_ASSERTIONS** | Strong claims ("the best", "always faster") without evidence | Any research tool |
| 7 | **TOOL_INTENT_WITHOUT_EXEC** | "I'll read/search/check..." with zero tool calls | *Any tool* |
| 8 | **PREMATURE_COMPLETION** | "Done!" after edits without verification | `lsp_diagnostics`, `bash`, `read` |
| 9 | **FABRICATED_PATH** | References to non-existent files | N/A (logs violation) |
| 10 | **REPETITION_LOOP** | Repeating content (context-rot signal) | N/A (logs violation) |
| 11 | **PREMATURE_EXEC_WHILE_CONSULT_PENDING** | Mutating tool fires while a delegated/background consult is still running | Wait for consult result |
| 12 | **UNILATERAL_COLLAB_DECISION** | Picking an option without asking after user invited collaboration ("let's think of a name") | `question` |
| 13 | **EXPLORATORY_QUESTION_AS_DIRECTIVE** | Executing edits when the user asked an exploratory question ("can we", "what if", "should we") | `question` or discuss first |

### Architecture

- **Violation counter** — tracks per-rule counts, emits `DRIFT_ESCALATION` after 3+ violations
- **Drift checkpoint** — logs checkpoint every 8 turns with violation summary
- **Log-only** — cannot block execution (OpenCode limitation), but provides audit trail

## Installation

### Via npm (recommended)

```bash
npm install -g opencode-model-tamer
```

Then add to your `~/.config/opencode/opencode.json`:

```json
{
  "plugin": [
    "opencode-model-tamer"
  ]
}
```

### Via local path

```bash
git clone https://github.com/yourusername/opencode-model-tamer.git
```

```json
{
  "plugin": [
    "./opencode-model-tamer"
  ]
}
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `OPENCODE_MODEL_TAMER_LOG` | OS temp dir (`/tmp/behavior-enforcement.log` on Unix) | Path to violation log file |

### Log Location

```bash
# View violations in real-time
tail -f "$TMPDIR/behavior-enforcement.log"

# Summary by rule
cat "$TMPDIR/behavior-enforcement.log" | jq -r '.rule' | sort | uniq -c | sort -rn

# Escalation events only
cat "$TMPDIR/behavior-enforcement.log" | jq 'select(.rule == "DRIFT_ESCALATION")'
```

## Testing

Run the unit test suite:

```bash
node test/rules.test.mjs
```

Run integration tests with your model:

```bash
# Should trigger QUESTION_TOOL_MANDATE
opencode run "hello"

# Should trigger CONTEXT7_MANDATE (if no context7 used)
opencode run "How do I use Express middleware?"

# Should NOT trigger WEBSEARCH_MANDATE (model should use websearch)
opencode run "Compare React vs Vue for a new project"
```

## Target Models

Originally built for models with these documented failure modes:

- **MiniMax M2** — plans then stops, ignores half the instructions, loops
- **Kimi K2 / K2.6** — tool calls inside thinking blocks, long-context repetition

But works with any model that:
- Forgets system prompts after N turns
- Skips tool calls and answers from memory
- Hallucinates file paths or APIs
- Claims completion without verification

## How It Works

Uses OpenCode's native plugin hooks:

- `chat.message` — captures user queries, detects collaboration invites + exploratory questions, resets tool tracker
- `tool.execute.before` — tracks every tool call, fires rules 11/13 on mutating tools
- `event` (message.updated) — tracks message flow and pending background consults
- `experimental.text.complete` — validates generated text against all 13 rules
- `session.status` — drift checkpoints every 8 turns

## License

MIT

## Contributing

PRs welcome. Focus areas:
- Per-model rule profiles (different thresholds for MiniMax vs Kimi vs Claude)
- `experimental.session.compacting` hook for mid-turn rule reinjection
- Configurable keyword lists via JSON config
- Dashboard/viewer for violation history
