# fixate-on

A session-scoped goal-tracking plugin for [OpenCode](https://opencode.ai/). Run `/goal <objective>` to hold an objective in context, drive continuations when the assistant goes idle, enforce evidence-cited recovery against premature exits, and settle the goal only after a verifier has checked the completion claim.

A plugin that prevents premature exits must also prevent finished work from looping forever. `fixate-on` bounds both failure modes:

- **A goal never settles on narration.** Every completion claim requires an **attestation** naming the verifier that checked it. A judge's concurrence is weak evidence and its refusal is strong, making the policy asymmetric: easy to continue, hard to settle.
- **A failure to obtain an attestation is a fault, not a verdict.** Operational verifier errors are retried with backoff and bounded by both a total recovery budget and a consecutive-unchanged threshold. When no verifier is available or faults exhaust the bound, the goal settles or pauses with an explicit receipt rather than looping indefinitely.
- **Brakes are not verdicts.** Turn, token, duration, and API-cost ceilings stop a continuation; they never assert whether the objective is complete or blocked.

**Core capabilities:**

- **Claim ledger & judge-driven gate:** Every completion claim records the claim, verifier check, and outcome. Claims without an attestation are recorded as unattested — never `verified-complete`.
- **Recovery escalation (r1–r4):** Rejected claims trigger a bounded pressure ladder citing failed evidence and outstanding requirements. Cited evidence later shown to be wrong receives a visible retraction.
- **Artifact pointers (`--pointer <file>`):** Injects live file content into every continuation without mutating the goal contract. Contract-tier turn and token ceilings cannot be raised by agent tools mid-run.
- **Brakes & crash-safe persistence:** Stall, context-token, turn, no-progress, and no-tool-call bounds backed by session-scoped state files (`0600`), an append-only WAL lifecycle ledger, and per-session single-writer leases.
- **Handback & TUI companion:** Scoped reviewable diffs, known-risk enumeration, and an optional interactive TUI dashboard (`fixate-on/tui`).

> **Compatibility note:** This plugin relies on experimental OpenCode hooks (`experimental.chat.system.transform` and related lifecycle hooks). Re-test against the exact OpenCode build and provider/backend stack you use for unattended runs.

---

## Installation

Register the plugin in `opencode.json`:

```json
{
  "plugin": ["fixate-on"]
}
```

On stock OpenCode v1 hosts, this single entry is the only required step. The plugin's `config` hook auto-registers the `/goal` slash command, the `goal` agent, and the read-only `goal-verify` subagent.

<details>
<summary>Optional: customize <code>command.goal</code> on OpenCode v1</summary>

```json
{
  "plugin": ["fixate-on"],
  "command": {
    "goal": {
      "description": "Set a session-scoped goal and auto-continue until complete.",
      "template": "$ARGUMENTS"
    }
  }
}
```

A user-defined `command.goal` is preserved via `??=` semantics, except for its `agent` field, which the plugin deletes. OpenCode routes to a command's `agent` *after* `command.execute.before` fires, so keeping `agent` on v1 would override the hook's output; the continuation loop uses the session's default agent instead.

</details>

### `/goal` on OpenCode v2 hosts

On OpenCode v2 hosts (`opencode2`), plugins cannot intercept slash-command execution via `command.execute.before`, and a command template without `$ARGUMENTS` appends raw arguments as chat text. For `/goal` submissions to reach goal state rather than plain chat, configure `command.goal` to route through the plugin's `goal-command` bridge tool:

```json
{
  "command": {
    "goal": {
      "description": "Run a goal loop for the objective",
      "template": "Call the goal-command tool exactly once with its subcommand parameter set verbatim to: $ARGUMENTS\nDo not summarize, do not ask for confirmation, and do not perform any other work. Reply with only the tool output.",
      "agent": "build"
    }
  }
}
```

With this template wired, `/goal <objective> --pointer SPEC.md --max-turns 10` creates the goal with artifact pointers on disk, drives continuations, and settles through the claim ledger. On stock OpenCode 1.x this template is unnecessary because the plugin intercepts the auto-registered command directly.

### TUI companion setup

The optional TUI companion (`fixate-on/tui`) provides an interactive dashboard, command palette actions (`ctrl+p` → `fixate:`), keyboard chords, and lifecycle toasts. Because `TuiPluginModule` and the server `PluginModule` are mutually exclusive, stock OpenCode v1 loads the server plugin from `opencode.json` and the TUI companion **only** from `tui.json` (`~/.config/opencode/tui.json` or `$OPENCODE_TUI_CONFIG`):

`opencode.json`:

```json
{
  "plugin": ["fixate-on"]
}
```

`tui.json`:

```json
{
  "plugin": [
    ["fixate-on/tui", { "logLevel": "info" }]
  ]
}
```

**State root alignment:** Both the server plugin and the TUI companion resolve the persisted state directory independently and reject goal files whose embedded session ID does not match their parent directory. If you override the default state directory, either set the `FIXATE_ON_STATE_ROOT` environment variable (read by both) or pass the identical `stateRoot` option to both entries:

```json
{
  "plugin": [
    ["fixate-on/tui", { "stateRoot": "my/state/root", "logLevel": "info" }]
  ]
}
```

See [`docs/tui-integration.md`](docs/tui-integration.md) for the dual-mode output headers, v1 disk-refresh vs v2 `Result.metadata` transport architecture, toast coalescing rules, and keyboard shortcut tables.

### Loading from local source

To test a local checkout without packing, point OpenCode directly at `src/plugin.ts` (keep test files out of OpenCode's auto-loaded plugin directory):

```json
{
  "plugin": ["file:///absolute/path/to/fixate-on/src/plugin.ts"]
}
```

**Quick smoke test:**

1. Load the plugin in a scratch OpenCode config and configure `command.goal` if running on a v2 host.
2. Run `/goal status` and confirm no active goal is reported.
3. Run `/goal inspect this repo and call update_goal with status "blocked" if you need user input`.
4. Verify `/goal status`, `/goal pause`, `/goal resume`, and `/goal clear` transition state as expected.

---

## `/goal` Command Reference

Natural language is the primary interface: `/goal <objective>` works with zero flags. Subcommands and per-goal flags provide lifecycle control and optional overrides.

### Subcommands

| Command | Behavior |
|:---|:---|
| `/goal <objective> [flags]` | Sets or replaces the focused goal in the current session. |
| `/goal add <objective> [flags]` | Creates and focuses a new goal while leaving existing unfinished goals active. |
| `/goal sequence <obj1>; <obj2>` | Queues multiple objectives (separated by `;` or newlines) as an ordered pipeline. Focuses the first and keeps successors paused (`queued`) until auto-promoted on completion. |
| `/goal status [--full \| --verbose]` | Shows a plain-language state headline, remaining brakes, and next duty. `--full` / `--verbose` prints the full usage breakdown, recovery counters, and raw evidentiary claim ledger. |
| `/goal list [all]` | Lists numbered live goals and settled goals in the per-session archive, with state markers (`focused` = driven now, `idle` = active between turns, `background` = waiting). |
| `/goal focus <number \| goalId>` | Switches which goal the dashboard and bare commands target. Persisted on disk. Does not alter goal status (focusing a paused goal leaves it paused; unfocused active goals keep running). |
| `/goal pause [<goalId>]` | Pauses the focused (or named) goal while retaining its state and history. |
| `/goal resume [<goalId>]` | Resumes a paused, blocked, or brake-stopped goal with a fresh local budget window and reset turn count, preserving the objective and history. |
| `/goal edit <new objective>` | Revises the focused goal's objective in place, preserving budgets and history and clearing any paused/blocked state. If the goal already hit a hard brake, run `/goal resume` for a fresh budget window. |
| `/goal checkpoint <note>` | Records a progress note on the focused goal. |
| `/goal history [--verbose]` | Displays the lifecycle event trail and latest progress note. |
| `/goal clear [<goalId>]` | Removes live goal state and saved status (aliases: `stop`, `off`, `reset`, `none`, `cancel`). Clears immediately when only one live goal exists; when several exist, bare `/goal clear` refuses and requires a `<goalId>` (or unique prefix). Terminal ledger tombstones remain on disk for crash-safe recovery. |

Every action that accepts a `<goalId>` (`pause`, `resume`, `focus`, `clear`) matches either the full ID or a unique prefix, rejecting ambiguous prefixes with an error instead of guessing.

### Per-goal flags

Flags accept `--flag value` or `--flag=value`. Quote multi-word values. Unknown flags, missing values, non-positive integers, or invalid `--mode` values reject the command with an explicit error instead of folding malformed flags into the objective.

| Flag | Description |
|:---|:---|
| `--success <text>` | Success criteria injected alongside the objective (alias: `--success-criteria`). |
| `--constraints <text>` | Constraints or non-goals to respect (alias: `--non-goals`). |
| `--pointer <file>` | Artifact pointer; injects live file content into every continuation without editing the contract. |
| `--mode <normal\|ordered>` | Prompt mode for a single goal (`default: normal`; `ordered` preserves step order within the objective). |
| `--max-turns <n>` | Continuation turn ceiling (contract-tier). |
| `--max-minutes <n>` | Stall brake in minutes (time without progress). |
| `--max-duration-ms <n>` | Stall brake in milliseconds (time without progress). |
| `--max-tokens <n>` | Cumulative context token ceiling (contract-tier). |
| `--budget <n>` | Shorthand for `--max-tokens`; accepts `k`/`m` suffixes (e.g. `100k`, `1.5m`). |
| `--token-budget <n>` | Advisory API-cost token budget (`k`/`m` suffixes supported; `null` = unbounded). Triggers a one-time `budget_limit.md` prompt when crossed. |
| `--cooldown-ms <n>` | Minimum delay between continuations in milliseconds (`0` = no delay). |
| `--no-progress-threshold <n>` | Output-token floor for a stalled turn (`0` = disable no-progress heuristic). |
| `--no-progress-turns <n>` | Consecutive stalled low-output turns before pausing (`0` = pause on first). |
| `--no-tool-turns <n>` | Consecutive tool-free continuation turns before pausing (`0` = disabled). |
| `--max-recovery-turns <n>` | Total bounded recovery turns before escalating (`default: 12`). |
| `--max-unchanged-results <n>` | Consecutive unchanged verifier results (matching candidate + fingerprint) before escalating (`default: 3`). |
| `--max-blocked-turns <n>` | Consecutive `update_goal {status: "blocked"}` calls required before `blocked` is accepted (`default: 3`). |
| `--verbose` | Renders verbose command output. |

### Examples

```sh
# Plain-language goal using default brakes
/goal fix the failing tests and confirm the suite passes

# Override turn, duration, and context-token brakes
/goal "migrate class components to functional" --max-turns=20 --max-minutes 60 --budget 400k

# Attach explicit success criteria, constraints, and a live spec pointer
/goal "ship the release" --success "tests pass, changelog updated" --constraints "do not modify the public API" --pointer SPEC.md

# Queue an ordered multi-goal pipeline
/goal sequence build the parser; write unit tests; update docs
```

---

## Multi-Goal & Session-Scoped Behavior

### Concurrent goals and focus

A session can hold multiple goals simultaneously, and **every unfinished goal is driven**: each session-idle event continues every active (or re-armable) goal in the session, not only the focused one.

- `/goal <objective>` replaces the focused goal.
- `/goal add <objective>` adds and focuses a new objective while leaving prior goals running.
- `/goal focus <number | goalId>` changes which goal bare commands (`/goal pause`, `/goal resume`, `/goal edit`, `/goal checkpoint`) and the TUI cockpit target by default.
- In an ordered sequence created via `/goal sequence`, only the head goal runs; queued successors stay paused until the active goal settles as `complete`, at which point the next queued goal is auto-promoted and focused.

### Forks and session deletion

Goals are **session-scoped**: each goal belongs to exactly one session and is stored in that session's state file. Sharing a single goal instance across two sessions is rejected.

When a session is forked, live goals are **copied** into the fork with newly minted `goalId` values while the parent session keeps its own goals:

- **Intent crosses over, work does not:** The copy preserves the objective, completion contract (`--success`, `--constraints`, artifact pointers), mode, and brake configuration. Turn counts, tokens used, recovery and fault counters, blocked streaks, claims, and pending intents start empty in the fork. Settled goals (`complete`, `budgetLimited`) are not copied.
- **OpenCode v1 vs v2 fork detection:** Stock OpenCode v1 creates a fork as an unrelated top-level session without a `parentID` (leaving only a mutable `… (fork #1)` title); the plugin refuses to guess ancestry from titles, so v1 forks start without copied goals. OpenCode v2 emits a durable `session.forked` event carrying `parentID` and the fork boundary, which triggers the copy.
- **Deleted sessions:** If a goal's owning session is deleted, the next continuation fails and pauses the goal with the status reason `session not found` so the cause is explicit rather than silently abandoning the goal or reporting completion.

---

## Continuation Loop & Steering

1. **System prompt injection & injection hardening:** Active goals are injected into the primary `system` message wrapped in XML-escaped `<goal_objective>` tags. The objective is explicitly framed as user-provided task data, never as elevated instructions capable of overriding system, developer, tool, or repository policies. When a goal is **paused**, the plugin injects a system guard that omits the objective and requires an explicit `/goal resume`, preventing command text routed through chat on v1 hosts from being mistaken for active work.
2. **Steering templates:**
   - `continuation.md` — Injected on every idle continuation. Carries the completion check, the 3-consecutive-turn blocked rule, verification pressure, fidelity constraints, and work-from-evidence instructions without re-quoting the standing system-prompt objective every turn.
   - `budget_limit.md` — Injected once per goal (advisory, not a hard interrupt) when the explicit API-cost `token_budget` is crossed. In-flight tokens continue accruing until the turn ends.
   - `objective_updated.md` — Injected when `/goal edit` revises the objective.
3. **Idle pre-flight & deduplication:** Continuations preserve the initiating turn's agent, provider/model, and variant. After `minDelayMs`, the plugin re-verifies that the session is still idle and that no human message, newer assistant turn, Plan-agent switch, rejected permission, abort, or provider error has intervened. A durable claim on the source assistant turn prevents duplicate continuations across distinct idle events. If the host reports itself busy, the continuation is *deferred* without consuming turn budget and retried on the next idle, bounded by `maxPromptFailures`.
4. **Yield, then re-arm:** Sending a human message while a goal is active aborts any in-flight continuation and pauses active goals for the duration of your turn. When your turn goes idle, goals paused by this conversational interjection re-arm automatically. Two cases remain paused:
   - Whole-message stop imperatives (`"stop"`, `"pause"`, `"hold off"` — matched conservatively so mixed instructions like `"stop the server then fix tests"` remain normal steering) pause with `explicit pause` and require `/goal resume`.
   - If a yielded turn never settles within 15 minutes, the goal stops claiming it will auto-resume, surfaces as waiting on you, and accepts `/goal resume`.
5. **OpenCode v1 kickoff & echo filtering:** Because slash commands on stock v1 do not launch an assistant turn on their own, the plugin schedules a one-shot kickoff probe (`kickoffDelayMs`, default `2500` ms) when a command activates a goal, sending the first continuation only if no turn started organically. It also fingerprints just-dispatched slash arguments so v1's chat echo of `/goal ...` does not trigger a human-interjection pause.
6. **Compaction survival:** When OpenCode compacts a session, the plugin injects a deterministic summary reconstructed from the persisted goal record (objective, status, budget usage, recent progress notes, and lifecycle trail) and disables OpenCode's generic post-compaction auto-continue so it cannot race the plugin's continuation.
7. **Host token accounting:** On v1, token usage is tracked via `message.updated` events (falling back to fetched session messages when per-message events are absent). On v2, usage is tracked via ephemeral `session.usage.updated` steps. Because session context is shared, token usage accrues to every non-terminal goal in the session.

---

## Agent Tools & Goal State Model

Completion and blocking are driven exclusively through the canonical tool surface — never by parsing free-text markers. Six agent-facing tools are registered by default (`registerTools: true`), plus the `goal-command` bridge on OpenCode v2 hosts:

| Tool | Arguments | Behavior |
|:---|:---|:---|
| `get_goal` | _(none)_ | Returns the focused goal as a `ThreadGoal` (`{goalId, threadId, objective, status, tokenBudget, tokensUsed, timeUsedSeconds, createdAt, updatedAt, artifactPointers, pendingProposal}`) plus `remainingTokens` and `completionBudgetReport`, or `null` if none exists. |
| `create_goal` | `objective` (string), `token_budget` (optional positive int) | Creates an active user-requested goal (`token_budget` sets the advisory API-cost ceiling; `null` = unbounded). **Fails if an unfinished goal already exists** in the session; terminal goals (`complete`, `budgetLimited`) do not block creation. |
| `update_goal` | `status` (`"complete"` \| `"blocked"`) | Transitions the focused goal. Accepts **only** `status` (no free-text `evidence` or `blocker` parameters; pause, resume, and brake limits are user/plugin-controlled). See below for `complete` and `blocked` gates. |
| `list_goals` | _(none)_ | Lists all goals in the current session. |
| `focus_goal` | `goal_id` (string) | Changes the focused goal in the current session. |
| `propose_goal_change` | proposal fields | Records a `pendingProposal` on the goal for human review (agents cannot raise contract-tier turn or token ceilings directly). |
| `goal-command` | `subcommand` (string) | *(OpenCode v2 only)* Routes `/goal` slash-command invocations into plugin state when wired via `command.goal`. |

Tool schemas are defined with `zod` (a direct dependency). If `registerTools: false` is set or `zod` fails to load at runtime, active goals pause with a visible notice rather than looping on continuation prompts that reference unavailable tools. Legacy tool aliases (`goal_status`, `goal_set`, `goal_pause`, `goal_resume`, `goal_block`, `goal_complete`, `get_goal_history`, `set_goal`, `clear_goal`) are not registered.

**Goal statuses:** `active` · `paused` · `blocked` · `budgetLimited` · `finalizing` · `complete`

- `finalizing` is the transient state held while a settlement is being recorded.
- `complete` and `budgetLimited` are **terminal**. A `budgetLimited` goal is frozen — it cannot be resumed, paused, or moved to `blocked`, and it does not block `create_goal`.
- **Step barrier on `complete`:** Calling `update_goal {status: "complete"}` records a pending completion intent that is evaluated after the current step finishes, preventing the model from claiming completion and exiting before verification runs.
- **Mechanical 3-consecutive-turn rule on `blocked`:** Calling `update_goal {status: "blocked"}` captures the blocker reason from the assistant's latest turn text and rejects the transition until the same blocker recurs `maxBlockedTurns` consecutive times (default `3`, configurable via `--max-blocked-turns`). The streak persists across the idle boundary when re-asserted and resets on `/goal resume` or any non-blocked turn.

---

## Completion Verification

Every `update_goal {status: "complete"}` claim is checked by a **judge-driven completion gate**. All command execution is **agent-driven**: the plugin never executes external shell commands, Makefile targets, or test suites itself. The agent runs checks using its own tools and cites the evidence; the judge evaluates whether the claim holds.

### Verifier resolution and verdicts

The completion gate consults one verifier in the following precedence order:

1. **Custom `judge` callback:**
   `judge: async ({ goal, sessionID, latestText }) => ({ approved, reason })`
   When configured in plugin options, takes precedence over the built-in judge and uses the `{ approved, reason }` return contract.
2. **Built-in child-session judge (`childSessionJudge`, default `true`):**
   Spawns an isolated OpenCode child session running the hidden `goal-verify` subagent bound to the goal's workspace directory. The subagent has a default-deny tool policy: only `read`, `glob`, and `grep` are allowed (`bash`, `edit`, and `write` are denied). It emits a structured verdict conforming to `completion-verdict.schema.json` (`COMPLETE`, `WORKING`, `BLOCKED`, `NEEDS_INPUT`, or `CANCELLED`, plus `candidate`, `fingerprint`, `outstanding`, and `evidence`). The host stamps the candidate identity (git `HEAD` + worktree fingerprint) onto the attestation.
3. **No judge available (`childSessionJudge: false` and no custom `judge`):**
   The gate abstains (`unavailable`). To prevent an unendable loop, after a bounded number of attempts the claim is recorded on the `none` check path as `unverifiable-claim` with verdict `NONE` — **never** `verified-complete` — and settles with stop reason `completed (no attestation could be obtained)` so queued sequence goals behind it can proceed.

**Verdict transitions:**

- `COMPLETE` → settles and archives the goal as achieved (`complete`).
- `WORKING` → enters bounded recovery, injecting a forced continuation with the outstanding gates and failed evidence.
- `BLOCKED` / `NEEDS_INPUT` → settles with evidence (pauses for user input).
- `CANCELLED` → settles as an authorized cancellation.
- **Attestation fault** (provider error, timeout, missing child-session ID) → retried with backoff as a forced continuation; never treated as a verdict on the goal.

**Recovery bounds:** Recovery is bounded by both a total recovery budget (`--max-recovery-turns`, default `12`) and a consecutive-unchanged threshold (`--max-unchanged-results`, default `3`, comparing `candidate` + `fingerprint`). A new candidate resets the consecutive-unchanged counter but not the total budget. Exhausting either bound pauses the goal with stop reason `recovery exhausted` and **never** fabricates `COMPLETE`.

### Tuning the built-in judge (`judgeOptions`)

```ts
await GoalsPlugin(
  { client, directory },
  {
    childSessionJudge: true,
    judgeOptions: {
      timeoutMs: 60_000,
      failurePolicy: "reject" as const,
    },
  },
);
```

- `timeoutMs` (default `120000` ms): Maximum time to wait for the child-session judge to return a verdict.
- `failurePolicy` (default `"reject"`): Fails closed on attestation faults. Setting `"approve"` acts solely as a compatibility escape hatch that synthesizes a `WORKING` verdict (never `COMPLETE`) so bounded recovery continues. `judgeOptions` is ignored when a custom `judge` callback is provided.

### Advisory phrase triage

`src/stop-guard.ts` scans the assistant's final message across 22 word-boundary-anchored patterns for unfinished work, deferral, permission-seeking, and session-length excuses. When the verifier returns `WORKING`, any matched pattern appends its diagnostic reason to the recovery prompt. Phrase triage is strictly advisory and **cannot block or override** an attested `COMPLETE` verdict (the 16-case adversarial corpus in `test/fixtures/guard-corpus.tsv` locks a stated product boundary of `tp=6 fp=4 fn=2 tn=4`).

---

## Brakes, Persistence, and Configuration

### Default brakes

| Brake | Default | Notes |
|:---|:---|:---|
| Auto-continue turns (`maxTurns`) | `0` (`unlimited`) | Off by default; turn count alone cannot distinguish productive work from a stall. Disabled limits always render as `unlimited`, never `/ 0`. |
| Stall brake (`maxDurationMs`) | `30 minutes` (`1800000` ms) | Time since last evidence of progress (a completed assistant turn or output-token increase, measured from goal creation before first progress — never suppressed by a hung tool call). |
| Context tokens (`maxTokens`) | `1,000,000` | Cumulative provider-reported context tokens (`input + output + reasoning + cache read + cache write`). |
| Continuation cooldown (`minDelayMs`) | `1.5 s` (`1500` ms) | Minimum delay before sending a continuation after idle. |
| No-progress pause | `< 50` output tokens × `3` turns | Pauses after `noProgressTurnsBeforePause` consecutive low-output turns with no meaningful progress-note change. |
| No-tool-call pause | `3` consecutive turns | Pauses after `noToolCallTurnsBeforePause` consecutive tool-free continuation turns (anti self-chat loop). |
| Budget wrap-up threshold (`budgetWrapupRatio`) | `80%` (`0.8`) | Sends a wrap-up warning when context tokens reach 80% of `maxTokens`. |
| Prompt failure pause (`maxPromptFailures`) | `3` consecutive failures | Pauses when host prompt dispatch fails or defers 3 times in a row. |

**Wrap-up vs. hard stop:** When a brake is reached, the plugin sends one final prompt asking the assistant to summarize what is done, what remains, and the next concrete step. Because a brake is a budget rather than a verdict, the prompt instructs the assistant to call `update_goal {status: "complete"}` only if the objective is genuinely satisfied, and not to mark it `blocked` merely because a brake fired. Run `/goal resume` to continue with a fresh budget window.

### Persistence and state root

By default (`persistState: true`), each session's goals are persisted to `.opencode/goals/sessions/<sessionID>/state.json` (mode `0600`, inside an owner-only directory) alongside an append-only WAL lifecycle ledger (`state.json.ledger.jsonl`, mode `0600`). Add `.opencode/goals/` to `.gitignore`.

- **State root precedence:**
  1. `stateRoot` plugin option
  2. `FIXATE_ON_STATE_ROOT` environment variable
  3. `<cwd>/.opencode/goals`
- **Restart safety:** Active goals recovered from disk load in a **paused** state with a recovery note so unattended continuations never resume blindly after a restart.
- **Multi-process worktree sharing:** Processes hold single-writer leases per session file rather than locking the workspace. If another live process already owns a session's lease, the plugin still loads normally with all tools enabled and declines only to write that session's state file, logging the conflict on the hook surface.

### Plugin options

Pass plugin-level defaults in `opencode.json`:

```json
{
  "plugin": [
    [
      "fixate-on",
      {
        "maxTurns": 0,
        "maxDurationMs": 1800000,
        "maxTokens": 1000000,
        "minDelayMs": 1500,
        "maxRecentMessages": 50,
        "noProgressTokenThreshold": 50,
        "noProgressTurnsBeforePause": 3,
        "noToolCallTurnsBeforePause": 3,
        "budgetWrapupRatio": 0.8,
        "maxPromptFailures": 3,
        "persistState": true,
        "stateRoot": ".opencode/goals",
        "resultRetentionMs": 604800000,
        "maxStoredResults": 10
      }
    ]
  ]
}
```

**Additional plugin options:**

- `maxRecentMessages` (default `50`) — Number of recent session messages scanned to locate the latest assistant turn before continuing.
- `noProgressTurnsBeforePause` (default `3`) — Consecutive stalled low-output turns required before pausing.
- `noToolCallTurnsBeforePause` (default `3`) — Consecutive tool-free continuation turns before pausing; set to `0` for legitimate prose-only workflows.
- `kickoffDelayMs` (default `2500`) — Delay in milliseconds before the one-shot v1 kickoff probe fires after `/goal` activates a goal.
- `warnTurnsRemaining` / `warnDurationMsRemaining` / `warnTokensRemaining` (defaults: `3` turns, `60000` ms, `25000` tokens) — Thresholds at which `continuation.md` appends a "limits are near" warning.
- `commandName` (default `"goal"`) — Slash command name owned by the plugin (e.g. `"objective"` for `/objective`; leading slash tolerated). All user-facing hints follow the configured name.
- `registerCommand` (default `true`) — Whether to install the `command.execute.before` hook.
- `registerTools` (default `true`) — Whether to register the canonical agent-facing goal tools.
- `registerAgents` (default `true`) — Whether the config hook registers the native `goal` and `goal-verify` agents (existing agents with those names are preserved; default agent is unchanged).
- `goalAgentName` / `verifierAgentName` (defaults: `"goal"` and `"goal-verify"`) — Custom names for the auto-registered native agents.
- `sdkShape` (`"legacy"` | `"flat"`, default `"legacy"`) — Session-client argument shape (`{ path, body, query }` vs `{ sessionID, ... }`). Read-only calls probe the alternate shape on schema `TypeError`; mutating calls are never replayed.
- `ledgerMaxBytes` / `ledgerRetentionFiles` (defaults: `2 MiB` and `3` rotated generations) — Bounds the per-session `.ledger.jsonl` files (`ledgerRetentionFiles: 0` discards the active ledger at the size ceiling).
- `resultRetentionMs` (default `604800000` / 7 days) & `maxStoredResults` (default `10`) — How long settled goal summaries remain visible in `/goal status` and how many are retained in memory.
- `goalMessages` (default `true`) & `goalMessenger(sessionID, text)` — Controls user-visible announcements for verdicts, attestation faults, pauses, recovery turns, and unattested settlements (routed to structured logs and TUI toasts by default).

### Environment variables

| Variable | Effect |
|:---|:---|
| `FIXATE_ON_STATE_ROOT` | Overrides the goal state root directory (precedence: `stateRoot` option → `FIXATE_ON_STATE_ROOT` → `<cwd>/.opencode/goals`). Read by both the server plugin and the TUI companion. |
| `FIXATE_ON_EVENT_LOG` | Opt-in v2 host diagnostic log (unset by default). When set to a writable file path, appends one space-delimited line per v2 adapter event (`<epoch-ms> <event-type> <session-id> <message-id>`) plus `tool-registration-<stage> <error>` on registration failure. Contains live session/message IDs; treat as sensitive and delete after debugging. |

---

## Compatibility & Known Limits

| Area | Status |
|:---|:---|
| Runtime & OS | Declared support in `package.json` `engines`: Bun `>=1.0.0`, OpenCode `>=1.17.18`. Tested across Linux, macOS, and Windows. |
| Package subpaths | `.`, `./server`, and `./tui` load standalone; `./tui-v2` depends on host-supplied modules. TypeScript declarations support `NodeNext` and `Bundler`. |
| Provider templates | Strict-template backends require the goal block to merge into the primary `system` message (covered by regression tests). |
| Static built-in verifier | The built-in `goal-verify` subagent is read-only (`read`, `glob`, `grep`); it cannot run shell commands itself and relies on workspace inspection plus evidence cited by the primary agent. |
| OpenCode v2 TUI plugins | Stock released v2 binaries do not load external TUI plugins; v2 TUI e2e campaigns under `hack/e2e-harness/` run against a from-source host. |

---

## Troubleshooting

Start with `/goal status --verbose` and `/goal history --verbose` to inspect the active state, stop reason, brake usage, and recent lifecycle trail.

If a goal does not continue:

1. **Distinguish self-resolving pauses from stops that wait on you:** Goals paused for `user intervention`, `recovery`, or `queued` sequence ordering resume automatically (unless a `user intervention` yield exceeds 15 minutes without settling, at which point `/goal status` flags that it did not re-arm and offers `/goal resume`). Deliberate pauses (`explicit pause`), hard brakes, no-progress/no-tool-call pauses, prompt failures, and `recovery exhausted` require human action.
2. **Resume after resolving the cause:** Run `/goal resume` to start a fresh local budget window and reset the turn count without losing the objective or history.
3. **Check structured logs and paths:** Inspect OpenCode's structured logs for persistence, `sdkShape`, prompt dispatch, or verifier faults, and verify that the working directory and `stateRoot` / `FIXATE_ON_STATE_ROOT` match between server and TUI entries.

**Privacy note:** Do not paste raw `state.json` files, `.ledger.jsonl` transcripts, or `FIXATE_ON_EVENT_LOG` output into public issues without redacting them first — they contain goal text, progress notes, local paths, and session identifiers.

---

## License

MIT License
