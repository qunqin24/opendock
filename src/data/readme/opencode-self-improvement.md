# Opencode-Self-Improvement

Durable memory for [opencode](https://opencode.ai): the decisions, commands and facts an agent should still know next week, plus a one-command per-repo setup.

Say "we use Bun, not npm — npm keeps breaking the lockfile" on Monday. A session you start on Tuesday already knows it, and why. A memory that turns out wrong is superseded, never deleted, and `memory_undo` rolls it back.

Every figure here carries a marker: **measured** (read off a live store), **bench** (a deterministic synthetic workload, reproducible with the command printed under the table), or **illustrative** (sample output showing shape, not a measurement). A number without a marker is a claim that has not been checked.

## Quick start

**1. Add the plugin** to `~/.config/opencode/opencode.jsonc` (global) or a project `opencode.jsonc`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-self-improvement"]
}
```

**2. Restart opencode.** On the desktop app a later config edit needs `opencode service restart`: relaunching the app leaves the background service, and the options it already parsed, alive.

**3. Run `/repo-init`** in each repo you work in. It stores that repo's test / build / lint / typecheck commands as memories, so the next session does not rediscover them. Rerun `/repo-init force` after a refactor.

After that, memory is just conversation: ask the agent to remember something and it sticks.

Other install routes — `opencode plugin add`, the Bun version floor, how an unpinned entry resolves `@latest`, and pointing the entry at a checkout: [docs/reference/install.md](docs/reference/install.md).

## What you get

Think of it as a lab notebook the agent keeps for your repo, plus a librarian who checks every entry before filing it.

- **Write gates — a CI check for facts.** A memory citing `parseHeader()` in a file you deleted is refused before it is stored, not after a future session trusts it. Near-duplicates collapse, and a contradiction with a retired memory is rejected. Every refusal lands in `memory_evidence` with its reason.
- **Budgeted injection.** Relevant memories ride the prompt on their own, capped at `injectBudget` characters. The block is cache-stable: a write somewhere else in the store does not cost you a cache miss.
- **Repo scoping.** Every row carries the repo that wrote it, so project A's facts never surface in project B. A preference you want everywhere goes in with `memory_remember global: true`.
- **Nothing is deleted.** `memory_update` supersedes the old row, `memory_forget` records a retirement, `memory_undo` restores a snapshot.
- **Memory-aware compaction** — a long session hands its durable facts to the summarizer instead of losing them.
- **Safe across concurrent sessions** — a reader sees the previous store file or the new one, never half of either.
- **Decay and consolidation** — `memory_decay` retires stale open threads, `memory_consolidate` proposes near-duplicate merges. Both are dry-run-first and write nothing you did not approve.
- **Export / import (JSONL)** — back the store up or move it between machines; every imported row re-enters through the same gates. See [Export and move between machines](docs/internals/export-import.md).
- **Surfaces** — a footer badge, the `/memory` panel, `/memory-report` for chat clients, and a browser admin editor. See [docs/reference/surfaces.md](docs/reference/surfaces.md).
- **Secret redaction** — credential-shaped values become `[redacted]`. See [docs/internals/secret-redaction.md](docs/internals/secret-redaction.md).
- **`memory_*` tools** — `memory_remember`, `memory_recall`, `memory_update`, `memory_forget`, `memory_undo`, `memory_status`, `memory_evidence`, `memory_export`, `memory_import`, `memory_decay`, `memory_consolidate`, `memory_merge_review`, `memory_list`, `memory_init`.
- **Auto-capture** — at the end of a turn, and again at compaction, one cheap model pass reads what just happened and proposes facts worth keeping. They face the same write gates as anything you save by hand. On by default, and it inherits your session's model; `autoCapture: false` turns it off. See [Auto-capture](#auto-capture).

Memory is stored outside every repository, under `~/.config/opencode/memory` by default (override with `OPENCODE_MEMORY_DIR`). To start over, delete that directory.

## Options

Zero configuration is the default. Two options change what the model sees:

| Option | Default | What it does |
| --- | --- | --- |
| `injectBudget` | `1200` | Character cap on the injected relevance block and each contextual pull. |
| `frontierBudget` | `3 × injectBudget` | Character cap on the session-start open-threads block. A thread longer than the budget is not injected and is reported as omitted. |

Everything else goes in the object form of the plugin entry, and is documented once with its invalid-value rule: the capture options, `contradictionSurface`, `notifyBlocked`, the contextual pull's scope (`pullOutputChars`, `pullTools`, with the bench behind each default), and every environment variable in [docs/reference/options.md](docs/reference/options.md). Read [docs/reference/flags.md](docs/reference/flags.md) before flipping `OPENCODE_MEMORY_DEDUP`, `OPENCODE_MEMORY_SYMPTOM` or `OPENCODE_MEMORY_QUERY_GATE` — each switches off behaviour a measurement decided, and each has an invalid-value rule that surprises people.

## Auto-capture

Auto-capture is the part that notices facts on its own instead of waiting to be asked. At the end of a turn — and again at compaction, before the summarizer replaces the transcript — one cheap model pass reads what just happened and proposes up to `captureMax` candidates (default 3). They face the same four write gates as anything you save by hand, and a 5-minute cooldown per session and trigger bounds the spend.

It is **on by default** and needs no model name to run. With `captureModel` unset, each pass uses the model your session is already using, or the host default. Name `captureModel` only to pin one model: an explicit value that is not `provider/id` turns auto-capture off with a startup warning rather than substituting a model you did not choose.

**What that default means for your data.** Because the switch is on, installing this plugin sends a copy of the conversation to your configured model at every turn-end and every compaction. The copy excludes reasoning content and runs through the credential scrubber first, and anything the pass proposes still faces the same write gates as a manual save — but the read itself is real, and it goes out over your provider. Set `autoCapture: false` if you do not want that:

```json
{
  "plugins": [{ "package": "opencode-self-improvement", "options": { "autoCapture": false } }]
}
```

**The honest caveat.** The trigger fires and the write survives on a real host: `e2e/capture.test.ts` drives `opencode run` and a capture pass starts in 12 of 12 runs. What has not been seen is a live store completing a pass — no `auto_capture_*` line exists anywhere in the maintainer's evidence history — and nothing about quality is measured: what auto-capture would write, how often it duplicates a memory you would have written yourself, and what it costs. Because the switch is on by default, that unmeasured pass runs on every install unless you turn it off; `autoCapture: false` is the one-line answer if you would rather wait for the numbers.

What has been established, and by which kind of evidence, is itemised in [docs/internals/auto-capture-evidence.md](docs/internals/auto-capture-evidence.md). Read that file before quoting any figure in it — two of the entries are defects found in the measuring bench itself, and the corrected numbers are the ones recorded there. `bench/capture-trigger-results.md` is a **bench** simulation of trigger *timing* with a scripted extractor; it answers "which moment is worth mining", not "does this earn its keep".

**Am I armed?** `memory_evidence` answers on the `plugin_load` line: `capture=on` (the default), `capture=off` (`autoCapture: false`), `invalid_model`, `no_capabilities`, or `switch_mismatch`. `capture=on` plus no `auto_capture_*` line after a session means the pass did not complete, not that your configuration is wrong; #404 found that mechanism and its fix is merged. On desktop this needs `opencode service restart` after an edit — relaunching the app keeps the old service and its already-parsed options alive.

## How memory is written

A memory is a claim about your code, so it gets checked like one. Four gates run before anything is stored, and each emits an ordered evidence line:

1. **GATE-1 — code references resolve.** Call signatures and paths embedded in the memory are checked against your live source tree.
2. **GATE-2 — no stale memory applies here.** References that drifted out of date are superseded or the write is blocked.
3. **GATE-3 — no duplicates.** Near-duplicates collapse into the existing row; a contradiction with a superseded memory is rejected.
4. **GATE-4 — promotion or block.** The row lands, or the call returns the reason.

Nothing is deleted. `memory_update` supersedes the old row and `memory_forget` records a retirement, so history stays readable, and `memory_undo` restores a snapshot when a change turns out wrong. `memory_update` picks its row by `query` — an id, a clock fragment such as `00:11:22.123`, or a unique substring of its text — and a query that matches nothing, or several rows, writes nothing and says so. What carries over to the new row, what a `PARTIAL` reply means for the rows on disk, and what promotion evidence samples: [docs/internals/write-gates.md](docs/internals/write-gates.md).

**Guided constants (#349 / #351, experimental).** You and the code disagree about a constant, and who is right depends on what you said: capture records whether you stated the required value (`spec` — you are the authority) or described how working code behaves (`behavior` — code is the authority), and the CONFLICT verdict follows that class. The verdict table, what the code check will read, and the accepted residual: [docs/internals/contradiction-authority.md](docs/internals/contradiction-authority.md).

## Repo scoping

Rows are stamped with your git origin (an id that survives re-clones and moves between machines) or, without an origin, a hash of the normalized directory path. Reads — injection, recall, the frontier block, compaction, `memory_forget` and decay — see the current repo plus global rows. Writes follow the stricter direction: a named session whose repository cannot be resolved has **no write target**, so `memory_remember`, `memory_update`, `memory_import` and auto-capture refuse it (evidence `write_refused`) rather than stamp your content into another workspace or publish it as an unstamped row. Preferences that should follow you everywhere go in with `memory_remember global: true`. Identity derivation and legacy hashes, evidence attribution when a session moves repositories mid-operation, and the viewer's separate admin seat: [docs/internals/repo-scoping.md](docs/internals/repo-scoping.md).

## What memory is worth, measured

Two results. Only two are quoted, each with its `n` and the seat it ran on, because the direction of an early finding flipped when the metric was corrected — see [#385](https://github.com/abogartz/opencode-self-improvement/issues/385) and [#392](https://github.com/abogartz/opencode-self-improvement/issues/392).

**The metric.** `work = session generation + capture generation`, with cache read and cache write reported separately and never folded into a total. Capture is a separate model call made after the turn, so it appears in no session's usage: a meter that reads session numbers alone reports this plugin's own cost as exactly zero. On the seat below `input` is only the **uncached remainder** — one run reported 13,393 of 187,856 tokens that actually moved, 7%.

| Result | n | Seat | What was measured |
| --- | --- | --- | --- |
| **Transport.** A fact learned in one session reaches a later session that provably cannot obtain it any other way | 5 per arm, with the empty-store floor verified first | `evo/Qwen3.8-Flash-Next-UD-Q4_K_XL`, local seat behind a recording proxy | empty store **0/5** (every failure: the artifact was never written), the same store seeded **5/5**. The fixture is leak-checked: no form of the answer is in any file the agent sees, including its own documentation |
| **Reuse.** A memory reduces the work on a task the agent already passes | 6 pairs | same seat | median of the six per-pair L2/L0 work ratios — sorted 0.54, 0.79, 0.84, 0.98, 1.06, 1.23, middle two averaged — **0.91×**, higher in 2 of 6, inside the pre-registered 0.80–1.25 band: **no measurable effect at 20% resolution**. A memory about an unrelated task: **0.99×**, same estimator, higher in 3 of 6 |

**What is not claimed here.** No token saving. No dollar figure. The seat above is a local box with no cache price; on a hosted provider a cache miss costs roughly 0.1× read and 1.25× write, which is a different claim and cannot be quoted from these numbers.

**Rules for any cost claim in this repository** — the published numbers live in `bench/claims.json`, and `test/host/claims.test.ts` enforces that file and this one in CI:

- No cost claim below **n=6 pairs per arm**. A ratio at `6 ≤ n < 21` is labelled **"20% resolution"**.
- A **seat** and a **metric** are named on the same line as the number.
- The word "cheaper" does not appear without those.
- An issue or PR body making a cost claim owes the same n, seat and metric. CI reads only this file, so that half is enforced by review.
- Nothing reproduces at n=1: the same arm on the same fixture, both runs passing, differed by more than 2× in tokens.
- Cache state is reported, never assumed. Two runs that start from different cache states are not a saving.

## Token cost and caching

Injecting memory costs prompt bytes, and prompt bytes are what a provider bills against. So the plugin treats the injected block like a cached HTTP response: it is recomputed only when the content the model is actually reading changes, and until then it is delivered byte-identically and served from cache.

- **The frozen bytes are the authority, not the store fingerprint.** A row promoted elsewhere in the store that changes nothing visible costs no cache bust. A memory *you* saved in this session is already in your own transcript, so it does not bust your cache either; a correction of a row you are riding, or anything another session, the viewer or an import wrote, still lands on your next request.
- **Two concepts, not one.** A free-text prompt must share at least two distinct concepts with a memory to be injected; one- and two-word queries need only one. Identifier spellings count once: `getUserAccount`, `get_user_account`, `get-user-account` and `get.user.account` are one concept rather than four ([#409](https://github.com/abogartz/opencode-self-improvement/issues/409)).
- **Things you said outright ride first.** A row auto-capture tagged `user-guided` — "the correct sales tax rate is 8.25%" — rides ahead of the lexical picks, newest-first, at most three, inside the budget. Only auto-capture mints the tag; `memory_remember`, updates and imports strip it, because always-riding priority is a poisoning amplifier.
- **Budgets are hard, receipts are real.** The block and each pull are capped at `injectBudget` characters, the frontier at `frontierBudget`, trimmed at whole-memory boundaries. The badge shows the provider's own `tokens.cache` accounting; a host that reports nothing shows nothing. Auto-capture is the one place with no receipt at all — it is its own call after the turn — so `memory_status` prints it as `receipt=none`, an estimate.

**Bench** — on a deterministic workload the shipped policy injects **12.3% fewer characters** than the naive policy, measured over the whole memory section: bytes on a synthetic run, not tokens and not a provider bill. The four-policy table, what the invalidation counter does and does not count, what the workload cannot show, and an author-reported provider audit (input tokens only, not a total and not a saving): [docs/internals/injection-cost.md](docs/internals/injection-cost.md). Reproduce the byte workload with `bun run bench`.

## Recall quality

No vector database, no embedding model, no API key: a keyword matcher. That is a trade, and here is the price, measured against classic BM25 on a deterministic eval (store of 200, k=3 — the production injection limit). **Bench**:

| Query, vs. the stored memory | share | R@1 | R@3 | with `kw` R@1 | with `kw` R@3 |
| --- | ---: | ---: | ---: | ---: | ---: |
| lexical — reuses your project's words | 46% | 98% | 98% | 98% | 98% |
| near — reworded, one overlap | 17% | 28% | 28% | 67% | 72% |
| strict — zero shared words | 37% | 0% | 0% | 26% | 26% |

"with `kw`" is the same matcher over the same store with each row's write-time keywords indexed; the only changed variable is the index.

- **Most in-project prompts are lexical** (`bun test`, "the rate limiter", "staging deploys"): 98–100% R@3, flat from store size 50 to 500.
- **A zero-overlap paraphrase is the real limit, and write time is where you answer it.** "How we deploy" will not match a session that types "ship to staging" unless you say so: `memory_remember` asks each row for 3–5 `kw` aliases — other names, other verb forms, the literal command — indexed and never rendered. Strict R@1 0% → 26%, near R@1 28% → 67%. Narrowed, not removed.
- **Exact keyword lookup.** In a long `memory_recall` query, one complete authored keyword can identify a single visible candidate. Automatic prompt injection still requires two shared concepts for long queries.
- **`memory_recall` returns 5 rows, not 20.** A live audit of 1,090 recall events found a rank-1 row used in a later tool call at 3.4x the rate of a random store row, and ranks 11–20 at 1.16x — noise. Pass `limit` for a wider sweep.

The abstain-by-design rule, the permutation control behind the `kw` numbers, and the eval's caveats — a synthetic dataset, an adversarial class mix, single-gold scoring: [docs/internals/recall-quality.md](docs/internals/recall-quality.md). Full methodology and all store sizes: `bench/recall-results.md`. Reproduce with `bun run bench:recall`.

## Write latency

A write that cites code references builds one tree index — a single recursive walk that prunes `node_modules` and VCS directories — shared by GATE-1 and GATE-2, and reads each source file at most once. **Bench** on a 5,300-file fixture: 17ms, 15ms and 20ms for 1, 3 and 5 embedded call forms, against 105ms, 136ms and 169ms for one scan per form. The shipped column is flat because the tree is walked once no matter how many references the write cites. The fixture, the table and `bun run bench:write`: [docs/internals/write-latency.md](docs/internals/write-latency.md).

## The store keeps score

The plugin keeps a use ledger — a due-date card for every row: who looked at it, when, and how it reached them. It is append-only, never ingested as a memory, and reported in `memory_status` and the `/memory` panel.

- **Use has three distinct sources** — the row rode the injected block, `memory_recall` returned it, or a grep/read pull appended it — because "the model asked" and "the harness offered" are different facts. No prompt content is stored: the ledger keeps a scan-truncated string from the *memory* side, never your message.
- **Reinforcement is a tie-break only** (`useBoost ≤ 1.0`): a recently used row wins a tie and can never outrank a real score gap.
- **`never retrieved` is stated, not acted on.** Pruning is your decision.
- **Aggregate STORE counts are machine-wide by decision (#213 B)** — they describe the store on this machine, not your slice of it. Privacy applies to the content surfaces instead: `memory_evidence` and the recent-blocked-writes list follow each reader's repository visibility (#306).

`memory_status` joins rides to later gate checks on the same turn. For example,
`used=5 clean=0 fail_after=2 unknown=2 (eviction candidate)` records five rides,
two distinct failing turns and two rides with unknown outcomes. Totals cover
the store; individual rows follow repository visibility. Check the underlying
memory before acting on a candidate. Gate failures alone cannot establish harm.

Sample `STORE` output, the credit rule and its throttle, the consolidation tie-break, and capture lag: [docs/internals/use-ledger.md](docs/internals/use-ledger.md).

## Consolidation

`memory_consolidate` finds near-duplicates and proposes merges. It writes nothing; each proposal prints the exact `memory_merge_review` call that resolves it, and resolving is supersede-not-delete.

The rule is: never merge two entries unless every question that used to find either one still finds the merged row.

- **Deterministic.** The canonical row is the survivor's prose verbatim plus the absorbed rows' aliases as keywords. No model rewrites anything.
- **Proven by recorded reads.** Every read the ledger recorded for a cluster is replayed against the merged store, and a merge is proposed only when the canonical row catches at least as many of the cluster's own reads as the best single member did alone. A cluster with no recorded reads is reported as *unmeasured* and never merged on resemblance.

**Bench** — on the eval dataset the pass takes 200 rows to 52 with **R@3 52 → 53 and R@1 52 → 50**, and store-wide injected characters 25 945c → 6 933c. Both the regression and the budget swap are bounded in CI (`test/consolidate/consolidate-bench.test.ts`).

## Secret redaction

One best-effort credential rule set (`src/secrets.ts`) replaces recognized values with `[redacted]`, and it runs at every boundary a credential could persist: the auto-capture prompt before it leaves the plugin, the write gate before content is hashed or analysed, the final write choke point used by gated writes and the viewer's edit and restore paths, and every durable audit line. Covered patterns, and the limits that matter — hex-only secrets and prose credentials it can miss, forward-only scrubbing, and the fact that deleting a row copies it rather than scrubbing it: [docs/internals/secret-redaction.md](docs/internals/secret-redaction.md).

## Export and move between machines

`memory_export` writes the store as JSONL **as its caller can read it**: from a plugin session that means your repository plus global rows. `memory_import` reads such a file back, and every imported row re-enters through the same four gates as `memory_remember` (tagged `import`, original tags preserved). Both tools are model-facing, so a path is not a privilege: it must stay inside the store, and a symbolic link cannot carry a request out of it. The reply is a tally — `promoted`, `collapsed`, `blocked`, `skipped`, `downgraded` — not a yes/no. The move step by step, the file format, the confinement limits and the quarantine screen: [docs/internals/export-import.md](docs/internals/export-import.md).

## Surfaces

Same data behind each one (`memory_status`; no model call): the terminal **footer badge** — the injected block against its budget plus the measured session prompt-cache hit rate, with the dot color telling you whether the cache is warm — the **`/memory`** session panel, **`/memory-report`** for chat clients where the terminal slots do not exist, and a loopback-only **browser editor** (`bun memory-view`). What each shows, the badge colors, and what binding the editor to a non-loopback host costs you: [docs/reference/surfaces.md](docs/reference/surfaces.md).

## Documentation

Every document under `docs/`, one line each with its audience and summary: [docs/README.md](docs/README.md). The accepted architecture decisions, with status and supersession: [docs/adr/README.md](docs/adr/README.md).

## Development

Nothing merges without the full gate; CI runs it as required checks (`lint`, `test`, `smoke`), and the same sequence is one command locally:

```sh
bun run gate          # typecheck + lint + unit tests + terminal smoke & BDD
bun run gate:hooks    # once per clone: run the gate on `git push`
bun run format        # apply the shared two-space TypeScript/TSX style
```

Use Bun **1.4.4** for development checks, matching CI. `bun run test` and `bun run test:e2e` run files across at most four worker processes; cases inside each file stay sequential because fixtures share environment variables and module state.

**Feature order is BDD-first.** A new feature starts by adding or fixing a scenario in `e2e/` that describes the behavior as a user would observe it — before implementation code and before unit tests. If no scenario turns red first, the feature has no observable contract. `e2e/` boots the **real opencode CLI** in a fully isolated instance against a scripted fake model — no API keys, no shared store. It needs `opencode` on `PATH` locally, or `OPENCODE_BIN`.

How the local commands map to CI job names, what the smoke suite really boots, why the published surface is decided by `package.json` `files`, and the pre-release mutation sweep with its artifact policy: [docs/internals/development.md](docs/internals/development.md) and [docs/internals/pre-release-ritual.md](docs/internals/pre-release-ritual.md).

## Layout

Two root files are shims, and both exist because OpenCode finds plugins two
different ways. **Loose plugin discovery** reads `<config>/plugins/<name>/index.ts`
and, next to it, a sibling `tui.ts` — so the repository root carries `index.ts`
(re-exporting `src/index.ts`) and `tui.ts` (re-exporting the default of
`src/tui/panel.tsx`). **Package installs** resolve through `package.json`
`exports` instead: `"."` → `./index.ts` and `"./tui"` → `./src/tui/panel.tsx`.
Real code lives under `src/`, one directory per module. Loose discovery installs
nothing, so run `bun install` inside the copied directory: the plugin has runtime
dependencies, and one that cannot be resolved fails the load with an error about
the default export rather than the missing package
([#464](https://github.com/abogartz/opencode-self-improvement/issues/464)).

## Troubleshooting

The whole list, one row per problem with its fix, is in [docs/reference/troubleshooting.md](docs/reference/troubleshooting.md): tools not available, a load error that blames the default export when a dependency is missing, a blocked `memory_remember`, an argument-schema rejection, `memory store is busy`, a store on a network share, a stale plugin after an update, auto-capture doing nothing, malformed rows, stray lock files, a missing `/repo-init`, and a clean reset on Windows.
