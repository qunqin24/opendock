# Opencode-Self-Improvement

**Durable project memory for [OpenCode](https://opencode.ai).** A fresh session can build on the commands, conventions, and decisions saved in earlier sessions.

Save your repo’s test command once, and OpenCode can recall it the next time you ask how to run tests. The plugin brings relevant memories into context automatically and stores them locally, scoped to your repo by default. You can inspect what it recalled and correct or undo a memory as the project changes.

## Quick start

**Before you install.** Auto-capture is on by default. At turn-end and compaction it can send conversation content to your configured model after a best-effort credential scrub. [See what it sends and how to opt out](#auto-capture).

Install in OpenCode (Bun 1.3.0+).

```sh
opencode plugin add opencode-self-improvement
```

Restart OpenCode. For the desktop app, run `opencode service restart`.

1. In your project, ask the agent to remember a real convention, such as “Remember that this repo uses `bun test` to run its tests.”
2. Open a fresh session in the same repo and ask “How do we run tests in this repo?”
3. Use `/memory` in the terminal UI or `/memory-report` in chat to see what memory reached the session.

To seed your repo's build, test, lint, and typecheck commands, run `/repo-init` in OpenCode. Use `/repo-init force` after a refactor. [See manual, pinned, and checkout installs](docs/reference/install.md).

![Ten-second demo: remember, recall, correct, undo](docs/assets/demo.gif)
*Scripted turns using the real plugin and store with a fake model. Regenerate with `vhs demo.tape`.*

## What memory is worth, measured

A remembered fact let a later session complete a task it otherwise failed. The benchmark used one local model and a leak-checked fixture that kept the answer out of the files available to the agent. [Transport benchmark record](https://github.com/abogartz/opencode-self-improvement/issues/391)

**The metric.** `work = session generation + capture generation`, with cache read and cache write reported separately and never folded into a total. Capture is a separate model call after the turn, outside the session's usage. [Reuse benchmark](https://github.com/abogartz/opencode-self-improvement/issues/385) · [Metric correction](https://github.com/abogartz/opencode-self-improvement/issues/392)

| Result | n | Seat | What was measured |
| --- | --- | --- | --- |
| **Transport.** A fact learned in one session reaches a later session that provably cannot obtain it any other way | 5 per arm, with the empty-store floor verified first | `evo/Qwen3.8-Flash-Next-UD-Q4_K_XL`, local seat behind a recording proxy | empty store **0/5** (every failure: the artifact was never written), same store seeded **5/5**. Fixture leak-checked: no form of the answer is in any file the agent sees |
| **Reuse.** A memory reduces the work on a task the agent already passes | 6 pairs | same seat | median of the six per-pair L2/L0 work ratios — sorted 0.54, 0.79, 0.84, 0.98, 1.06, 1.23, middle two averaged — **0.91×**, higher in 2 of 6, inside the pre-registered 0.80–1.25 band: **no measurable effect at 20% resolution**. An unrelated memory: **0.99×**, same estimator, higher in 3 of 6 |

The transport result measures task completion. A token-saving or billing claim would require separate evidence.

**Rules for any cost claim in this repository** — published in `bench/claims.json`, enforced in CI by `test/host/claims.test.ts`:

- No cost claim below **n=6 pairs per arm**; a ratio at `6 ≤ n < 21` is labelled "20% resolution".
- A **seat** and a **metric** are named on the same line as the number.
- The word "cheaper" does not appear without those.
- An issue or PR body making a cost claim owes the same n, seat and metric. CI reads only this file, so that half is enforced by review.
- Nothing reproduces at n=1: the same arm on the same fixture, both runs passing, differed by more than 2×.
- Cache state is reported, never assumed. Two runs that start from different cache states are not a saving.

## What you get

- **Keep context between sessions.** A keyword matcher brings relevant memories into the prompt within a 1,200-character budget by default. During compaction the plugin shares durable facts with the summarizer. [Recall quality](docs/internals/recall-quality.md) · [Prompt budgets and cache behavior](docs/internals/injection-cost.md)
- **Check facts before saving.** Write gates check cited code and paths against the current tree, screen for near-duplicates and contradictions with retired memories, and log the reason for a refusal in `memory_evidence`. [Write gates](docs/internals/write-gates.md)
- **Keep project context scoped.** Memories live outside the repo in `~/.config/opencode/memory` by default. Use `OPENCODE_MEMORY_DIR` to move the store and `memory_remember global: true` for a preference you want across repos. [Repo scoping](docs/internals/repo-scoping.md) · [Secret redaction](docs/internals/secret-redaction.md)
- **See and correct what it learned.** Inspect the memory block and blocked writes in `/memory` or `/memory-report`. Use `memory_update` to correct a memory, `memory_forget` to retire it, and `memory_undo` to restore a snapshot. Export or import JSONL to move the store. [Status and browser editor](docs/reference/surfaces.md) · [Export and import](docs/internals/export-import.md)

Preview stale threads to retire with `memory_decay`, or review near-duplicate merge proposals with `memory_consolidate`. [Use ledger and consolidation](docs/internals/use-ledger.md)

Find configuration, store behavior, and contributor guides in the [documentation index](docs/README.md) and [architecture decisions](docs/adr/README.md).

## Options

Zero configuration is the default.

| Option | Default | What it does |
| --- | --- | --- |
| `injectBudget` | `1200` | Character cap on the injected relevance block and each contextual pull. |
| `frontierBudget` | `3 × injectBudget` | Character cap on the session-start open-threads block. A thread longer than the budget is not injected and is reported as omitted. |

Everything else goes in the object form of the plugin entry — capture options, `contradictionSurface`, `notifyBlocked`, the contextual pull's scope — documented in [docs/reference/options.md](docs/reference/options.md). Read [docs/reference/flags.md](docs/reference/flags.md) before flipping `OPENCODE_MEMORY_DEDUP`, `OPENCODE_MEMORY_SYMPTOM` or `OPENCODE_MEMORY_QUERY_GATE` — each switches off behaviour a measurement decided.

## Auto-capture

At turn-end and compaction, auto-capture can use a model call to propose up to `captureMax` candidates (default 3). They go through the same write gates as manual saves. Each session and trigger has a 5-minute cooldown. An invalid `captureModel` disables auto-capture with a startup warning. The setting expects `provider/id`.

Auto-capture is on by default and sends conversation content to your configured model. The plugin excludes reasoning content and runs the copy through a best-effort credential scrubber. To disable those model calls, set `autoCapture` to `false`.

```json
{
  "plugins": [{ "package": "opencode-self-improvement", "options": { "autoCapture": false } }]
}
```

## Development

CI runs `bun run gate` (typecheck + lint + unit tests + terminal smoke and BDD) as required checks; the same sequence is one command locally. Use Bun **1.4.4** to match CI.

```sh
bun run gate          # full gate: typecheck + lint + tests + smoke
bun run gate:hooks    # once per clone: run the gate on `git push`
bun run test          # unit tests (tests/)
bun run test:e2e      # BDD integration (e2e/) — needs opencode on PATH or OPENCODE_BIN
```

Feature order is BDD-first: e2e scenario → implementation → unit tests. If no scenario turns red first, the feature has no observable contract.

## Troubleshooting

One row per problem with its fix — tools not available, blocked writes, an argument-schema rejection, a busy store, stale plugin, auto-capture doing nothing, malformed rows, missing `/repo-init` — is in [docs/reference/troubleshooting.md](docs/reference/troubleshooting.md).
