# Opencode-Self-Improvement

Durable memory for [opencode](https://opencode.ai): the decisions, commands and facts an agent should keep across sessions, plus a one-command per-repo setup.

Every memory passes four write gates, injection is budgeted and cache-stable, and nothing is ever deleted — updates supersede and `memory_undo` rolls back.

Every figure in this README carries a provenance marker: **measured** (read off a live store), **bench** (a deterministic synthetic workload, reproducible with the command printed under the table), or **illustrative** (sample output showing shape, not a measurement). A number without a marker is a claim that has not been checked.

## Quick start

**1. Add the plugin** to `~/.config/opencode/opencode.jsonc` (global) or a project `opencode.jsonc`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-self-improvement"]
}
```

**2. Restart opencode.** It installs the package and its dependencies at startup, and the plugin installs its own slash commands. On desktop, a later config edit needs `opencode service restart`: relaunching the app leaves the background service — and the plugin options it already parsed — alive.

**3. Run `/repo-init`** in each repo you work in. It indexes the code graph, stores the test / build / lint / typecheck commands as memories, and writes an init stamp tied to the current git head. Rerun `/repo-init force` after a refactor.

Needs Bun 1.3.0 or newer in the opencode build (the tested floor); older Bun reports a startup warning.

On opencode v2 the CLI works too:

```sh
opencode plugin add opencode-self-improvement
opencode plugin update opencode-self-improvement
```

After that, memory is just conversation: ask the agent to remember something and it sticks.

## What you get

- **`memory_*` tools** — `memory_init`, `memory_remember`, `memory_recall`, `memory_update`, `memory_forget`, `memory_list`, `memory_undo`, `memory_status`, `memory_evidence`, `memory_export`, `memory_import`, `memory_decay`, `memory_consolidate`, `memory_merge_review`.
- **`/repo-init`** — per-repo setup: code graph index plus build/test commands, keyed to the git head.
- **Write gates** — code references are verified against your actual repo, near-duplicates are collapsed, contradictions with superseded memories are rejected. Blocked writes are logged with a reason in `memory_evidence`, which reads one real calendar day inside `evidence/` at a time — its `date` is a date, never a path.
- **Memory-aware compaction** — durable memories are handed to the compaction summarizer, so a long session keeps its facts.
- **Auto-capture (experimental, opt-in)** — in progress and **not working yet**. The design: on the turn-end and compaction triggers, one cheap model pass per trigger proposes candidates, which face the same write gates, with a 5-minute cooldown per session and trigger bounding the spend. What is not true today: it has never been observed firing on a live opencode 2.x store, so enabling it may cost model calls and store nothing. See [Auto-capture is experimental](#auto-capture-is-experimental).
- **Repo scoping** — rows belong to the repo that wrote them; project A's facts never surface in project B.
- **Safe across concurrent sessions** — whole-file rewrites hold a per-file lock honored across processes and hand the new file over with an atomic rename.
- **Decay** — `memory_decay` retires stale open threads. Dry run by default, snapshot-first, undoable.
- **Consolidation** — `memory_consolidate` proposes near-duplicate merges, and only when replaying the store's own use ledger shows the merged row catches at least as many reads as the best single member. It writes nothing.
- **Export / import (JSONL)** — back the store up or move it between machines; every imported row re-enters through the write gates.
- **Surfaces** — a terminal footer badge and `/memory` panel, `/memory-report` for chat clients, a `memory_status` tool, and a browser admin editor. See [Surfaces](#surfaces).
- **Secret redaction** — credential-shaped values in content become `[redacted]`. See [Secret redaction](#secret-redaction).

Memory is stored outside every repository, under `~/.config/opencode/memory` by default (override with `OPENCODE_MEMORY_DIR`). To start over, delete that directory.

## Options

Zero configuration is the default. To tune, use the object form of the plugin entry in `opencode.json(c)`:

```json
{
  "plugins": [{ "package": "opencode-self-improvement", "options": { "injectBudget": 1200, "frontierBudget": 3600 } }]
}
```

| Option | Default | What it does |
| --- | --- | --- |
| `injectBudget` | `1200` | Character cap on the injected relevance block and each contextual pull; trimmed at whole-memory boundaries. Env fallback: `OPENCODE_MEMORY_INJECT_BUDGET`. |
| `frontierBudget` | `3 × injectBudget` | Character cap on the session-start open-threads block. A thread longer than the budget is not injected and is reported as omitted. Env fallback: `OPENCODE_MEMORY_FRONTIER_BUDGET`. |
| `autoCapture` | `false` | Master switch for auto-capture, which is **experimental and has never fired on a verified live store** — see [Auto-capture is experimental](#auto-capture-is-experimental). Off by default, so the install stays zero-token. |
| `captureModel` | — | `"provider/id"` model used for auto-capture. Required when `autoCapture` is on; missing or invalid disables capture with a startup warning. |
| `captureMax` | `3` | Maximum candidates proposed per capture pass. |
| `captureOnCompact` | `true` | When `autoCapture` is on, also mine the transcript at compaction, before the summarizer replaces it. Its 5-minute cooldown is separate from the turn-end one, so the two triggers' hit-rates stay measurable. Setting it while `autoCapture` is off does nothing and reports a startup warning. |
| `notifyBlocked` | `true` | Terminal (TUI) only: toast when a write gate blocks a write. Blocks are always in `memory_evidence` either way. |

### Environment variables

| Variable | Purpose |
| --- | --- |
| `OPENCODE_MEMORY_DIR` | Store location (default `~/.config/opencode/memory`). |
| `OPENCODE_MEMORY_ALLOW_OUTSIDE_PATHS` | Operator-only. When truthy, `memory_export`/`memory_import` accept paths anywhere on disk instead of confining themselves to the store. Off by default. See [Export and move between machines](#export-and-move-between-machines). |
| `OPENCODE_MEMORY_INJECT_BUDGET` | Fallback for `injectBudget`. |
| `OPENCODE_MEMORY_FRONTIER_BUDGET` | Fallback for `frontierBudget`. |
| `OPENCODE_COMMANDS_DIR` | Where the plugin mirrors its slash commands (default `~/.config/opencode/commands`). |
| `OPENCODE_CBM_BIN` | Path to a `codebase-memory-mcp` binary. See [Code graph](#code-graph-optional). |
| `OPENCODE_VIEWER_PORT` | Admin editor port (default `8787`). |
| `OPENCODE_VIEWER_ALLOWED_HOSTS` | Comma-separated hosts beyond loopback. See [Surfaces](#surfaces). |

## Auto-capture is experimental

**Status: in progress, and not working yet.** Auto-capture has never been observed firing on a live opencode 2.x store. It is shipped behind `autoCapture` because the plumbing is finished — the trigger, the model pass, the gates, the cooldown — not because the outcome has been verified. Treat it as a switch that may cost model calls and store nothing.

What is established, from tests and fixtures (no live store involved):

- **The trigger events are ones the host actually emits.** Capture subscribes to `session.execution.succeeded` and `session.execution.interrupted`, the two turn-end events present in a recording of the desktop service (`test/fixtures/host-events.jsonl`). `session.idle`, `session.status` and `session.execution.failed` are *declared* by the host but absent from that recording, so they deliberately do not trigger capture; `test/event-fidelity.test.ts` refuses a trigger that is only declared. An earlier revision subscribed to `session.idle` and stayed silent for days with no signal — reading a declared event as an emitted one is the failure that fixture exists to prevent.
- **The path runs under simulated host traffic** — unit tests hand the plugin the recorded envelopes and assert a candidate lands through the write gate, including conservation (a near-duplicate collapses at the gate instead of writing a second row): `test/capture.test.ts`, `test/capture-compaction.test.ts`. No terminal e2e scenario covers the trigger, so the simulated envelope is the strongest evidence that exists — and fabricating the envelope is exactly what passed while this feature was dead.

What is not established:

- That a live host emits those events in the shape the subscription reads, end to end. No `auto_capture_*` line and no `capture_lag` line exists anywhere in the maintainer's evidence history (checked 2026-10-26 through 2026-10-29); a live trial armed on 2026-10-26 was stood down on 2026-10-29 without ever firing, so it answered nothing.
- Anything about quality. What auto-capture would write, how often it duplicates a memory you would have written yourself, and what it costs remain unmeasured. `bench/capture-trigger-results.md` is a **bench** simulation of trigger *timing* with a scripted extractor — its compaction world captured 0 rows and 4 of its 6 controls report FAIL. It answers "which moment is worth mining", not "does the shipped feature work".

**Am I armed?** `memory_evidence` answers on the `plugin_load` line: `capture=off` (the option is not on), `invalid_model` (`captureModel` is not `provider/id`), `no_capabilities` (the host did not expose what capture needs) or `capture=on`, next to `subscribed=[…]` listing the event types that subscription really reacts to. On desktop this needs `opencode service restart` after an edit — relaunching the app keeps the old service and its already-parsed options alive, so `capture=` can report a value your config no longer contains. `capture=on` plus no `auto_capture_*` line after a session is the open bug, not your configuration.

## How memory is written

Promotion evidence keeps a bounded sample of call IDs: the ten most recent code-engagement calls, plus the latest gate check, the latest recorded gate FAIL/fix/PASS recovery, and the latest recorded tool FAIL/PASS retry (at most 16 distinct IDs). `evidence_refs_count` is the total number of recorded session calls before sampling, including non-code tools; the sampled IDs are audit pointers, not a complete history. Grounding and memory attribution still use the full in-memory ledger. Existing evidence day-files are left unchanged: this upgrade does not backfill, compact, or delete historical audit records.

Four gates run before anything is stored, and each emits an ordered evidence line:

1. **GATE-1 — code references resolve.** Call signatures and paths embedded in the memory are checked against your live source tree.
2. **GATE-2 — no stale memory applies here.** References that drifted out of date are superseded or the write is blocked.
3. **GATE-3 — no duplicates.** Near-duplicates collapse into the existing row; a contradiction with a superseded memory is rejected.
4. **GATE-4 — promotion or block.** The row lands, or the call returns the reason.

Nothing is deleted: `memory_update` supersedes the previous row, `memory_forget` records a retirement, and `memory_undo` restores a snapshot. `memory_update` takes a `query` that picks the row — its id, a clock fragment such as `00:11:22.123`, or a unique substring of its text. Omit it to update the newest entry of that scope and type. A `query` that matches nothing, or several rows, writes nothing and says so. A prose edit changes only the prose: the row's tags, issue link, retrieval keywords, open/settled standing, and repository all carry over to the new row — updating a `global` row from one machine keeps it global for every other. Naming a row an earlier update already superseded reports the duplicate when the live successor already holds that exact content; when only the metadata you name differs, the update runs against the successor instead of dead-ending. And a failure after the new row is durable is reported as `PARTIAL` — the message names what failed, the replacement stands on disk, and `memory_undo` (merge or force) brings the old row back.

## Repo scoping

Rows are stamped with your git origin (an id that survives re-clones and moves between machines) or, without an origin, a hash of the normalized directory path. `repoPath` keeps the human-readable path, so rows written before hashing keep matching.

Injection, recall, the frontier block, compaction, `memory_forget` and decay only see the current repo plus global rows, resolved from the calling session's identity at flow entry. A session that reaches a plugin instance is bound to that instance's own workspace on first contact — in a process hosting several workspaces, one session never borrows the repository some other workspace's setup left behind. A session whose repository cannot be resolved at all sees global rows only; "unknown" is never "everything". Writes follow that rule in the stricter direction: a named session with no resolved repository has **no write target**, so `memory_remember`, `memory_update`, `memory_import` and auto-capture refuse it (evidence `write_refused`) and store nothing — the alternatives were stamping your private content into whichever workspace's `setup()` ran last, or publishing it to every project as an unstamped row. A caller that names no session at all (the viewer process, a restore, a script) keeps the process scope, and an explicit `global: true` is a deliberate owner. Evidence lines carry the same stamp, so `memory_evidence` answers from the caller's repo plus global lines; a line a named session wrote while its repository was unresolvable is private to that session, and only an explicitly global (or predating-stamps) line reads as global. Preferences that should follow you everywhere go in with `memory_remember global: true`. Rows written before scoping existed are global, and the viewer (an admin surface over every repo) edits and restores a row with its own repo stamp — the viewer's missing session scope never decides a row's visibility. `memory_merge_review` applies the same rule to its inputs: a session may merge exactly the rows it may read — global rows plus its own repo's, from either seat — and a row id it merely knows is not authority to retire another repo's memory. Upgrading changes nothing.

## Token cost and caching

- **Section-frozen injection.** The whole memory section — standing digest, open-thread frontier, relevance block — is computed once per epoch and delivered byte-identically until something the model actually needs changes. The epoch's authority is the **rendered bytes**, not the store fingerprint: a promoted row that changes nothing visible costs no cache bust.
- **A session never pays for bytes it is not riding.** A memory *you* saved in this session is a fact you already produced — it is in your own transcript — so it never busts your cache. The test is not "did the store change" but "would the frozen bytes still have been produced from the same inputs, minus the rows this session authored since": a correction, blocklisting, redaction or supersession of a row you are riding, and anything another session, the viewer or an import wrote, all still land on your next request.
- **Two-concept threshold.** A free-text prompt must share at least two distinct concepts with a memory for it to be injected; keyword-length queries (one or two words) need only one. Silence on single-word coincidences is deliberate; `memory_recall` still reaches them on the pull path.
- **Hard budgets.** Relevance block and each pull are capped at `injectBudget` characters, the frontier at `frontierBudget`, trimmed at whole-memory boundaries.
- **Nothing volatile on the cached prefix.** The standing digest carries no row count and no latest timestamp. Both used to ride the very front of the system prompt, so every saved memory rewrote the prefix and made the next request re-bill the whole conversation; the exact numbers now live where they are free — the footer badge, `/memory`, `memory_status`, the viewer.
- **Evidence is never injected**, and the standing system digest is two lines.
- **Measured, not claimed.** The plugin reads each turn's `tokens.cache` accounting and displays the actual hit rate next to the badge.

**Bench** — deterministic workload (50 memories, 20 prompts, 3 mid-session store writes made *by the measured session*) through the plugin's real injection code. Every column is measured on the full memory section — the bytes a request actually sends — because prompt caching is a property of those bytes:

| Policy | Recomputes | Cache busts | Injected chars (20 turns) | Avg/turn | Worst section |
| --- | ---: | ---: | ---: | ---: | ---: |
| A — recompute per prompt, uncapped (naive) | 20 | 19 | 60996 | 3049.8 | 3404 |
| B — block frozen on store fingerprint, digest rebuilt per turn | 4 | 3 | 55478 | 2773.9 | 2867 |
| C — section frozen on rendered bytes | 4 | 3 | 55258 | 2762.9 | 2856 |
| D — C + riding bytes (shipped) | 1 | 0 | 53500 | 2675.0 | 2675 |

A "cache bust" is a turn whose memory-section bytes differ from the turn before — each one re-bills the entire conversation as fresh input. All three synthetic writes change what the session is shown, so B and C each pay for them; D pays nothing, because the session wrote them itself. What D still pays for is a riding row being corrected, blocklisted or redacted, or another session writing a row — that half of the contract is pinned by `test/epoch.test.ts` rather than by this table, since a benchmark that only writes never exercises it. D also injects 12.3% fewer characters than the naive policy — the denominator here is the whole section, not the relevance block alone, so it is not comparable with the block-only figure this README quoted before. Reproduce (byte-identical output):

```sh
bun run bench
```

## Recall quality

No vector database, no embedding model, no API key. **Bench** — what the keyword matcher gives up, measured against classic BM25 on a deterministic eval (store of 200, k=3 — the production injection limit):

| Query, vs. the stored memory | share | R@1 | R@3 | with `kw` R@1 | with `kw` R@3 |
| --- | ---: | ---: | ---: | ---: | ---: |
| lexical — reuses your project's words | 46% | 98% | 98% | 98% | 98% |
| near — reworded, one overlap | 17% | 28% | 28% | 67% | 72% |
| strict — zero shared words | 37% | 0% | 0% | 26% | 26% |

"with `kw`" is the same matcher over the same store with each row's write-time keywords indexed; the only changed variable is the index.

- **In-project prompts are overwhelmingly lexical** (`bun test`, "the rate limiter", "staging deploys"): 98–100% R@3, flat from store size 50 to 500.
- **Single-overlap guessing was traded away.** Free-text prompts that share one concept abstain rather than force a guess; wrong top-memory fell to 6%. `memory_recall` still covers them.
- **Zero-overlap paraphrase is the real limit, and write time is where it is answered.** `memory_remember` asks each row for 3–5 `kw` aliases (other names, other verb forms, the literal command); auto-capture asks for the same list, so these numbers are measured through the tool path rather than through capture. Keywords are indexed and never rendered. Strict R@1 0% → 26%, near R@1 28% → 67%. A permutation control (every row given someone else's aliases) scores 29%/35%, so the gain is meaning rather than extra tokens. The limit is narrowed, not removed.
- **Caveats.** The dataset is synthetic (52 memories / 105 queries, a fictional project), its class mix is deliberately adversarial, and scoring is single-gold.

Full methodology and all store sizes: `bench/recall-results.md`.

```sh
bun run bench:recall
```

## Write latency

A write that cites code references builds one tree index — a single recursive walk that prunes `node_modules` and VCS directories — shared by GATE-1 and GATE-2, and reads each source file at most once. **Bench** — measured on a 5,300-file fixture (300 sources + 5,000 `node_modules` decoys), scope seeded with 5 embedded call forms:

| Call forms in the write | Shipped | One scan per form |
| --- | ---: | ---: |
| 1 | 17ms | 105ms |
| 3 | 15ms | 136ms |
| 5 | 20ms | 169ms |

The shipped column is flat: the tree is walked once no matter how many references the write cites.

```sh
bun run bench:write
```

## The store keeps score

The plugin keeps a **use ledger** (`<memory-root>/hits.logfmt`, append-only, rotated at 2 MB, never ingested as a memory) and reports it in `memory_status` and the `/memory` panel. Illustrative output — shape, not a measurement:

```
STORE
  41 active · 12 superseded · 4 open · 6 scopes
  retrieved 33 rows in the last 30d; never retrieved 8 (20%) — reported, not acted on
  24.1 KB total · 604 B per row · 1.3 rows/day (30d)
```

- **Credit comes from three distinct sources** — the row rode the injected block, `memory_recall` returned it, or a grep/read pull appended it — because "the model asked" and "the harness offered" are different facts. Credit requires ≥2 shared terms with the query and is throttled to one line per memory per session per source per hour.
- **No prompt content is stored.** The ledger keeps a scan-truncated string from the *memory* side, never your message.
- **Reinforcement is a tie-break only** (`useBoost ≤ 1.0`): a recently used row wins a tie and can never outrank a real score gap. In consolidation the most recently used member of a cluster is never the merge loser.
- **`never retrieved` is stated, not acted on.** Pruning is your decision. Retired rows cannot inherit reinforcement: ledger rows are verified against the store on read.
- **Capture lag** is how stale the newest message was when auto-capture fired. The line prints only when at least one `capture_lag` sample exists, which needs auto-capture to have fired — see [Auto-capture is experimental](#auto-capture-is-experimental).

## Consolidation

`memory_consolidate` finds near-duplicates and proposes merges. It writes nothing; each proposal prints the exact `memory_merge_review` call that resolves it, and resolving is supersede-not-delete.

- **Deterministic.** The canonical row is the survivor's prose verbatim plus the absorbed rows' aliases as keywords. No model rewrites anything.
- **Proven by recorded reads.** Every read the ledger recorded for a cluster is replayed against the merged store, and a merge is proposed only when the canonical row catches at least as many of the cluster's own reads as the best single member did alone. A cluster with no recorded reads is reported as *unmeasured* and never merged on resemblance.

**Bench** — on the eval dataset the pass takes 200 rows to 52 with **R@3 52 → 53 and R@1 52 → 50**, and store-wide injected characters 25 945c → 6 933c. Both the regression and the budget swap are bounded in CI (`test/consolidate-bench.test.ts`).

## Secret redaction

One best-effort credential rule set (`src/secrets.ts`) runs over the auto-capture prompt before it leaves the plugin — redacting the complete transcript before the character budget crops it, so a credential cut in half by the window still matches its pattern — at the write gate before content is hashed or analysed, again in the final write choke point used by gated writes and the viewer's edit and restore paths, and at the durable audit boundaries — every evidence line, every supersede field written into a retired row, and every deletion-audit reason — so a recognized credential cannot persist in `evidence/` or `deletions.logfmt` or a tombstoned row regardless of which path carried it.

Covered: OpenAI `sk-`, GitHub `ghp_` / `gho_` / `github_pat_`, Slack `xoxb-` / `xoxp-`, AWS `AKIA`, Google `AIza`, bearer tokens containing digits, PEM private-key blocks, and high-entropy values assigned to names ending in `_KEY`, `_TOKEN`, `_SECRET` or `_PASSWORD` (plus `password`).

Limits worth knowing:

- It can miss hex-only secrets, low-diversity passwords, and credentials written in prose without an assignment.
- Credential-shaped `scope`, `tags` or `issue` metadata is rejected rather than silently rewritten.
- `memory_remember` still replies `Remembered` when content was redacted, so the stored text can differ from what was sent.
- Redaction is forward-only: existing stores are not scrubbed, and `memory_export` writes what is already stored verbatim.

## Export and move between machines

`memory_export` writes the live store **as its caller can read it** as JSONL: from a plugin session that means its own repository plus global rows; full-store breadth belongs to a session-less caller outside the plugin (the library route — the viewer has no export route). The format is a machine-readable header line (`{_export, version, exportedAt, count}`) followed by one JSON object per line (`{ts,type,scope,content,status,tags,issue}`), active rows only. `memory_import` reads such a file back. Default path is `<memory-root>/exports/<timestamp>-<unique>.jsonl` — a unique name created exclusively, so two exports in the same second never replace each other's artifact; `file` must name a path **inside the store** - exports under `<memory-root>/exports` (a relative path resolves against it), imports anywhere under `<memory-root>` - and `scope` exports a single scope.

Both tools are model-facing, so a path is not a privilege: an export cannot write to `~/.gitconfig` or anywhere else outside the store, and an import cannot read outside it. Symbolic links are resolved before the check — including an `exports/` directory that is itself a link — so a link cannot carry a request out of the store. Exports are written `0600` and opened `O_NOFOLLOW` (both POSIX; on Windows the check before the write is the only guard). (Hardlinks are beyond any path check: a link planted inside `exports/` shares an inode with its target. That, and a narrow window on intermediate path components, are the boundary's known limits.) To move a store between machines, copy the file in:

```
Export my memories                              # -> <memory-root>/exports/<timestamp>-<unique>.jsonl
# …copy that file to the other machine's <memory-root>/…
Import <memory-root>/memories.jsonl             # memory_import
```

An operator running a one-off migration can restore the old anywhere-on-disk behavior with `OPENCODE_MEMORY_ALLOW_OUTSIDE_PATHS=1`. It is read from the plugin process's own environment, so a model cannot grant it to itself through a tool argument.

Every imported row re-enters through the same four gates as `memory_remember` (tagged `import`, original tags preserved), and the tool reports a tally:

| Outcome | Meaning |
| --- | --- |
| `promoted` | passed the gates and was stored |
| `collapsed` | near-duplicate of an existing memory; nothing written |
| `blocked` | rejected by a gate; reason in `memory_evidence` |
| `skipped` | malformed line; never reached the gates |
| `downgraded` | imported as settled because its `status:"open"` could not be vouched for |

An open row is exempt from reference grounding, so that status is honored only for files carrying an export header. Even with a header: an open row claiming `repo:"global"` is downgraded, and imported `repo` / `repoPath` stamps are kept only when they match the importing session's current repo — foreign stamps are dropped and the row is stamped for the importing repo. Re-running the same import in the same repo is a no-op.

## Surfaces

Same data behind each one (`memory_status`; no model call).

**Terminal (opencode CLI)** — the plugin ships a TUI half (`@opencode/plugin/tui`) that loads automatically:

- **Footer badge** — illustrative `● mem 1157/1200c · cache 96%`: the injected block against its budget, plus the measured session prompt-cache hit rate. The dot is green (stable and warm), yellow (recent recompute, or 50–90% reads) or red (last turn served almost nothing from cache); `—` until the first assistant turn, and `—` throughout on a provider that reports no cache usage.
- **`/memory`** — session panel: **CONTEXT** (chars and estimated tokens riding now, % of budget, the full memory section riding the prompt — digest + frontier + block — requests this epoch has ridden, session totals, abstentions), **CACHE** (busts this session and the measured cache-served share of prompt tokens), **INJECTED BLOCK** (the verbatim block, or an explicit abstention), **RECENT BLOCKED WRITES** (with gate reasons), **STORE** (active / superseded / open / scopes, plus `malformed` when a row's `ts` is not a valid ISO instant — those rows are skipped by every reader). Keys: `r` refresh, `f` fullscreen.
- **Block toast** when a write is refused (`"notifyBlocked": false` to silence).

**Desktop / web / IDE** — the terminal slots do not exist there, so use the self-installed **`/memory-report`** chat command: the same sections rendered in the conversation.

**Browser editor** — `bun memory-view`, then http://127.0.0.1:8787. Bound to loopback; requests are checked against `Host` and `Origin`, so other hosts must be listed explicitly in `OPENCODE_VIEWER_ALLOWED_HOSTS`. Listing a non-loopback host serves the store over plain HTTP with no authentication — only do it on a network you control.

## Code graph (optional)

`/repo-init` also indexes the repo into a queryable knowledge graph via [`codebase-memory-mcp`](https://github.com/DeusData/codebase-memory-mcp), pinned to `0.11.0` as an optional dependency. A copy already on your `PATH` is used instead; override with `OPENCODE_CBM_BIN=/path/to/codebase-memory-mcp`. Install the pinned binary globally if you prefer:

```sh
curl -fsSL https://raw.githubusercontent.com/DeusData/codebase-memory-mcp/main/install.sh | bash
```

When no graph binary is available, `/repo-init` still records scripts and the init stamp.

## Installing a specific version

An unpinned entry resolves `@latest` exactly once and is never re-resolved afterwards, so updates are deliberate: `opencode plugin update opencode-self-improvement`. To pin, append `@<version>` — see [npm](https://www.npmjs.com/package/opencode-self-improvement) for what is current.

<details>
<summary>Install from a clone (development)</summary>

```sh
git clone https://github.com/abogartz/opencode-self-improvement.git
cd opencode-self-improvement
bun install
```

Then point the `plugins` entry at the local file instead:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["/full/path/to/opencode-self-improvement/index.ts"]
}
```

After changes, `git pull` and restart opencode.

</details>

## Development

Nothing merges without the full gate; CI runs it as required checks (`lint`, `test`, `smoke`), and the same sequence is one command locally:

```sh
bun run gate          # typecheck + lint + unit tests + terminal smoke & BDD
bun run gate:hooks    # once per clone: run the gate on `git push`
```

Use Bun **1.4.4** for development checks, matching CI. `bun run test` and `bun run test:e2e` run files across at most four worker processes with Bun's file isolation; cases inside each file stay sequential because fixtures share environment variables and module state. The local gate uses those same scripts. To diagnose order-dependent failures in the original shared-process mode, run `bun test ./test/` or `bun test ./e2e/ --timeout 240000` directly.

**Feature order is BDD-first.** A new feature starts by adding or fixing a scenario in `e2e/` that describes the behavior as a user would observe it — before implementation code and before unit tests. Then the unit tests for the pieces, then the code until everything is green. If no scenario turns red first, the feature has no observable contract.

`e2e/` boots the **real opencode CLI** against each candidate in a fully isolated instance (fresh config, fresh db, fresh memory store, empty `HOME`) driven by a scripted OpenAI-compatible fake model — no API keys. It covers loading from the source tree and from the packed npm artifact installed runtime-deps-only, plus BDD flows for remember, recall, exact and near duplicates, ungrounded claims, and forget. Needs `opencode` on `PATH` locally, or set `OPENCODE_BIN`. A `test-windows` leg also runs the suite on Windows; it reports without gating merges.

## Troubleshooting

| Problem | Fix |
| --- | --- |
| `memory_*` tools not available | The plugin didn't load. Restart opencode and check the `plugins` entry in your config. |
| `memory_remember` says blocked | A gate rejected the write: a stale code reference, a cited path that doesn't exist in the repo, overlap with a superseded memory, or an ambiguous claim. The reason is in `memory_evidence`; rephrase against current code and retry. |
| `invalid arguments to memory_*` | The call didn't match the tool's input schema; nothing was done and the message names the offending fields. Gate blocks look different (`blocked at GATE (…)`). |
| STORE shows `N malformed` | A daily file has a `ts=` that is not a valid ISO instant (typically a hand-edit). Every reader skips those rows; fix the `ts=` or restore the file with `memory_undo`. |
| `memory store is busy` | Another session or the viewer held that store file for over 5s. Ordinary writes proceed anyway; only `memory_undo` and the viewer's restore refuse, because a forced rollback under a live writer would drop rows. Retry. A lock left by a killed process is taken over after 10s. |
| Stray `*.logfmt.lock` or `*.tmp` in the store | Write bookkeeping; safe to delete while nothing is writing. |
| `/repo-init` missing from the command list | The self-install couldn't write to `~/.config/opencode/commands/`. Create it and restart, or ask the model to "init memory for this repo" — the same tool. |
| Init says `Graph: unavailable` | `codebase-memory-mcp` couldn't start. Install pinned `0.11.0` or point `OPENCODE_CBM_BIN` at the binary. Scripts are still remembered without it. |
| Stale plugin after an update | `opencode plugin update opencode-self-improvement` (or bump the pinned `@version` in the `plugins` entry) and restart opencode. On desktop use `opencode service restart`: relaunching the app leaves the background service — and the plugin version and options it already parsed — alive. |
| `Error: Plugin is not configured` right after `plugin add` | An opencode bug ([#54654](https://github.com/anomalyco/opencode/issues/54654)), not a config problem: the first `plugin list/check/update` against a cold background service reads the plugin inventory before activation finishes. The plugin is installed and loading — just run the command again. |
| Auto-capture does nothing | Auto-capture is **experimental and has never fired on a verified live store** — see [Auto-capture is experimental](#auto-capture-is-experimental). `memory_evidence` says which case you are in from the `plugin_load` line: `capture=off` (option not on), `invalid_model` (`captureModel` must be `provider/id`; a bad one disables capture with a startup warning), `no_capabilities` (host did not expose what capture needs), or `capture=on`. `captureOnCompact` alone does nothing. `capture=on` with no `auto_capture_*` line after a session is the open bug, not your config. Rejected candidates log as evidence, not errors. On desktop, changing any of these options needs `opencode service restart`. |
| Reset all memories | Delete `~/.config/opencode/memory/`. |
