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

On stock OpenCode 1.x, this single entry is the only required step. The plugin's `config` hook auto-registers the `/goal` slash command, the `goal` agent, and the read-only `goal-verify` subagent.

### OpenCode 1.x vs 2.x

Throughout this section, "OpenCode 1.x" means the `opencode` binary and "OpenCode 2.x" means the `opencode2` binary. One checkout of this plugin can serve both, but the two versions read different config keys and load plugins differently. The differences that matter:

| Concern | OpenCode 1.x (`opencode`) | OpenCode 2.x (`opencode2`) |
|:---|:---|:---|
| Server plugin key | `plugin` (bare string or `[spec, options]`) | `plugins` (string or `{package, options}`) |
| Local-checkout target | a file works (`.../plugin/fixate-on/plugin.js`) | a directory is required; released 2.x builds reject a file target with `configured plugin path must be a directory` |
| `/goal` registration | `command.execute.before` intercepts the auto-registered command; the `config` hook also installs a bridge `command.goal` template | no `command.execute.before`; the plugin's `command.transform` registers its own `goal` command (overriding the built-in `opencode.goal`), and an explicit `command.goal` config still works alongside it |
| Native agents (`goal`, `goal-verify`) | registered by the `config` hook | registered by the plugin's `agent.transform` bridge (the 2.x host does not call the 1.x `config` hook) |
| TUI companion | `tui.json` `plugin` array → `fixate-on/tui` | `cli.json` `plugins` array → directory adapter (see [Loading from local source](#loading-from-local-source)) |
| Permission key in a shared config | `permission` (a map) | `permissions`; 2.x also accepts the 1.x spelling, 1.x does not accept the 2.x one |

A bridge `command.goal` template is a fallback on 2.x, not a requirement: the plugin's `command.transform` registers `/goal` itself when the host exposes the transform, so zero-config works there too.

<details>
<summary>Optional: customize <code>command.goal</code> on OpenCode 1.x</summary>

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

A user-defined `command.goal` is preserved via `??=` semantics, except for its `agent` field, which the plugin deletes. OpenCode routes to a command's `agent` *after* `command.execute.before` fires, so keeping `agent` on 1.x would override the hook's output; the continuation loop uses the session's default agent instead.

</details>

### `/goal` on OpenCode 2.x

On OpenCode 2.x (`opencode2`), plugins cannot intercept slash-command execution via `command.execute.before`, and a command template without `$ARGUMENTS` appends raw arguments as chat text. The plugin's `command.transform` registers its own `goal` command, which overrides the built-in `opencode.goal`, so `/goal` reaches goal state with zero configuration. Where the transform is unavailable (older 2.x builds), declare `command.goal` to route through the plugin's `goal-command` bridge tool:

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

The same template text is installed automatically: on 2.x the plugin's `command.transform` registers the `goal` command directly (overriding the built-in), so a hand-written `command.goal` is only needed where the transform is unavailable. On 1.x the `config` hook installs it too, and `command.execute.before` still intercepts first; the template is a harmless fallback there.

With `/goal` wired, `/goal <objective> --pointer SPEC.md --max-turns 10` creates the goal with artifact pointers on disk, drives continuations, and settles through the claim ledger. On stock OpenCode 1.x this template is unnecessary because the plugin intercepts the auto-registered command directly.

**What each version registers:** on 1.x the `config` hook registers the `/goal` slash command (plus `goal <sub>` subcommands), the `goal` agent, and the hidden read-only `goal-verify` subagent. On 2.x the adapter registers the goal tools, registers the same `goal`/`goal-verify` agents through its `agent.transform` bridge, and registers the `/goal` command through `command.transform`. The built-in judge runs through a child session bound to the workspace.

**Native command output on 2.x:** reporting commands and lifecycle receipts use the host's passive RPC event channel. The v2 TUI companion displays the full receipt in a dialog for the current session and session-scoped toasts for other sessions or notices. These receipts do not enter the model inbox or start a turn, including while the model is busy. Install the companion to see them in the TUI. Headless clients can subscribe to `rpc.fixate-on-output.output` or retrieve the latest receipt for a session through the `fixate-on-output` RPC's `latest` method; see [passive command receipts](docs/tui-integration.md#passive-command-receipts-on-2x). An older host without RPC needs a configured `goalMessenger`; otherwise the command returns an explicit output-delivery error containing its result. The `goal-command` tool continues to return its result through the ordinary tool channel.

### TUI companion setup

The optional TUI companion provides an interactive dashboard, command palette actions (`ctrl+p` → `fixate:`), keyboard chords, and lifecycle toasts. The two OpenCode versions load it from different files, and the two versions use different companion entrypoints:

- **OpenCode 1.x**: because `TuiPluginModule` and the server `PluginModule` are mutually exclusive, stock 1.x loads the server plugin from `opencode.json` and the 1.x companion (`fixate-on/tui`) only from `tui.json` (`~/.config/opencode/tui.json` or `$OPENCODE_TUI_CONFIG`):

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

- **OpenCode 2.x**: there is no `tui.json` contract. The 2.x companion loads as a CLI plugin entry in `cli.json`, but the published package cannot be named by a bare npm spec: `fixate-on/tui-v2` is parsed as a GitHub shorthand, and the package's `./tui` export is the 1.x companion. Use the directory adapter described in [Loading from local source](#loading-from-local-source) for both the server and companion entries: it is the verified 2.x installation path.

  `cli.json` (directory adapter — see the full recipe below):

  ```json
  {
    "plugins": [
      {
        "package": "file:///absolute/path/to/plugin-wrappers/fixate-on",
        "options": { "stateRoot": ".opencode/goals" }
      }
    ]
  }
  ```

  A `file://` URL pointing **directly at** `tui-v2.js` is not a valid 2.x plugin target: the 2.x TUI loader skips local file targets and only loads directories. Install via the adapter directory instead.

**State root alignment:** Both the server plugin and the TUI companion resolve the persisted state directory independently and reject goal files whose embedded session ID does not match their parent directory. If you override the default state directory, either set the `FIXATE_ON_STATE_ROOT` environment variable (read by both) or pass the identical `stateRoot` option to **both** entries (server plugin and companion):

```json
{
  "plugin": [
    ["fixate-on/tui", { "stateRoot": "my/state/root", "logLevel": "info" }]
  ]
}
```

On 2.x the companion and the server plugin resolve the state root separately, and the host's automatic server-to-TUI discovery may pass a bare plugin target without its options. Set the same `stateRoot` on **both** the server and CLI entries, or rely on the shared `FIXATE_ON_STATE_ROOT` environment variable. Do not rely on a single entry to configure both.

See [`docs/tui-integration.md`](docs/tui-integration.md) for the dual-mode output headers, 1.x disk-refresh vs 2.x `Result.metadata` transport architecture, toast coalescing rules, and keyboard shortcut tables.

### Loading from local source

To test a local checkout without packing, point OpenCode at the built bundle (run `bun run bundle` first — `plugin/fixate-on/` is generated, gitignored output; keep test files out of OpenCode's auto-loaded plugin directory):

**OpenCode 1.x**: a file target is fine:

```json
{
  "plugin": ["file:///absolute/path/to/fixate-on/plugin/fixate-on/plugin.js"]
}
```

**OpenCode 2.x**: released 2.x builds require a directory for a configured plugin (`configured plugin path must be a directory`), and the package root itself is not a valid directory target because 2.x resolves `<dir>/server` / `<dir>/tui` while this package's `./tui` export is the 1.x companion. Point at a small adapter directory that re-exports the bundles:

```js
// plugin-wrappers/fixate-on/package.json
{
  "name": "fixate-on-local",
  "private": true,
  "type": "module",
  "main": "./server.js",
  "exports": { ".": "./server.js", "./tui": "./tui.js" }
}
```

```js
// plugin-wrappers/fixate-on/server.js
export { default } from "file:///absolute/path/to/fixate-on/plugin/fixate-on/plugin.js"
```

```js
// plugin-wrappers/fixate-on/tui.js — must re-export tui-v2.js, not the package's ./tui (the 1.x companion)
export { default } from "file:///absolute/path/to/fixate-on/plugin/fixate-on/tui-v2.js"
```

```json
{
  "plugins": [
    { "package": "file:///home/me/.config/opencode/plugin-wrappers/fixate-on", "options": {} }
  ],
  "command": {
    "goal": {
      "description": "Set a session-scoped goal and auto-continue until complete.",
      "template": "Call the goal-command tool exactly once with its subcommand parameter set verbatim to: $ARGUMENTS\nDo not summarize, do not ask for confirmation, and do not perform any other work. Reply with only the tool output.",
      "agent": "build"
    }
  }
}
```

The adapter's relative depths depend on where it sits; adjust them to your layout. The e2e harness in `hack/e2e-harness/` ships a working copy of this adapter (`plugin-dir/`) you can copy.

**Both versions from one document:** a shared `opencode.json` works if it keeps the 1.x spelling for the keys 1.x requires (`plugin` and `permission`) and uses the keys both versions normalize (`command`):

```json
{
  "plugin": [["file:///home/me/.config/opencode/plugin-wrappers/fixate-on", {}]],
  "command": {
    "goal": {
      "template": "Call the goal-command tool exactly once with its subcommand parameter set verbatim to: $ARGUMENTS\nDo not summarize, do not ask for confirmation, and do not perform any other work. Reply with only the tool output.",
      "agent": "build"
    }
  },
  "permission": { "external_directory": { "*": "ask" } }
}
```

Do not rename `plugin` to `plugins` or `permission` to `permissions` in a shared document: checked OpenCode 1.18.x releases silently drop those plural keys (the plugin list resolves empty), and 1.x does not accept the 2.x permission spelling. 2.x accepts and migrates the 1.x spellings, so the 1.x spelling is the portable one. If you want the 2.x keys, give 1.x its own config file.

**Quick smoke test:**

1. Load the plugin in a scratch OpenCode config (on 2.x no `command.goal` hand-wiring is needed; see [`/goal` on OpenCode 2.x](#goal-on-opencode-2x)).
2. Run `/goal status` and confirm no active goal is reported.
3. Run `/goal inspect this repo and call update_goal with status "blocked" if you need user input`.
4. Verify `/goal status`, `/goal pause`, `/goal resume`, and `/goal clear` transition state as expected (see [Subcommands](#subcommands)).

Related documents: [`docs/tui-integration.md`](docs/tui-integration.md) covers the TUI companion in depth (see [its installation section](docs/tui-integration.md#installation) and [keyboard shortcuts](docs/tui-integration.md#keyboard-shortcuts)); `docs/releasing.md` is the maintainer runbook for cutting a release (see [Prepare](docs/releasing.md#prepare) and [Publish](docs/releasing.md#publish)).

---

## `/goal` Command Reference

Natural language is the primary interface: `/goal <objective>` works with zero flags. Subcommands and per-goal flags provide lifecycle control and optional overrides.

### Subcommands

| Command | Behavior |
|:---|:---|
| `/goal <objective> [flags]` | Sets or replaces the focused goal in the current session. |
| `/goal add <objective> [flags]` | Creates and focuses a new goal while leaving existing unfinished goals active. |
| `/goal sequence <obj1>; <obj2>` | Queues multiple objectives (separated by `;` or newlines) as an ordered pipeline. Focuses the first and keeps successors paused (`queued`) until auto-promoted on completion. |
| `/goal status [--full \| --verbose]` | Shows a plain-language state headline, remaining brakes, and next duty. `--full` / `--verbose` prints the full usage breakdown, recovery counters, and raw evidentiary claim ledger. Alias: `info`. |
| `/goal list [all]` | Lists numbered live goals and settled goals in the per-session archive, with state markers (`focused` = driven now, `idle` = active between turns, `background` = waiting). Alias: `ls`. |
| `/goal focus <number \| goalId>` | Switches which goal the dashboard and bare commands target. Persisted on disk. Does not alter goal status (focusing a paused goal leaves it paused; unfocused active goals keep running). |
| `/goal pause [<goalId>]` | Pauses the focused (or named) goal while retaining its state and history. |
| `/goal resume [<goalId>]` | Resumes a paused, blocked, or brake-stopped goal, resets the turn count, and starts a fresh window for configured per-run limits while preserving the objective and history. |
| `/goal edit <new objective>` | Revises the focused goal's objective in place, preserving limits and history and clearing any paused/blocked state. If the goal already hit a hard brake, run `/goal resume` to reset it. |
| `/goal checkpoint <note>` | Records a progress note on the focused goal. |
| `/goal history [--verbose\|--full]` | Displays the lifecycle event trail and latest progress note. `--verbose` and `--full` both print the raw trail including bookkeeping entries. Alias: `log`. |
| `/goal accept [proposalId]` | Applies the focused goal's pending proposal (from `propose_goal_change`) — objective, success criteria, constraints, and artifact pointers — and clears it. A supplied ID must match the pending proposal's. Alias: `accept-proposal`. |
| `/goal reject [proposalId]` | Discards the focused goal's pending proposal without changing goal terms. A supplied ID must match the pending proposal's. Alias: `reject-proposal`. |
| `/goal handback` | Returns the handback deliverable for the focused goal: scoped reviewable diff (files, stat, patch), known-risk enumeration, recorded claims, and the external review payload. |
| `/goal review` | Returns just the external review payload of the focused goal's handback deliverable, for pasting into an external reviewer. Alias: `review-payload`. |
| `/goal clear [<goalId>]` | Removes live goal state and saved status (aliases: `stop`, `off`, `reset`, `none`, `cancel`). Clears immediately when only one live goal exists; when several exist, bare `/goal clear` refuses and requires a `<goalId>` (or unique prefix). Terminal ledger tombstones remain on disk for crash-safe recovery. |

Every action that accepts a `<goalId>` (`pause`, `resume`, `focus`, `clear`) matches either the full ID or a unique prefix, rejecting ambiguous prefixes with an error instead of guessing.

For `clear` and its aliases, separate the optional goal ID with a space or tab. A newline immediately after `clear`, or a longer sentence such as `clear the stale cache`, is a bare objective and follows the normal set/replace behavior. Attachment validation uses the same parsed command as execution: an attached `clear <goalId>` is rejected before changing goal state, while a multiline objective may carry attachments.

### Native kickoff admission on 2.x

On 2.x, failed kickoff admissions retain the original files, agents, skills, and delivery mode separately for each goal. After three delayed retries fail, the goal pauses with a receipt; `/goal resume <goalId>` retries the retained inputs and original delivery mode in the same process, including when the host supplies its default `steer` delivery for the resume command. Ordinary idle cannot bypass those inputs. An attachment-bearing goal also persists an admission marker from its first saved state. The attachment payload itself stays in memory: after a restart with admission still unresolved, the goal pauses and asks for the original attachments again, or an explicit objective edit. A failure to save the local receipt after host acceptance never triggers an automatic resend.

Native kickoff admission checks that the initiating command still owns its goal after agent selection, host preparation, and immediately before saving acceptance. A pause, clear, accepted replacement or edit, newer human intervention, loss of session ownership, or plugin disposal before that confirmation cancels the older attempt. Confirmation and cancellation have one ordering: once the acceptance checkpoint has been installed, a later pause does not retroactively remove accepted conversation history. Concurrent attached edits install their input requirement with the accepted activation; a losing edit cannot erase it, reset its budgets, or overwrite a newer objective. Explicit IDs in `edit` and `checkpoint` accept spaces or tabs between the verb, ID, and free text.

On the measured OpenCode 2.2.7 host, a plugin cannot cancel attachment preparation or remove a previously admitted inbox item through the Promise API. A cancelled input may therefore remain in the host's persisted transcript. Before invoking the host, the plugin saves the input's identity in the session snapshot; its context, compaction, generation, and title hooks prevent unconfirmed input from reaching a model. Title prompts are rebuilt from admissible current history because the host's title input does not preserve message identities. These guards survive goal clear, process restart, and forks that replace message IDs, while confirmed attachment history remains available. Another user input in the same model cycle still runs. If another process owns the original session, its admission snapshot is read again before using that history; a cached clean snapshot cannot authorize later inputs.

Compaction has a stricter boundary on this host: its retained text is rebuilt from raw transcript rows after the plugin hook, and a cached summary may be applied without another hook. The plugin therefore refuses compaction while its source includes unresolved kickoff inputs. If a summary finishes or is applied after an input is cancelled, replay of that checkpoint is also refused until its source and fork ancestors have known, resolved admission histories. The receipt asks you to restore the original admission state, or start a new session and resubmit the required inputs; the plugin does not discard legitimate retained conversation to hide the problem. Ordinary uncompacted conversations establish a clean admission history before compaction, and confirmed history continues to support compaction, forks, and restart. An existing checkpoint with unknown admission history cannot certify itself through a later command.

This filtering requires the server plugin to remain installed and active. Removing or disabling it ends the protection; it does not delete the retained host transcript. On supported plugin replacement/restart, the host's activation barrier allows the new instance to recover the saved guards before model execution. With `persistState: false`, acceptance is only recorded in the current process; after restart, copied inputs with unknown admission history remain unavailable. If the original snapshot is missing, unreadable, or from an unsupported version, the plugin refuses to overwrite it or certify old inputs through a new command. Restore the original state files or start a new session. Hosts missing the required model hooks or raw history API keep ordinary plugin/tool surfaces available but cannot start a new native kickoff.

Unconfirmed input guards do not expire or disappear when goals are cleared. The session refuses new native kickoff admission after 1,024 unresolved input records, rather than forgetting a record that the host could still replay; start a new session if that bound is reached. An attempt cancelled before the host was called does not consume a record. A failure to save an accepted input's receipt pauses the goal and requires an explicit retry with its inputs, without automatically sending a duplicate.

The host contracts above are tied to OpenCode 2.2.7 commit `fedc6f208aa2bd54c1019227214568083f6380ad`: the [Promise adapter](https://github.com/anomalyco/opencode/blob/fedc6f208aa2bd54c1019227214568083f6380ad/packages/plugin/src/promise/adapter.ts), [prompt preparation](https://github.com/anomalyco/opencode/blob/fedc6f208aa2bd54c1019227214568083f6380ad/packages/core/src/session/prompt.ts), [model hook dispatch](https://github.com/anomalyco/opencode/blob/fedc6f208aa2bd54c1019227214568083f6380ad/packages/core/src/session/model-request.ts), [title construction](https://github.com/anomalyco/opencode/blob/fedc6f208aa2bd54c1019227214568083f6380ad/packages/core/src/session/title.ts), [compaction](https://github.com/anomalyco/opencode/blob/fedc6f208aa2bd54c1019227214568083f6380ad/packages/core/src/session/compaction.ts), and [retained-history reconstruction](https://github.com/anomalyco/opencode/blob/fedc6f208aa2bd54c1019227214568083f6380ad/packages/core/src/session/history.ts). Run the maintained real-host regression with an explicit supported binary:

```sh
OPENCODE_BINARY=/path/to/opencode bun hack/verify-pr-fixes.ts
```

The fixture uses an isolated workspace and a local deterministic provider to check accepted attachments, cancellation during host preparation, later genuine input, forks, compaction, generation/title requests, and cold recovery. The Bun regression suite additionally exercises checkpoint write failures and a real second process holding a stale admission cache.

### Per-goal flags

Flags accept `--flag value` or `--flag=value`. Quote multi-word values. Unknown flags, missing values, non-positive integers, or invalid `--mode` values reject the command with an explicit error instead of folding malformed flags into the objective.

| Flag | Description |
|:---|:---|
| `--success <text>` | Success criteria injected alongside the objective (alias: `--success-criteria`). |
| `--constraints <text>` | Constraints or non-goals to respect (alias: `--non-goals`). |
| `--pointer <file>` | Artifact pointer; injects live file content into every continuation without editing the contract. Repeatable and comma-separated (aliases: `--pointers`, `--artifact-pointer`, `--artifact-pointers`). |
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
| `--verbose` | Renders verbose command output (alias for `--full` on `/goal status`). |

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

- **Intent crosses over, work does not:** The copy preserves the objective, completion contract (`--success`, `--constraints`, artifact pointers), mode, and brake configuration. Turn counts, tokens used, recovery and fault counters, blocked streaks, claims, and pending intents start empty in the fork. Settled goals (`complete`, `budgetLimited`) are not copied. An unresolved attachment requirement is copied, but its in-memory payload is not: the fork waits for the original attachments or an explicit objective edit before starting work.
- **OpenCode 1.x vs 2.x fork detection:** Stock OpenCode 1.x creates a fork as an unrelated top-level session without a `parentID` (leaving only a mutable `… (fork #1)` title); the plugin refuses to guess ancestry from titles, so 1.x forks start without copied goals. OpenCode 2.x emits a durable `session.forked` event carrying `parentID` and the fork boundary, which triggers the copy.
- **Deleted or unreadable sessions:** Failed host state reads cannot authorize a continuation. After `maxPromptFailures` failed attempts (default `3`), the goal pauses with a visible receipt. A missing session reports `session not found`; other read failures report `auto-continue failures`. Both native idle handling and the fallback poller enforce this bound.

---

## Continuation Loop & Steering

1. **System prompt injection & injection hardening:** Active goals are injected into the primary `system` message wrapped in XML-escaped `<goal_objective>` tags. The objective is explicitly framed as user-provided task data, never as elevated instructions capable of overriding system, developer, tool, or repository policies. When a goal is **paused**, the plugin injects a system guard that omits the objective and requires an explicit `/goal resume`, so command text routed through chat on 1.x is not mistaken for active work.
2. **Steering templates:**
   - `continuation.md` — Injected on every idle continuation. Carries the completion check, the 3-consecutive-turn blocked rule, verification pressure, fidelity constraints, and work-from-evidence instructions without re-quoting the standing system-prompt objective every turn.
   - `budget_limit.md` — Injected once per goal (advisory, not a hard interrupt) when the explicit API-cost `token_budget` is crossed. In-flight tokens continue accruing until the turn ends.
   - `objective_updated.md` — Injected when `/goal edit` revises the objective.
3. **Idle pre-flight & deduplication:** Continuations preserve the initiating turn's agent, provider/model, and variant. After `minDelayMs`, the plugin re-verifies that the session is still idle and that no human message, newer assistant turn, Plan-agent switch, rejected permission, abort, or provider error has intervened. A durable claim on the source assistant turn prevents duplicate continuations across distinct idle events. If OpenCode reports itself busy, the continuation is *deferred* without consuming turn budget and retried on the next idle, bounded by `maxPromptFailures`.
4. **Yield, then re-arm:** Sending a human message while a goal is active aborts any in-flight continuation and pauses active goals for the duration of your turn. A message arriving while an older goal command is being saved also cancels that command's kickoff, including the brief gap while a goal is being replaced. When your turn goes idle, goals paused by this conversational interjection re-arm automatically. A message that the host **queued** rather than steered in (non-interrupting delivery, e.g. from another agent while a turn is running) does not pause the goal at all: it is surfaced as a goal notice plus a history entry and announced, and the loop continues. Two cases remain paused:
   - Whole-message stop imperatives (`"stop"`, `"pause"`, `"hold off"` — matched conservatively so mixed instructions like `"stop the server then fix tests"` remain normal steering) pause with `explicit pause` and require `/goal resume`.
   - If a yielded turn never settles within 15 minutes, the goal stops claiming it will auto-resume, surfaces as waiting on you, and accepts `/goal resume`.
5. **OpenCode 1.x kickoff & echo filtering:** Because slash commands on stock 1.x do not launch an assistant turn on their own, the plugin schedules a one-shot kickoff probe (`kickoffDelayMs`, default `2500` ms) when a command activates a goal, sending the first continuation only if no turn started organically. It also fingerprints just-dispatched slash arguments so 1.x's chat echo of `/goal ...` does not trigger a human-interjection pause.
6. **Compaction survival:** When OpenCode compacts a session, the plugin injects a deterministic summary reconstructed from the persisted goal record (objective, status, budget usage, recent progress notes, and lifecycle trail) and disables OpenCode's generic post-compaction auto-continue so it cannot race the plugin's continuation.
7. **Token accounting by version:** On 1.x, token usage is tracked via `message.updated` events (falling back to fetched session messages when per-message events are absent). On 2.x, the plugin reads durable cumulative usage from the host before each idle decision and also processes `session.usage.updated` events. Per-goal persisted watermarks and message receipts prevent replay after a restart from charging retained usage twice. Each batch establishes all goals' initial baselines before charging any goal, so a partial session snapshot can recover the remaining charges. Because session context is shared, token usage accrues to every non-terminal goal in the session. See [Default brakes](#default-brakes) for the ceilings these numbers feed and [`docs/tui-integration.md` → State Synchronization](docs/tui-integration.md#state-synchronization) for how the companion reads them.

Persisted goals from versions without a cumulative usage watermark retain their recorded spend and receive one migration notice. The first current host reading establishes the watermark; spend accrued while the plugin was offline cannot be reconstructed. The context-token brake still checks the host's full cumulative total.

Message accounting retains the most recent 1,000 receipts per goal, including compacted-message tombstones. Restored legacy state without receipts, or eviction beyond that window, establishes a persisted timestamp boundary and emits a notice. Earlier or undated messages are baselined on their first reading, preserving recorded spend without charging unknown historical usage again; later observed changes and newer dated messages are charged normally. The first known cost of an initially unpriced historical message is also a baseline. Exact usage before those baselines cannot be reconstructed, and undated new messages cannot be distinguished from old replays. The context-token brake still sees the observed token total. Missing or lower message cost never reduces its cost watermark; per-step token decreases still count a new step.

---

## Agent Tools & Goal State Model

Completion and blocking are driven exclusively through the canonical tool surface — never by parsing free-text markers. Six agent-facing tools are registered by default (`registerTools: true`), plus the `goal-command` bridge on OpenCode 2.x:

| Tool | Arguments | Behavior |
|:---|:---|:---|
| `get_goal` | _(none)_ | Returns the focused goal as a `ThreadGoal` (`{goalId, threadId, objective, status, tokenBudget, tokensUsed, timeUsedSeconds, createdAt, updatedAt, artifactPointers, pendingProposal}`) plus `remainingTokens` and `completionBudgetReport`, or `null` if none exists. |
| `create_goal` | `objective` (string), `token_budget` (optional positive int) | Creates an active user-requested goal (`token_budget` sets the advisory API-cost ceiling; `null` = unbounded). **Fails if an unfinished goal already exists** in the session; terminal goals (`complete`, `budgetLimited`) do not block creation. |
| `update_goal` | `status` (`"complete"` \| `"blocked"`) | Transitions the focused goal. Accepts **only** `status` (no free-text `evidence` or `blocker` parameters; pause, resume, and brake limits are user/plugin-controlled). See below for `complete` and `blocked` gates. |
| `list_goals` | _(none)_ | Lists all goals in the current session. |
| `focus_goal` | `goal_id` (string) | Changes the focused goal in the current session. |
| `propose_goal_change` | proposal fields | Records a `pendingProposal` on the goal for human review (agents cannot raise contract-tier turn or token ceilings directly). |
| `goal-command` | `subcommand` (string) | *(OpenCode 2.x only)* Routes `/goal` slash-command invocations into plugin state when wired via `command.goal`. |

Tool schemas are defined with `zod` (a direct dependency). If `registerTools: false` is set or `zod` fails to load at runtime, active goals pause with a visible notice rather than looping on continuation prompts that reference unavailable tools. Legacy tool aliases (`goal_status`, `goal_set`, `goal_pause`, `goal_resume`, `goal_block`, `goal_complete`, `get_goal_history`, `set_goal`, `clear_goal`) are not registered. The same subcommand surface is reachable from the agent side through the [`goal-command` bridge](#goal-on-opencode-2x) on 2.x.

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
   When configured in plugin options, takes precedence over the built-in judge and uses the `{ approved, reason }` return contract. On 2.x this path does not require ownership of an unused `goal-verify` agent.
2. **Built-in child-session judge (`childSessionJudge`, default `true`):**
   Spawns an isolated OpenCode child session running the hidden `goal-verify` subagent bound to the goal's workspace directory. The subagent has a default-deny tool policy: only `read`, `glob`, and `grep` are allowed (`bash`, `edit`, and `write` are denied). It emits a structured verdict conforming to `completion-verdict.schema.json` (`COMPLETE`, `WORKING`, `BLOCKED`, `NEEDS_INPUT`, or `CANCELLED`, plus `candidate`, `fingerprint`, `outstanding`, and `evidence`). The plugin's completion gate stamps the candidate identity (git `HEAD` + worktree fingerprint) onto the attestation.
3. **No judge available (`childSessionJudge: false` and no custom `judge`):**
   The gate abstains (`unavailable`). To prevent an unendable loop, after a bounded number of attempts the claim is recorded on the `none` check path as `unverifiable-claim` with verdict `NONE` — **never** `verified-complete` — and settles with stop reason `completed (no attestation could be obtained)` so queued sequence goals behind it can proceed.

The child receives the verifier agent's resolved read policy, followed by the parent session's overrides in the host's normal precedence order, with a read-only ceiling reapplied. A configured read denial therefore survives an otherwise unrestricted parent; an explicit parent read override retains its normal host meaning. Permission lookup failures on the supported host APIs are faults. On 2.x the child starts with all operations denied. Its prompt hook refreshes the policy after plugin configuration finishes activating and before input is admitted; missing hook or update support is a fault. Cancellation remains effective if activation finishes after the verifier's deadline.

On 2.x, asynchronous prompt admission requires a host completion wait followed by a fresh context read. The returned admission ID must identify the current input, whose final assistant must have finished normally under the verifier agent. Its durable idle marker and the session's current execution outcome must both establish success. A wait alone does not establish success: output-limit exhaustion and errors after an assistant step can retain complete-looking text. Missing settlement evidence, a failed read, an interrupted execution, or a failed assistant stream is an operational fault. Cleanup must succeed before an attestation is returned. See [Verifier transport validation](docs/verifier-validation.md) for the host fixtures and compatibility contract.

**Verdict transitions:**

- `COMPLETE` → settles and archives the goal as achieved (`complete`).
- `WORKING` → enters bounded recovery, injecting a forced continuation with the outstanding gates and failed evidence.
- `BLOCKED` / `NEEDS_INPUT` → settles with evidence (pauses for user input).
- `CANCELLED` → settles as an authorized cancellation.
- **Attestation fault** (provider error, timeout, missing child-session ID) → retried with backoff as a forced continuation; never treated as a verdict on the goal.

**Recovery bounds:** Recovery is bounded by both a total recovery budget (`--max-recovery-turns`, default `12`) and a consecutive-unchanged threshold (`--max-unchanged-results`, default `3`, comparing `candidate` + `fingerprint`). A new candidate resets the consecutive-unchanged counter but not the total budget. Exhausting either bound pauses the goal with stop reason `recovery exhausted` and **never** fabricates `COMPLETE`. The advisory phrase scan that annotates `WORKING` recovery prompts is documented under [Advisory phrase triage](#advisory-phrase-triage); the verdict wire contract is `completion-verdict.schema.json`.

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
| Context tokens (`maxTokens`) | `0` (`unlimited`) | Off by default. Set a positive ceiling for cumulative provider-reported context tokens (`input + output + reasoning + cache read + cache write`). |
| Continuation cooldown (`minDelayMs`) | `1.5 s` (`1500` ms) | Minimum delay before sending a continuation after idle. |
| No-progress pause | `< 50` output tokens × `3` turns | Pauses after `noProgressTurnsBeforePause` consecutive low-output turns with no meaningful progress-note change. |
| No-tool-call pause | `3` consecutive turns | Pauses after `noToolCallTurnsBeforePause` consecutive tool-free continuation turns (anti self-chat loop). |
| Budget wrap-up threshold (`budgetWrapupRatio`) | `80%` (`0.8`) | Sends a wrap-up warning at 80% of a positive `maxTokens` ceiling; disabled when `maxTokens` is `0`. |
| Prompt failure pause (`maxPromptFailures`) | `3` consecutive failures | Pauses when OpenCode prompt dispatch fails or defers 3 times in a row. |

**Wrap-up vs. hard stop:** When a brake is reached, the plugin sends one final prompt asking the assistant to summarize what is done, what remains, and the next concrete step. Because a brake is a budget rather than a verdict, the prompt instructs the assistant to call `update_goal {status: "complete"}` only if the objective is genuinely satisfied, and not to mark it `blocked` merely because a brake fired. Run `/goal resume` to continue with a fresh window for configured per-run limits.

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
        "maxTokens": 0,
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
- `kickoffDelayMs` (default `2500`) — Delay in milliseconds before the one-shot 1.x kickoff probe fires after `/goal` activates a goal.
- `warnTurnsRemaining` / `warnDurationMsRemaining` / `warnTokensRemaining` (defaults: `3` turns, `60000` ms, `25000` tokens) — Thresholds at which `continuation.md` appends a "limits are near" warning.
- `commandName` (default `"goal"`) — Slash command name owned by the plugin (e.g. `"objective"` for `/objective`; leading slash tolerated). All user-facing hints follow the configured name.
- `registerCommand` (default `true`) — Whether the plugin owns the slash command, through `command.execute.before` on 1.x or `command.transform` on 2.x.
- `registerTools` (default `true`) — Whether to register the canonical agent-facing goal tools.
- `registerAgents` (default `true`) — Whether to register the native `goal` and `goal-verify` agents, through the config hook on 1.x or `agent.transform` on 2.x (existing agents with those names are preserved; default agent is unchanged).
- `goalAgentName` / `verifierAgentName` (defaults: `"goal"` and `"goal-verify"`) — Custom names for the auto-registered native agents.
- `sdkShape` (`"legacy"` | `"flat"`, default `"legacy"`) — Session-client argument shape (`{ path, body, query }` vs `{ sessionID, ... }`). Read-only calls probe the alternate shape on schema `TypeError`; mutating calls are never replayed.
- `ledgerMaxBytes` / `ledgerRetentionFiles` (defaults: `2 MiB` and `3` rotated generations) — Bounds the per-session `.ledger.jsonl` files (`ledgerRetentionFiles: 0` discards the active ledger at the size ceiling).
- `resultRetentionMs` (default `604800000` / 7 days) & `maxStoredResults` (default `10`) — How long settled goal summaries remain visible in `/goal status` and how many are retained in memory.
- `goalMessages` (default `true`) & `goalMessenger(sessionID, text)` — Controls user-visible announcements for verdicts, attestation faults, pauses, recovery turns, and unattested settlements (routed to structured logs and TUI toasts by default).

### Environment variables

| Variable | Effect |
|:---|:---|
| `FIXATE_ON_STATE_ROOT` | Overrides the goal state root directory (precedence: `stateRoot` option → `FIXATE_ON_STATE_ROOT` → `<cwd>/.opencode/goals`). Read by both the server plugin and the TUI companion. |
| `FIXATE_ON_EVENT_LOG` | Opt-in OpenCode 2.x diagnostic log (unset by default). When set to a writable file path, appends one space-delimited line per 2.x adapter event (`<epoch-ms> <event-type> <session-id> <message-id>`) plus `tool-registration-<stage> <error>` on registration failure. Contains live session/message IDs; treat as sensitive and delete after debugging. |

---

## Compatibility & Known Limits

| Area | Status |
|:---|:---|
| Runtime & OS | Declared support in `package.json` `engines`: Bun `>=1.0.0`, OpenCode `>=1.17.18`. Tested across Linux, macOS, and Windows. The `engines.opencode` range describes the 1.x peer dependency (`@opencode-ai/plugin < 2`); the published bundle's default export is the 2.x `{ id, setup }` plugin, which does not import that SDK at runtime, so 2.x loads it outside the range. |
| Package subpaths | `.` and `./server` load the dual-version server bundle (1.x via the `server` export, 2.x via the default `{ id, setup }`); `./tui` is the 1.x companion (load it from `tui.json`); `./tui-v2` is the 2.x companion (load it from `cli.json`) and depends on host-supplied modules. TypeScript declarations support `NodeNext` and `Bundler`. |
| Provider templates | Strict-template backends require the goal block to merge into the primary `system` message (covered by regression tests). |
| Static built-in verifier | The built-in `goal-verify` subagent is read-only (`read`, `glob`, `grep`); it cannot run shell commands itself and relies on workspace inspection plus evidence cited by the primary agent. |
| OpenCode 2.x TUI plugins | Measured on the installed 2.x release v2.2.7 (the build this repo's e2e harness runs): the server still rejects a configured plugin **file** target with `configured plugin path must be a directory` (point at an adapter directory — see [Loading from local source](#loading-from-local-source)), but the TUI does load `cli.json` plugins and register their palette entries, so `ctrl+p` → `fixate:` works. Older 2.x builds (through v2.2.5) never registered CLI-plugin palette entries and defaulted plugin keymap layers to base mode, which made palette entries vanish the moment the palette opened; the v2 companion declares `mode: "global"` itself to stay reachable on those builds. For the companion use the adapter directory (a direct `file://` URL to a `tui-v2.js` file is skipped by the 2.x TUI loader; see [Loading from local source](#loading-from-local-source)). See [Host API Requirements](docs/tui-integration.md#host-api-requirements). |

---

## Troubleshooting

Start with `/goal status --full` (or `--verbose`) and `/goal history --verbose` to inspect the active state, stop reason, brake usage, and recent lifecycle trail. For the full lifecycle of a goal see [Multi-Goal & Session-Scoped Behavior](#multi-goal--session-scoped-behavior) and [Completion Verification](#completion-verification); for persistence layout see [Persistence and state root](#persistence-and-state-root).

### Host / install problems

| Symptom | Cause | Fix |
|:---|:---|:---|
| `configured plugin path must be a directory` | OpenCode 2.x was given a plugin **file** path | point `plugins[].package` at the adapter directory (see [Loading from local source](#loading-from-local-source)) |
| 1.x loads no configured plugins (no error) | `plugins` (plural) was used in a 1.x-read config; checked 1.18.x releases silently drop it | use `plugin` (singular); 2.x migrates it |
| 1.x ignores 2.x-style permissions | a `permissions` key in a shared config; checked 1.18.x releases silently drop it | use the 1.x `permission` map; 2.x migrates it |
| 2.x `/goal foo` becomes plain chat | no `goal` command reached the session (transform unavailable and no bridge template) | on 2.x builds with `command.transform` this should not happen; on older builds declare `command.goal` with the `goal-command` template and `$ARGUMENTS` (see [`/goal` on OpenCode 2.x](#goal-on-opencode-2x)) |
| 2.x TUI shows the plugin failed to load | older 2.x builds (through v2.2.5) rejected `file://` plugin URLs / never registered palette entries; all 2.x builds reject a plugin **file** target | install `fixate-on` from npm, use an adapter directory for a local checkout, and on v2.2.7+ `cli.json` `file://` entries work; see [Compatibility & Known Limits](#compatibility--known-limits) |
| 1.x TUI companion never appears | the companion was placed in `opencode.json` instead of `tui.json` | 1.x loads the companion only from `tui.json` (see [TUI companion setup](#tui-companion-setup)) |
| dashboard shows a different state than `/goal status` | server plugin and companion resolved different state roots | set the same `stateRoot` on both entries or `FIXATE_ON_STATE_ROOT` (see [TUI companion setup](#tui-companion-setup)) |

### When a goal does not continue

1. **Distinguish self-resolving pauses from stops that wait on you:** Goals paused for `user intervention`, `recovery`, or `queued` sequence ordering resume automatically (unless a `user intervention` yield exceeds 15 minutes without settling, at which point `/goal status` flags that it did not re-arm and offers `/goal resume`). Deliberate pauses (`explicit pause`), hard brakes, no-progress/no-tool-call pauses, prompt failures, and `recovery exhausted` require human action.
2. **Resume after resolving the cause:** Run `/goal resume` to reset the turn count and start a fresh window for configured per-run limits without losing the objective or history.
3. **Check structured logs and paths:** Inspect OpenCode's structured logs for persistence, `sdkShape`, prompt dispatch, or verifier faults, and verify that the working directory and `stateRoot` / `FIXATE_ON_STATE_ROOT` match between server and TUI entries.

**Quick diagnostics:**

```sh
# Full status wall: usage breakdown, recovery counters, claim ledger
/goal status --full

# Live goals plus the settled archive
/goal list all

# Lifecycle event trail for the focused goal
/goal history --verbose

# The same subcommands, routed through the agent tool on OpenCode 2.x
# (the goal-command bridge takes the subcommand line verbatim)
```

**Privacy note:** Do not paste raw `state.json` files, `.ledger.jsonl` transcripts, or `FIXATE_ON_EVENT_LOG` output into public issues without redacting them first — they contain goal text, progress notes, local paths, and session identifiers.

---

## License

MIT License
