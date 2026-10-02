# @sandlada/opencode-teamwork

**Antigravity-style agent teamwork for [OpenCode](https://opencode.ai).**

A community plugin that brings the multi-agent collaboration experience of [Google Antigravity](https://antigravity.google)'s **Teamwork** (`/teamwork-preview`) to OpenCode: a scoping interview with execution-path selection, a reviewable brief artifact, an autonomous multi-agent build driven by a deterministic state machine, and per-path adversarial verification gates that demand real evidence — all inside your terminal.

> **Development status:** this plugin is under active development and is **not suitable for production use**. Expect breaking changes, incomplete features, and unstable behavior.

> Adapted from [`@prevalentware/opencode-goal-plugin`](https://github.com/prevalentWare/opencode-goal-plugin), which added Codex-style goal mode to OpenCode. Goal mode lives on in the upstream package; this plugin replaces it with teamwork and is designed to run alongside it.

> **Breaking v2:** project state schema is version 2. Version 1 state files are dropped on load (not migrated), and pre-v2 `.opencode/teamwork/<slug>/` artifacts are no longer read or written. Artifacts now live in `.teamwork/` at the project root.

## How it works

### Phase 1 — Scoping interview

`/teamwork <prompt>` starts a structured interview that follows Antigravity's *Specify What, Not How* principle: scope & objectives, requirements, independent verification per requirement, acceptance criteria, working-directory confirmation, an integrity mode (which shortcuts are off-limits), and speed knobs (`workers=N`, `team=S|M|L`, `deep=on|off`). The Sentinel selects exactly one execution path and records it in the brief:

| Path | Best for |
| --- | --- |
| `general` (default) | multi-file SWE, refactoring, systems work |
| `iterative` | one self-contained change; never decomposes into parallel tracks |
| `review` | critique / synthesis of papers, RFCs, design docs (no source edits) |
| `math` | bounds, theorems, derivations (single tournament round) |
| `math-large` | hard conjectures, combinatorial search (full tournament network) |

### The gate — human approval

Nothing runs until you say so: `/teamwork-approve` (or `/teamwork-revise` to iterate on the brief). There is no auto-approve switch.

### Phase 2 — Autonomous execution

Once approved, the plugin's **state machine (Sentinel)** takes over. No LLM orchestrates the flow — a deterministic engine does, so the process guarantees hold even when the model misbehaves. Gates per path:

```
General:    explorer -> workers (parallel, cap workers) -> critic -> challenger [deep=on] -> auditor
Iterative:  explorer -> single worker -> critic -> auditor (never parallelizes)
Review:     reviewers (parallel angles) -> synthesizer -> critic -> auditor (no source edits)
Math:       prover candidates -> falsifier [deep=on] -> verifier (single round)
Large Team: parallel prover+falsifier pairs -> verifier synthesis (+ .teamwork/knowledge/)
... next milestone ...  →  Success Auditor  →  done
```

- **Twelve roles.** Sentinel is the plugin itself; orchestrator, explorer, worker, critic, challenger, auditor, prover, falsifier, verifier, reviewer, synthesizer, and success auditor run as separate hidden sessions with strong isolation. Every role prompt is the verbatim skill file from `skill-teamwork/roles/` (embedded at build time by `scripts/sync-prompts.ts`); every subagent prompt is `shared/base.md + role file + task block`.
- **No fixed retry ceiling.** A failed gate sends the work back to the builders with the failing verdict as context, then re-runs the gate. The loop ends on pass or on user pause/cancel. A plan missing its path's gate tracks, or an Iterative plan with parallel builders, pauses the project immediately.
- **Reports or failure.** Every role session must submit a structured `teamwork_report`; a session that ends without one has failed its task. Fabricated evidence is a failure by definition.
- **Everything is reviewable, and progress is narrated.** `brief.md`, `request.md`, `plan.md`, and `progress.md` live in `.teamwork/` as real markdown (plus `scratch/<track>/` probe dirs and `knowledge/` for math paths), and the TUI sidebar shows live phase, path, milestone progress, active tracks, and budget usage. Every finished track posts a short main-session summary; permission waits post `[NEEDS-APPROVAL]` immediately and suspend wall-clock accounting, and a soft per-track stall reminder (default 30 min, reminder-only) guards against silent stalls.

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
| `/teamwork <prompt>` | Start the Phase 1 scoping interview (asks path + speed knobs) |
| `/teamwork-approve` | Approve the brief artifact and start Phase 2 |
| `/teamwork-revise <...>` | Apply revisions to the brief, re-await approval |
| `/teamwork-status` | Detailed project status (includes path, knobs, queue depth) |
| `/teamwork-pause` / `/teamwork-resume` | Pause and resume the team |
| `/teamwork-cancel` | Cancel the project |

Projects are budget-aware: optional token / wall-clock / team-session budgets across **all** role sessions combined, with graceful wrap-up when a limit hits. Permission waits never consume wall-clock time. Parallelism is capped by `max_parallel_workers` (default 5, cap 8, within-phase only; the Iterative path always runs one track at a time).

All prompts, artifacts, and UI copy are English-only; the model responds in your language on its own.

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
        "max_parallel_workers": 5,
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

`track_stall_reminder_seconds` (`null` disables) is a soft reminder only — it never fails a track.

## Development

```bash
bun install

bun run typecheck   # tsc --noEmit
bun run test        # bun test
bun run build       # syncs skill prompts, bundles src/server.ts -> dist/server.js
bun run pack:dry-run

# End-to-end smoke against a local OpenCode V2 binary + fixture model:
bun scripts/smoke-v2-lifecycle.ts
```

Role behavior lives in `skill-teamwork/` — edit the markdown there, then `bun run sync:prompts` to regenerate `src/prompts.generated.ts` (`bun run check:prompts` asserts it is fresh).

## Acknowledgments

- [prevalentWare/opencode-goal-plugin](https://github.com/prevalentWare/opencode-goal-plugin) — the upstream this project is adapted from.
- [Google Antigravity Teamwork docs](https://antigravity.google/docs/teamwork/) and [Boost docs](https://antigravity.google/docs/boost/) — the design inspiration for the multi-agent workflow.

Not affiliated with or endorsed by Google. Antigravity is a trademark of Google LLC.

## License

MIT — see [LICENSE](LICENSE).
