# @sandlada/opencode-teamwork

**Antigravity-style agent teamwork for [OpenCode](https://opencode.ai).**

A community plugin that brings the multi-agent collaboration experience of [Google Antigravity](https://antigravity.google)'s **Teamwork** (`/teamwork-preview`) to OpenCode: a scoping interview, a reviewable prompt artifact, an autonomous multi-agent build driven by a deterministic state machine, and adversarial verification gates that demand real evidence — all inside your terminal.

> **Development status:** this plugin is under active development and is **not suitable for production use**. Expect breaking changes, incomplete features, and unstable behavior.

> Adapted from [`@prevalentware/opencode-goal-plugin`](https://github.com/prevalentWare/opencode-goal-plugin), which added Codex-style goal mode to OpenCode. Goal mode lives on in the upstream package; this plugin replaces it with teamwork and is designed to run alongside it.

## Recommended Skill

[`sandlada/skill-teamwork`](https://github.com/sandlada/skill-teamwork) — the native-subagent teamwork orchestration Skill that pairs with this plugin.

> If you use the `teamwork` Skill, you do not need this plugin. The Skill covers the same multi-agent teamwork workflow on its own — install this plugin only if you specifically need its extras (deterministic Sentinel state machine, persisted project state, TUI sidebar, `/teamwork*` commands).

## Recommended Model

Prefer a model with native subagent support (one that can fan out parallel `task`/`subagent` calls inside a single turn). The default `native` executor depends on it: without subagent support, parallel tracks fall back to sequential work and stall reminders will fire. If your model cannot spawn subagents, either switch the project to the `isolated` executor (separate sessions, strong isolation, slower) or switch to a model that can.

## How it works

### Phase 1 — Scoping interview

`/teamwork <prompt>` starts a structured interview that follows Antigravity's *Specify What, Not How* principle: scope & objectives, requirements, independent verification per requirement, acceptance criteria, working-directory confirmation, an integrity mode (which shortcuts are off-limits), an executor (`native` vs `isolated`, default `native`), and max parallel tracks within a phase (default 5, cap 8). The result is a reviewable **prompt artifact** committed to your repo (it records the chosen executor and parallelism).

### The gate — human approval

Nothing runs until you say so: `/teamwork-approve` (or `/teamwork-revise` to iterate on the artifact). There is no auto-approve switch.

### Phase 2 — Autonomous execution

Once approved, the plugin's **state machine (Sentinel)** takes over. No LLM orchestrates the flow — a deterministic engine does, so the process guarantees hold even when the model misbehaves:

```
Project Orchestrator  plans milestones and work tracks (exclusive file ownership)
        ↓
Explorers             read-only research sessions
        ↓
Workers               implementation sessions within their assigned files
        ↓
Critic + Challenger   independent review + adversarial stress-testing (fresh sessions)
        ↓
Auditor               checks the work against the integrity mode and real command output
        ↓
... next milestone ...  →  Success Auditor  →  done
```

- **Eight roles, two executors.** Sentinel is the plugin itself; the other roles run either as separate hidden sessions (`isolated`: strong isolation, slow) or as native subagent fan-out inside the main session (`native`: fast, prompt-level isolation, default). Gates stay strict in both modes: every role still submits `teamwork_report` with verbatim command output, and the Auditor reruns claimed commands.
- **Verification gates are enforced, not suggested.** A failed gate loops the work back to the workers (isolated: same sessions re-prompted in parallel; native: one batch re-prompt to the main session) until the configured retry ceiling (`max_verification_retries`, default 2), then pauses the project and tells you exactly what is stuck.
- **Reports or failure.** Every role session must submit a structured `teamwork_report`; a session that ends without one has failed its task. In `native` mode the main LLM relays one report per track; pasted evidence must be verbatim subagent output. Fabricated evidence is a failure by definition.
- **Everything is reviewable, and progress is narrated.** `request.md`, `plan.md`, and `progress.md` live in `.opencode/teamwork/<slug>/` as real markdown, and the TUI sidebar shows live phase, executor, milestone progress, active tracks, and budget usage. Every finished track posts a short main-session summary (`track id + verdict + findings/evidence excerpts + running/queued`); permission waits post `[NEEDS-APPROVAL]` immediately and suspend wall-clock accounting, and a soft per-track stall reminder (default 30 min, reminder-only) guards against silent stalls.

### Where role sessions show up

Teamwork role sessions appear in your OpenCode session list while a project runs, with a `[teamwork]` title prefix (for example `[teamwork] fastify-migration — worker`) and a `teamwork: true` metadata marker so they are easy to recognize — and easy to tell apart from your own sessions. Hygiene is automatic:

- **Completed or cancelled projects** clean up all of their role sessions. Where the host exposes session removal (HTTP `DELETE /api/session/{id}`) they are deleted outright; otherwise their titles are rewritten to `[teamwork done] <slug>` so leftovers stay recognizable.
- **Crashed runs** are swept on the next plugin load (only sessions carrying the `teamwork` metadata marker are touched).
- **Paused projects** keep their sessions on purpose, so `/teamwork-resume` continues with full context.

### Integrity modes

| Mode | Purpose | Verification behavior |
| --- | --- | --- |
| `development` | Rapid iteration | Lenient. Flags fabricated outputs and facade implementations. (Default.) |
| `demo` | Reproducible presentation | Adds: no copying core logic from open source, no delegating core work to external tools, no reading test sources to reverse-engineer behavior. |
| `benchmark` | Thorough evaluation | Maximum strictness: from-scratch implementation, standard library only. |

## Commands

| Command | Purpose |
| --- | --- |
| `/teamwork <prompt>` | Start the Phase 1 scoping interview (asks executor + parallelism) |
| `/teamwork-approve` | Approve the prompt artifact and start Phase 2 |
| `/teamwork-revise <...>` | Apply revisions to the artifact, re-await approval; while `paused` it can also switch `executor` |
| `/teamwork-status` | Detailed project status (includes executor, parallelism, queue depth) |
| `/teamwork-pause` / `/teamwork-resume` | Pause and resume the team |
| `/teamwork-cancel` | Cancel the project |

Projects are budget-aware: optional token / wall-clock / team-session budgets across **all** role sessions combined, with graceful wrap-up when a limit hits. Permission waits never consume wall-clock time. Parallelism is capped by `max_parallel_workers` (default 5, cap 8, within-phase only; milestones and `explorer → worker → gates` barriers stay strict).

## Installation

Requires OpenCode 2.x (V2 runtime only; 1.x is not supported).

```bash
opencode plugin add @sandlada/opencode-teamwork
```

Project state is stored separately from the goal plugin at `OPENCODE_TEAMWORK_STATE_PATH` (default: your OpenCode data directory, `opencode-teamwork/projects.json`), so the two plugins can be installed together.

## Configuration

All options are optional plugin options:

```json
{
  "plugins": [
    {
      "package": "@sandlada/opencode-teamwork",
      "options": {
        "locale": "auto",
        "executor": "native",
        "max_parallel_workers": 5,
        "max_verification_retries": 2,
        "track_stall_reminder_seconds": 1800,
        "default_token_budget": null,
        "max_auto_turns": null,
        "max_duration_seconds": null,
        "restricted_agents": ["plan"]
      }
    }
  ]
}
```

`executor` (`native` default, or `isolated`) can also be set per project by the interview (`teamwork_create_project.executor`) and switched later via `teamwork_revise` while `awaitingApproval`/`paused` (never mid-`executing`). Projects created before this option existed normalize to the global default (`native`). `track_stall_reminder_seconds` (`null` disables) is a soft reminder only — it never fails a track.

## Development

```bash
bun install

bun run typecheck   # tsc --noEmit
bun run test        # bun test
bun run build       # bundles src/server.ts -> dist/server.js
bun run pack:dry-run

# End-to-end smoke against a local OpenCode V2 binary + fixture model:
bun scripts/smoke-v2-lifecycle.ts
```

## Acknowledgments

- [prevalentWare/opencode-goal-plugin](https://github.com/prevalentWare/opencode-goal-plugin) — the upstream this project is adapted from.
- [Google Antigravity Teamwork docs](https://antigravity.google/docs/teamwork/) and [Boost docs](https://antigravity.google/docs/boost/) — the design inspiration for the multi-agent workflow.

Not affiliated with or endorsed by Google. Antigravity is a trademark of Google LLC.

## License

MIT — see [LICENSE](LICENSE).
