# opencode-team-memory

Persistent role-based memory for OpenCode + Oh-My-OpenCode(OmO) Team Mode.  
Context survives across sessions, Team Mode runs, and compaction.

**v1.1.0**: Auto-role restoration on session start — Agent recognizes its role without manual reload.

## Problem

OmO Team Mode members are ephemeral — they die when the run ends (default: 120 min).  
Next session, every role starts from zero. No persistent Engineer context, no Tester NG history,  
no Director decision trail.

## Solution

Three tools that read/write role context to the filesystem:

| Tool | Purpose |
|---|---|
| `role_memory_save` | Persist decisions, NG history, scope, active files, handoff target |
| `role_memory_load` | Restore context from previous sessions (own role or cross-read others) |
| `role_memory_clear` | Reset memory for a fresh start |

Stored per-role at `<project>/.omo/team-memory/{role}/context.json`.  
Override with `OPENCODE_TEAM_MEMORY_DIR` env var.

Compaction hook injects compact summaries automatically — long sessions keep context.

## Auto-Role Restoration (v1.1.0)

When opencode starts, the plugin checks saved role memory and injects a continuation prompt into the system prompt. The Agent automatically:

1. Recognizes its role (engineer / tester / designer / director)
2. Reads handoff state (who passed work and where it goes next)
3. Sees recent NG items and critical decisions
4. Knows confirmed and excluded scope

**No manual `role_memory_load` required.** The session starts with full context.

Output looks like:

```
## Team Continuation (opencode-team-memory)

### Your Role: engineer
### Handoff → tester
### Status: ng_count=2
### Critical Context
use postgres; adopt JWT; add rate limit
### Recent NG Items
login redirect broken
token expiry too short
### Confirmed Scope
- auth module

### Instructions
1. role_memory_load(role="engineer") before starting
2. Handoff target is 'tester' — prepare output accordingly
3. Address NG items first
```

## Enable / Disable

Toggle without editing config files. Restart `opencode` after switching.

**Disable**:
```bash
touch .omo/.team-memory-disabled
```

**Enable**:
```bash
rm .omo/.team-memory-disabled
```

Or register as custom commands in `opencode.json`:

```jsonc
{
  "command": {
    "memory-on": {
      "description": "Enable team memory plugin",
      "command": "rm -f .omo/.team-memory-disabled && echo 'Team memory enabled (restart opencode)'"
    },
    "memory-off": {
      "description": "Disable team memory plugin",
      "command": "touch .omo/.team-memory-disabled && echo 'Team memory disabled (restart opencode)'"
    }
  }
}
```

Then type `/memory-off` or `/memory-on` in the TUI.

**Check installation:**
```
/preflight
```

Runs automated checks for RTK, Context-Mode, and team-memory status.

## Install

```bash
bun add -d opencode-team-memory
# or: npm install --save-dev opencode-team-memory
```

Register in `opencode.json`:

```jsonc
{
  "plugin": ["opencode-team-memory"]
}
```

## Team Member Prompt Template

Add this to each member's prompt in `.omo/teams/{name}/config.json`:

```markdown
## Persistent Memory Protocol

### On session start (MANDATORY)
role_memory_load(role="<your-role>") before ANY work.
Cross-read other roles as needed (e.g. Tester reads Engineer's memory).

### On session end / handoff (MANDATORY)
role_memory_save(role="<your-role>", raw="...", previous_decisions=[...])

### Handoff
Before passing to the next role, set handoff_to="<next-role>" in your save.
```

### Role-specific prompts

<details>
<summary>Director (Lead / Sisyphus)</summary>

```
You are the Director. Load memory first.
- previous_decisions: carry forward prior judgments
- excluded_scope: NEVER touch these areas
- On save: record every decision (adopt/reject/defer + reason)
- Do NOT dive into implementation details — delegate to Engineer
```
</details>

<details>
<summary>Engineer (deep / hephaestus)</summary>

```
You are the Engineer. Load memory first.
- ng_history: check for repeated bugs before coding
- active_files: be extra careful with these
- On save: record "what was committed, what changed, unresolved concerns"
- On handoff to Tester: put "what to test, preconditions, repro steps" in raw
- On handoff to Director: put "completed scope, known limits, unhandled edge cases" in raw
- Do NOT make spec decisions alone — confirm with Director via team_send_message
```
</details>

<details>
<summary>Tester (quick / unspecified-low)</summary>

```
You are the Tester. Load your memory AND Engineer's memory first.
- ng_history: extract verification points from prior failures
- On save: record test results (OK/NG), test angles covered
- On NG: team_send_message to Engineer with "NG item, expected, actual, repro steps"
  AND role_memory_save with ng_history update
- On OK: team_send_message to Director
  AND role_memory_save with full test results
- Do NOT fix issues yourself — always bounce back to Engineer
- Do NOT approve with "probably fine" — verify expected vs actual
```
</details>

<details>
<summary>Designer (visual-engineering + frontend-ui-ux)</summary>

```
You are the Designer. Load memory first.
- previous_decisions: recall prior UI choices and rejections
- ng_history: watch for recurring UX issues
- On save: record "adopted patterns, rejected alternatives, mobile feel, empty states"
- On handoff to Director: put "recommended UI, alternatives + tradeoffs, decisions needed" in raw
- On handoff to Engineer: put "adopted UI pattern, state transitions, edge case displays" in raw
- Do NOT let implementation difficulty skew UI judgment — Director decides
- Be specific: "vague discomfort" is not actionable
```
</details>

## Cross-role memory reading

Tester should read Engineer's memory for context:

```
role_memory_load(role="engineer")  // what was implemented, preconditions
role_memory_load(role="tester")    // own context
```

Designer should read Director's memory:

```
role_memory_load(role="director")  // scope, goals, explicit exclusions
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `OPENCODE_TEAM_MEMORY_DIR` | `<project>/.omo/team-memory` | Storage directory. **Warning**: If set globally, multiple projects share the same memory. Use per-project values or keep the default. |

## Stored data structure

```typescript
interface MemoryEntry {
  version: number               // schema version (for future migration)
  role: string
  project: string
  last_updated: string
  previous_decisions: string[]  // max 50 entries
  ng_history: string[]          // max 50 entries
  confirmed_scope: string[]
  excluded_scope: string[]
  active_files: string[]
  handoff_to: string            // target role for next handoff
  raw_entries: string[]         // max 50, load returns last 5
}
```

## Troubleshooting

**Tools not visible in Team members**  
If OmO Team members can't see `role_memory_*` tools, the plugin tools may not be exposed to subagent sessions.  
Workaround: wrap the same logic in an MCP server. A companion MCP package is planned.

**Stale context across runs**  
Run `role_memory_clear(role="engineer")` to wipe and start fresh.

## Versioning

- **MAJOR**: Data structure breaking changes (field removal, type change)
- **MINOR**: New tool, new optional field (backward compatible)
- **PATCH**: Bug fixes, doc updates

The `version` field in `context.json` enables future migration of old data.

## License

MIT
