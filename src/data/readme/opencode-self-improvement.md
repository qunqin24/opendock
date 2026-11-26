# Opencode-Self-Improvement

Durable memory for [OpenCode](https://opencode.ai). Your agent remembers decisions and facts across sessions — stored locally, scoped to your repo, and checked before it's stored.

Say "we use Bun, not npm — npm keeps breaking the lockfile" on Monday. Next Tuesday, the agent already knows. A wrong memory is superseded, not deleted, and `memory_undo` restores the old one.

![Ten-second demo: remember, recall, correct, undo](docs/assets/demo.gif)
*Scripted turns. Real plugin, real store, fake model. Regenerate with `vhs demo.tape`.*

## Quick start

```sh
opencode plugin add opencode-self-improvement   # 1. install (Bun 1.3.0+)
opencode service restart                          # 2. restart (desktop app)
/repo-init                                        # 3. optional: store repo test/build/lint/typecheck commands
```

Ask the agent to remember something; relevant memories come back on their own. [Other install routes](docs/reference/install.md) cover manual config entries, pinning, and checkout installs. Rerun `/repo-init force` after a refactor.

## What you get

- **Write gates — a CI check for facts.** A memory citing `parseHeader()` in a file you deleted is refused before it is stored, not after a future session trusts it. Near-duplicates collapse; contradictions with retired memories are rejected. Every refusal lands in `memory_evidence` with its reason.
- **Budgeted injection.** Relevant memories ride the prompt on their own, capped at `injectBudget` characters (default 1200). The block is cache-stable: a write somewhere else in the store does not cost you a cache miss.
- **Repo scoping.** Every row carries the repo that wrote it — project A's facts never surface in project B. Preferences you want everywhere go in with `memory_remember global: true`.
- **Nothing is deleted.** `memory_update` supersedes the old row, `memory_forget` records a retirement, `memory_undo` restores a snapshot.
- **Auto-capture.** One cheap model pass at turn-end and compaction proposes facts worth keeping — they face the same gates as hand-saved memories. On by default; see below.
- **Memory-aware compaction** — a long session hands its durable facts to the summarizer instead of losing them.
- **Safe across concurrent sessions** — a reader sees the previous store file or the new one, never half of either.
- **Decay and consolidation** — `memory_decay` retires stale open threads, `memory_consolidate` proposes near-duplicate merges. Dry-run-first, nothing written you did not approve.
- **Surfaces** — footer badge, `/memory` panel, `/memory-report` for chat clients, and a loopback-only browser admin editor. See [docs/reference/surfaces.md](docs/reference/surfaces.md).
- **Export / import (JSONL)** — back the store up or move it between machines; every imported row re-enters through the same gates. See [docs/internals/export-import.md](docs/internals/export-import.md).
- **Secret redaction** — credential-shaped values become `[redacted]`. See [docs/internals/secret-redaction.md](docs/internals/secret-redaction.md).

Memory is stored outside every repository, under `~/.config/opencode/memory` by default (override with `OPENCODE_MEMORY_DIR`).

## What memory is worth, measured

Every figure carries a marker: **measured** (read off a live store), **bench** (a deterministic synthetic workload), or **illustrative** (sample output showing shape, not a measurement). Unmarked numbers are unchecked.

Two results, each quoted with its `n` and seat because an early finding flipped when the metric was corrected — see [#385](https://github.com/abogartz/opencode-self-improvement/issues/385) and [#392](https://github.com/abogartz/opencode-self-improvement/issues/392).

**The metric.** `work = session generation + capture generation`, with cache read and cache write reported separately and never folded into a total. Capture is a separate model call made after the turn, so it appears in no session's usage: a meter that reads session numbers alone reports this plugin's own cost as exactly zero.

| Result | n | Seat | What was measured |
| --- | --- | --- | --- |
| **Transport.** A fact learned in one session reaches a later session that provably cannot obtain it any other way | 5 per arm, with the empty-store floor verified first | `evo/Qwen3.8-Flash-Next-UD-Q4_K_XL`, local seat behind a recording proxy | empty store **0/5** (every failure: the artifact was never written), same store seeded **5/5**. Fixture leak-checked: no form of the answer is in any file the agent sees |
| **Reuse.** A memory reduces the work on a task the agent already passes | 6 pairs | same seat | median of the six per-pair L2/L0 work ratios — sorted 0.54, 0.79, 0.84, 0.98, 1.06, 1.23, middle two averaged — **0.91×**, higher in 2 of 6, inside the pre-registered 0.80–1.25 band: **no measurable effect at 20% resolution**. An unrelated memory: **0.99×**, same estimator, higher in 3 of 6 |

**What is not claimed here.** No token saving. No dollar figure. The seat above is a local box with no cache price; on a hosted provider a cache miss costs roughly 0.1× read and 1.25× write, which is a different claim and cannot be quoted from these numbers.

**Rules for any cost claim in this repository** — published in `bench/claims.json`, enforced in CI by `test/host/claims.test.ts`:

- No cost claim below **n=6 pairs per arm**; a ratio at `6 ≤ n < 21` is labelled "20% resolution".
- A **seat** and a **metric** are named on the same line as the number.
- The word "cheaper" does not appear without those.
- An issue or PR body making a cost claim owes the same n, seat and metric. CI reads only this file, so that half is enforced by review.
- Nothing reproduces at n=1: the same arm on the same fixture, both runs passing, differed by more than 2×.
- Cache state is reported, never assumed. Two runs that start from different cache states are not a saving.

## How it works

- **Write gates.** Before a memory is stored: call signatures and paths resolve in the live tree (GATE-1), no stale memory contradicts it (GATE-2), no near-duplicates (GATE-3), then it promotes or refuses (GATE-4). Every refusal is logged to `memory_evidence` with its reason. See [docs/internals/write-gates.md](docs/internals/write-gates.md).
- **Injection.** Two concepts minimum for long prompts (one for short ones); identifiers count once. Injected bytes are frozen and cache-stable — a row promoted elsewhere in the store does not cost you a cache miss. See [docs/internals/injection-cost.md](docs/internals/injection-cost.md).
- **Recall.** No vector DB, no embeddings: a keyword matcher with write-time `kw` aliases. Bench against classic BM25 on a 200-row store, k=3: lexical queries 98% R@1 / R@3, near-paraphrase 28% → 67% with `kw`, zero-overlap 0% → 26% with `kw`. See [docs/internals/recall-quality.md](docs/internals/recall-quality.md).
- **Use ledger.** Every row gets a due-date card — who looked at it, when, how it reached them. Append-only, never ingested as a memory, shown in `memory_status`. See [docs/internals/use-ledger.md](docs/internals/use-ledger.md).
- **Consolidation.** `memory_consolidate` proposes near-duplicate merges; it writes nothing. A merge is proposed only when the merged row catches at least as many of the cluster's recorded reads as the best single member. See [docs/internals/use-ledger.md](docs/internals/use-ledger.md).

The full reference — store, config, options, flags, development, troubleshooting — is in [docs/README.md](docs/README.md), and the accepted architecture decisions in [docs/adr/README.md](docs/adr/README.md).

## Options

Zero configuration is the default.

| Option | Default | What it does |
| --- | --- | --- |
| `injectBudget` | `1200` | Character cap on the injected relevance block and each contextual pull. |
| `frontierBudget` | `3 × injectBudget` | Character cap on the session-start open-threads block. A thread longer than the budget is not injected and is reported as omitted. |

Everything else goes in the object form of the plugin entry — capture options, `contradictionSurface`, `notifyBlocked`, the contextual pull's scope — documented in [docs/reference/options.md](docs/reference/options.md). Read [docs/reference/flags.md](docs/reference/flags.md) before flipping `OPENCODE_MEMORY_DEDUP`, `OPENCODE_MEMORY_SYMPTOM` or `OPENCODE_MEMORY_QUERY_GATE` — each switches off behaviour a measurement decided.

## Auto-capture

Auto-capture notices facts on its own. One cheap model pass at turn-end and compaction proposes up to `captureMax` candidates (default 3); they face the same four gates as a hand-saved memory, and a 5-minute cooldown per session and trigger bounds the spend. An explicit `captureModel` that is not `provider/id` turns auto-capture off with a startup warning rather than substituting a model you did not choose.

**What that default means for your data.** On by default, installing this plugin sends a copy of the conversation to your configured model at every turn-end and every compaction. The copy excludes reasoning content and runs through the credential scrubber first, and proposals face the same gates as manual saves — but the read itself is real, and it goes out over your provider. Turn it off:

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
