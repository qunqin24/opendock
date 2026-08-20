# @mcrescenzo/opencode-self-evolve

Self-Evolve turns repeated project friction into evidence-backed recommendations for existing global OpenCode skills. It watches only future eligible activity, keeps project evidence partitioned, aggregates identity-free support, and proposes a reviewed skill change. It never applies or undoes a file change without a fresh explicit operator action.

The v0.4 product has one normal operating preference: **Automatic recommendations** is On or Off.

- **On** allows future eligible activity to produce recommendations when all required permissions and operational gates pass.
- **Off** stops automatic evidence and recommendation work across processes, preserves existing recommendations and explicit actions, and creates a no-backfill boundary.
- Neither state grants file-write authority.

## Install

Use OpenCode's native installer:

```sh
opencode plugin @mcrescenzo/opencode-self-evolve --global
```

Omit `--global` only for an intentional project-scoped registration. The installer registers both the server and native UI. Restart OpenCode after registration/config changes.

Manual registration uses the package root in both places:

```json
// opencode.json
{
  "plugin": ["@mcrescenzo/opencode-self-evolve"]
}
```

```json
// tui.json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["@mcrescenzo/opencode-self-evolve"]
}
```

Do not register `/tui`, `self-evolve-tui.tsx`, or `self-evolve-tui.js` directly. The package exports the headless-safe server at `.` and deterministic prebuilt native target at `./tui`.

## What Happens By Default

Fresh installations, every valid supported v0.2/v0.3 migration, and authenticated reinitialize start with:

```text
Automatic recommendations: On
Durable observations: On
Sanitized excerpts: On
Cross-project aggregation: On
Project participation: Included
Emergency Stop: Off
```

Legacy project exclusions and Emergency Stop survive migration. Malformed, corrupt, or unsupported authority opens Off. Once v0.4 stores a valid Off or permission revocation, restart never replays migration over it.

Turning On atomically enables the three required data permissions. Turning Off advances a separate cross-process automation epoch without purging retained data. Revoking any required permission atomically turns automation Off and performs the permission's cleanup/invalidation work. Restoring the permission leaves automation Off until the operator explicitly turns it On.

Manual/on-demand analysis, `/self-evolve scan`, installation/project modes, repository mode inheritance, ordinary Pause/Resume/Disable, separate passive-call consent, the v0.1 analyzer, and `durableAutonomy: false` are removed.

## Native Workflow

Open **Self-evolve control center** from the persistent sidebar. It renders exactly four sections: Home, Recommendations, Activity, and Settings.

- **Home** — stored preference, truthful operational state, current blockers, and the next useful action.
- **Recommendations** — queue, detail, evidence summary, diff, and action-specific Apply/Reject/Undo reasons.
- **Activity** — bounded semantic history and diagnostics, never raw logs.
- **Settings** — Automatic recommendations On/Off, retained permissions, project Include/Exclude, Emergency Stop, budgets/retention, explicit creation root, export, purge, breaker reset, and reinitialize.

The dashboard distinguishes Off from preboot validation, exclusion, quiet/budget limits, Emergency Stop, breaker, unsupported host, and corruption. Those suppressors do not rewrite the stored preference.

Background refresh updates mounted state only. It emits no proposal/status/settings toast, attention notification, polling-triggered dialog, automatic route, or transcript injection.

## Existing-Skill Discovery Without Setup

Self-Evolve does not require an update allowlist for existing global skills. It builds a read-only catalog only when OpenCode's official global path, global configuration, and resolved-skill projections agree on one canonical local global skill.

Eligible sources include the standard global config collection, `OPENCODE_CONFIG_DIR`, global `.agents`/`.claude` compatibility collections, and local global `skills.paths` entries. Project `.opencode/.agents/.claude` skills, project-configured paths, URL/remote catalogs, embedded/built-in skills, caches, ambiguous duplicates, malformed frontmatter, symlinks, unsafe paths, nested collection ambiguity, and drift are excluded.

Catalog inspection is safe while automation is Off. Discovery itself never changes the preference, permissions, root policy, recommendation state, or any skill file.

New-skill recommendations are different: they still require one explicit operator-selected creation root and `must-not-exist` publication. A model cannot choose a destination.

## Explicit Apply, Reject, And Undo

Recommendations stay visible and actionable while automation is Off.

- **Apply** requires a fresh exact operator decision and current permission, support, target provenance/path/hash, content, critic, deterministic, nonce/version/grant, lease, and integrity proofs. Privacy revocation blocks Apply. Restoring permission may restore Apply while automation remains Off, but cannot restart automatic work.
- **Reject** writes no skill file and remains available while Off or after privacy revocation.
- **Undo** restores only exact transaction-owned bytes after snapshot/current-hash/path/grant/lease proof. It remains available while Off and after privacy/support revocation, Emergency Stop, or breaker trip when those integrity proofs pass.

Emergency Stop and the circuit breaker block automatic work and new Apply. They do not strand exact risk-reducing Undo.

The applier is the only skill writer. Existing replacements use same-directory exclusive temp files, fsync, atomic rename, and readback. New files use complete verified temps plus create-exclusive hard-link publication. Symlink, identity, ownership/mode, hash, containment, lease, generation, audit, or rollback uncertainty fails closed.

## Headless And Recovery Commands

The native control center is the normal path. Retained headless commands preserve their established names and exact confirmation tuples; `/self-evolve help` is authoritative for syntax.

- `/self-evolve on` and `/self-evolve off` are the only headless preference transitions.
- Bare `/self-evolve`, `help`, `status`, `inbox`, `budget`, and `health` remain.
- `review`, exact `approve`, `reject`/`dismiss`, `snooze`, and `undo` remain.
- `include` and `exclude` remain the only project participation controls.
- Durable-observation, sanitized-excerpt, and cross-project permission controls remain.
- Allowlist suggestions, explicit creation-root policy, observation/eligibility inspection, export, scoped/global purge, `kill-switch`, `reset-breaker`, and `reinitialize` remain.
- `scan`, `manual`, `auto`, `yolo`, `repo`, `pause`, `resume`, `disable`, and passive consent are removed. They return deterministic migration guidance before material reads or effects.

The exact headless Apply tuple remains hash/version/nonce bound:

```text
/self-evolve approve <recommendation-id>
  --target-hash <sha256|must-not-exist>
  --proposed-content-hash <sha256>
  --decision-version <integer>
  --nonce <one-use-nonce>
```

A bare recommendation ID is never write authority.

## No Backfill And Cross-Process Safety

Every automatic material boundary binds the current automation generation: admission, message read, evidence persistence, contribution, candidate, provider dispatch, critic completion, recommendation persistence, scheduler continuation, and settlement.

Off closes the old generation before new admission. Local abort controllers are an optimization, not authority. Late provider output cannot create new evidence, support, recommendations, or result authority. Recovery supersedes only unfinished collecting/eligible/synthesis-pending candidates and nonterminal attempts; published recommendations and terminal results remain.

Re-enable first establishes a durable source-cursor boundary. Activity accumulated while Off and pre-Off evidence/support cannot form a new-generation candidate. Only safely delimited future activity counts.

## Privacy And Retention

Complete transcripts and raw message bodies are never stored. Typed receipts/observations contain no raw text. Bounded sanitized excerpts are heuristically scrubbed and remain project-local; redaction reduces exposure but is not a secrecy guarantee. Do not process material that must never reach the configured model provider.

Global contributions, support, candidates, recommendations, decisions, and audits reject project/worktree/source-domain/evidence-domain/capsule/cluster/observation/session/local-incident identities and derived hashes. Opaque contribution IDs are random.

Defaults are 30 days for project evidence, capsules, contributions, candidates, and support; 90 days for recommendations, decisions, audits, and rollback authority; 24 hours for retained bridge artifacts; at most 60 seconds for action authority; and at most one hour for global lease safety. Active recommendation/rollback chains retain required material until terminal.

Export writes a bounded private expiring `0600` artifact under the state root and never opens it automatically. Purge scopes preserve project/global separation. Purge-all is accepted-terminal: it publishes the terminal response, stops authority, then deletes the subtree. Restart does not clear terminal authority; authenticated reinitialize creates a new root epoch and the On/all-required-permissions baseline.

## Host And Package Contract

Supported hosts are stable OpenCode `>=1.18.3 <1.19.0`; the optional plugin peer range is `~1.18.3`. Version/root/skill-source checks use bounded official exact-origin host surfaces and fail closed on disagreement or unsupported shapes. User options cannot widen host authority.

Mixed v0.3/v0.4 server/TUI pairs are read-only limited. Package version never implies a capability, and old writable requests are rejected rather than mapped to On/Off or another retained control.

The server root imports no TUI/OpenTUI runtime. Only `./tui` may reach the optional target peers. No ordinary runtime dependency is added.

## Development

Node.js 22.11.0 or newer and Bun 1.3.8 or newer are required. Run:

```sh
npm test
npm run check
npm run pack:check
npm run audit:dependencies
npm run smoke:live
```

See [docs/configuration.md](docs/configuration.md), [docs/autonomy-contract.md](docs/autonomy-contract.md), [docs/internals.md](docs/internals.md), [SECURITY.md](SECURITY.md), and [CONTRIBUTING.md](CONTRIBUTING.md).
