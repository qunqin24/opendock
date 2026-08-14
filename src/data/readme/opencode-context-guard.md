# opencode-context-guard

Your AI agent forgets everything between sessions. This plugin fixes that.

## The Problem

You spend 45 minutes with an AI agent debugging a race condition. You lock decisions, discover root causes, build a plan. Then the session ends — compaction fires, you close the terminal, context overflows. The next session starts completely blind.

You write instructions in AGENTS.md: "maintain STATE.md", "read planning artifacts before working", "checkpoint before ending." The agent reads these once at the start. Twenty turns later, it's deep in code and has forgotten every instruction. STATE.md goes stale. Planning artifacts go unread. Context that should persist across sessions is lost.

This isn't a model problem. It's a delivery problem. Instructions in a text file are read once and forgotten. There's no ongoing reminder, no compliance check, and no tools to make context management easy.

## How It Works

The plugin moves context management from text instructions to runtime enforcement. Instead of telling the agent to remember — it makes forgetting impossible.

**Every turn, the agent sees your project state.**

```
## Context Guard
Project: opencode-media-guard
focus: Implementing Layer 2 hard enforcement
phase: implementing
blockers: WeakMap cache produces 0 hits
next: Fix token cache, npm publish v0.2.0
handoff: Execute step 4 — custom tools
State updated: 12 minutes ago
Decisions: 8 locked, 2 rejected
Task: 260410-opencode-media-guard — goal.md ✓, anchor.md ✓, plan.md ✓, summary.md ✗
Git: main, 2 uncommitted, 1 ahead. Last: "add git conventions" (89 min ago)
Session: 23 min, 14 tool calls, files modified
Obligations: STATE.md needs checkpoint (files changed since last update)
```

This is injected into the system prompt on every API call — primary agent and subagents. The agent doesn't need to remember to check the project state. It's already there.

**Subagents get context for free.** When the primary agent delegates to Research, Implement, or Review, those subagents automatically see the project state. No more "forgot to pass context in the delegation prompt."

**Saving state is one tool call, not a writing exercise.** Instead of asking the agent to compose a well-written STATE.md summary (which it often does poorly), the agent fills in 6 fields:

```
focus: what we're working on
phase: planning | implementing | testing | reviewing | shipping
blockers: what's stuck
next: what to do next
handoff: who should continue and where
task: path to planning artifacts
```

No prose. No summarization. No risk of a bad summary poisoning the next session.

**The plugin tracks what you'd forget to ask about.** Uncommitted files, stale state, unpushed commits — surfaced as obligations the agent sees every turn. Not as nagging reminders, but as facts the agent incorporates into its decisions.

**Sessions that end without a checkpoint aren't lost.** When a session goes idle or gets compacted, the plugin auto-appends a log entry: what happened, how many tool calls, what files changed. The next session sees: "Last session ended without an explicit checkpoint" — a signal to verify before building on stale state.

## Why Not Just AGENTS.md?

AGENTS.md is the right place for philosophy — how to think about problems, when to escalate, how to collaborate. It's the wrong place for mechanics.

| | AGENTS.md | Context Guard |
|---|---|---|
| **When the agent sees it** | Once, at session start | Every turn, every agent |
| **Enforcement** | Honor system | Injected into system prompt — can't be skipped |
| **State awareness** | "Remember to read STATE.md" | STATE.md content is already visible |
| **Subagent context** | "Pass context in delegation" | Automatic — every subagent sees project state |
| **Checkpoint reminders** | "Update STATE.md before ending" | Obligation: "files changed since last update" |
| **Git awareness** | Agent runs `git status` manually | Branch, uncommitted files, ahead/behind — every turn |
| **Cross-session continuity** | "Read artifacts when resuming" | Artifacts status shown, warnings for stale state |

The plugin doesn't replace AGENTS.md. It takes the 50 lines of mechanical reminders that agents forget and enforces them at runtime. AGENTS.md keeps the 260 lines of workflow guidance, collaboration principles, and architectural philosophy that can't be automated.

## What It Provides

**System prompt injection** — Project state visible every turn. Focus, phase, blockers, next steps, git status, obligations. ~200 tokens.

**Three tools:**
- `context_checkpoint` — Update project state. 6 structured fields, no prose.
- `context_load` — Summarize all planning artifacts for a task in one call.
- `context_discover` — Append a finding or decision to STATE.md's log or decisions section.

**Session lifecycle management:**
- Pre-compaction: injects full project state into the compaction prompt so it survives summarization.
- On idle: auto-logs session end with tool count and file changes.
- On resume: warns if last session ended without an explicit checkpoint.

**Git awareness** — Branch, uncommitted files, commits ahead of remote, last commit message. Updated every 30 seconds. The agent stops running `git status` manually.

**Obligation tracking** — "STATE.md needs checkpoint", "3 uncommitted files", "2 commits not pushed." Facts, not nagging.

## STATE.md Format

The plugin introduces a structured STATE.md with three sections:

```markdown
# State

## Current
focus: Building context-guard plugin
phase: planning
task: ~/.config/opencode/plans/260411-context-guard-plugin/
blockers: none
next: Switch to /execute, build steps 1-3
handoff: Execute should read all 3 artifacts. Start with step 1.

## Decisions
- Pure JS only, no native deps [2026-04-11]
- Default budget 20 images [2026-04-11]
- [REJECTED] js-tiktoken — WASM dep, replaced with custom BPE [2026-04-11]

## Log
- [2026-04-11 14:00] Plan complete with 9 build steps
- [2026-04-11 13:30] Anchor established — hook behavior verified
- [auto] [2026-04-11 14:23] Session ended, 14 tool calls, 5 files modified
```

**Current** — 6 key-value fields. Overwritten on each checkpoint. Injected into system prompt every turn.

**Decisions** — Append-only. Locked decisions and rejected approaches. Never rewritten, never lost.

**Log** — Append-only, capped at 30 entries (oldest trimmed). Milestones from the agent, auto-entries from the plugin. Not injected — available for deep context when needed.

## Install

```jsonc
// ~/.config/opencode/opencode.jsonc
{
  "plugin": ["opencode-context-guard"]
}
```

Restart OpenCode. No configuration needed — works immediately with sensible defaults.

## Performance

The plugin adds <1ms to typical turns (one `fs.stat` call to check if STATE.md changed). Git status refreshes every 30 seconds (~70ms, invisible alongside 2-5 second API calls). System prompt injection is ~200 tokens — negligible overhead.

## License

MIT
