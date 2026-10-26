# Opencode-Self-Improvement

Durable memory for [opencode](https://opencode.ai): the decisions, commands and facts an agent should keep across sessions, plus a one-command per-repo setup.

Every memory passes four write gates, injection is budgeted and cache-stable, and nothing is ever deleted — updates supersede and `memory_undo` rolls back.

## Quick start

**1. Add the plugin** to `~/.config/opencode/opencode.jsonc` (global) or a project `opencode.jsonc`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-self-improvement"]
}
```

**2. Restart opencode.** It installs the package and its dependencies at startup, and the plugin installs its own slash commands.

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
- **Write gates** — code references are verified against your actual repo, near-duplicates are collapsed, contradictions with superseded memories are rejected. Blocked writes are logged with a reason in `memory_evidence`.
- **Memory-aware compaction** — durable memories are handed to the compaction summarizer, so a long session keeps its facts.
- **Auto-capture (opt-in)** — on the idle and compaction triggers, one cheap model pass proposes candidates, which face the same write gates. Off by default.
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
| `autoCapture` | `false` | Master switch for auto-capture. Off by default, so the install stays zero-token. |
| `captureModel` | — | `"provider/id"` model used for auto-capture. Required when `autoCapture` is on; missing or invalid disables capture with a startup warning. |
| `captureMax` | `3` | Maximum candidates proposed per capture pass. |
| `captureOnCompact` | `true` | When `autoCapture` is on, also mine the transcript at compaction, before the summarizer replaces it. Setting it while `autoCapture` is off does nothing and reports a startup warning. |
| `notifyBlocked` | `true` | Terminal (TUI) only: toast when a write gate blocks a write. Blocks are always in `memory_evidence` either way. |

### Environment variables

| Variable | Purpose |
| --- | --- |
| `OPENCODE_MEMORY_DIR` | Store location (default `~/.config/opencode/memory`). |
| `OPENCODE_MEMORY_INJECT_BUDGET` | Fallback for `injectBudget`. |
| `OPENCODE_MEMORY_FRONTIER_BUDGET` | Fallback for `frontierBudget`. |
| `OPENCODE_COMMANDS_DIR` | Where the plugin mirrors its slash commands (default `~/.config/opencode/commands`). |
| `OPENCODE_CBM_BIN` | Path to a `codebase-memory-mcp` binary. See [Code graph](#code-graph-optional). |
| `OPENCODE_VIEWER_PORT` | Admin editor port (default `8787`). |
| `OPENCODE_VIEWER_ALLOWED_HOSTS` | Comma-separated hosts beyond loopback. See [Surfaces](#surfaces). |

## How memory is written

Four gates run before anything is stored, and each emits an ordered evidence line:

1. **GATE-1 — code references resolve.** Call signatures and paths embedded in the memory are checked against your live source tree.
2. **GATE-2 — no stale memory applies here.** References that drifted out of date are superseded or the write is blocked.
3. **GATE-3 — no duplicates.** Near-duplicates collapse into the existing row; a contradiction with a superseded memory is rejected.
4. **GATE-4 — promotion or block.** The row lands, or the call returns the reason.

Nothing is deleted: `memory_update` supersedes the previous row, `memory_forget` records a retirement, and `memory_undo` restores a snapshot. `memory_update` takes a `query` that picks the row — its id, a clock fragment such as `00:11:22.123`, or a unique substring of its text. Omit it to update the newest entry of that scope and type. A `query` that matches nothing, or several rows, writes nothing and says so.

## Repo scoping

Rows are stamped with your git origin (an id that survives re-clones and moves between machines) or, without an origin, a hash of the normalized directory path. `repoPath` keeps the human-readable path, so rows written before hashing keep matching.

Injection, recall, the frontier block, compaction, `memory_forget` and decay only see the current repo plus global rows. Preferences that should follow you everywhere go in with `memory_remember global: true`. Rows written before scoping existed, and rows restored through the viewer, are global — upgrading changes nothing.

## Token cost and caching

- **Epoch-frozen injection.** The relevance block is computed once per epoch — first prompt of a session, a change to the store, or a compaction — and stays byte-identical in between, so the provider's prompt cache survives ordinary turns.
- **Two-concept threshold.** A free-text prompt must share at least two distinct concepts with a memory for it to be injected; keyword-length queries (one or two words) need only one. Silence on single-word coincidences is deliberate; `memory_recall` still reaches them on the pull path.
- **Hard budgets.** Relevance block and each pull are capped at `injectBudget` characters, the frontier at `frontierBudget`, trimmed at whole-memory boundaries.
- **Evidence is never injected**, and the standing system digest is two lines.
- **Measured, not claimed.** The plugin reads each turn's `tokens.cache` accounting and displays the actual hit rate next to the badge.

Deterministic workload (50 memories, 20 prompts, 3 mid-session store writes) through the plugin's real injection code:

| Policy | Recomputes | Injected chars (20 turns) | Avg/turn | Worst block |
| --- | ---: | ---: | ---: | ---: |
| A — recompute per prompt, uncapped | 20 | 25742 | 1287.1 | 1838 |
| B — epoch freeze + 1200-char cap (shipped) | 4 | 19990 | 999.5 | 1139 |

Policy B injects 22.3% fewer characters, and its block is byte-identical between store changes so the prompt cache stays warm. Reproduce (byte-identical output):

```sh
bun run bench
```

## Recall quality

No vector database, no embedding model, no API key. What the keyword matcher gives up, measured against classic BM25 on a deterministic eval (store of 200, k=3 — the production injection limit):

| Query, vs. the stored memory | share | R@1 | R@3 | with `kw` R@1 | with `kw` R@3 |
| --- | ---: | ---: | ---: | ---: | ---: |
| lexical — reuses your project's words | 46% | 98% | 98% | 98% | 98% |
| near — reworded, one overlap | 17% | 28% | 28% | 67% | 72% |
| strict — zero shared words | 37% | 0% | 0% | 26% | 26% |

"with `kw`" is the same matcher over the same store with each row's write-time keywords indexed; the only changed variable is the index.

- **In-project prompts are overwhelmingly lexical** (`bun test`, "the rate limiter", "staging deploys"): 98–100% R@3, flat from store size 50 to 500.
- **Single-overlap guessing was traded away.** Free-text prompts that share one concept abstain rather than force a guess; wrong top-memory fell to 6%. `memory_recall` still covers them.
- **Zero-overlap paraphrase is the real limit, and write time is where it is answered.** `memory_remember` and auto-capture ask each row for 3–5 `kw` aliases (other names, other verb forms, the literal command); they are indexed and never rendered. Strict R@1 0% → 26%, near R@1 28% → 67%. A permutation control (every row given someone else's aliases) scores 29%/35%, so the gain is meaning rather than extra tokens. The limit is narrowed, not removed.
- **Caveats.** The dataset is synthetic (52 memories / 105 queries, a fictional project), its class mix is deliberately adversarial, and scoring is single-gold.

Full methodology and all store sizes: `bench/recall-results.md`.

```sh
bun run bench:recall
```

## Write latency

A write that cites code references builds one tree index — a single recursive walk that prunes `node_modules` and VCS directories — shared by GATE-1 and GATE-2, and reads each source file at most once. Measured on a 5,300-file fixture (300 sources + 5,000 `node_modules` decoys), scope seeded with 5 embedded call forms:

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

The plugin keeps a **use ledger** (`<memory-root>/hits.logfmt`, append-only, rotated at 2 MB, never ingested as a memory) and reports it in `memory_status` and the `/memory` panel:

```
STORE
  41 active · 12 superseded · 4 open · 6 scopes
  retrieved 33 rows in the last 30d; never retrieved 8 (20%) — reported, not acted on
  24.1 KB total · 604 B per row · 1.3 rows/day (30d) · capture lag p50 42 s / p95 6 min
```

- **Credit comes from three distinct sources** — the row rode the injected block, `memory_recall` returned it, or a grep/read pull appended it — because "the model asked" and "the harness offered" are different facts. Credit requires ≥2 shared terms with the query and is throttled to one line per memory per session per source per hour.
- **No prompt content is stored.** The ledger keeps a scan-truncated string from the *memory* side, never your message.
- **Reinforcement is a tie-break only** (`useBoost ≤ 1.0`): a recently used row wins a tie and can never outrank a real score gap. In consolidation the most recently used member of a cluster is never the merge loser.
- **`never retrieved` is stated, not acted on.** Pruning is your decision. Retired rows cannot inherit reinforcement: ledger rows are verified against the store on read.
- **Capture lag** is how stale the newest message was when auto-capture fired.

## Consolidation

`memory_consolidate` finds near-duplicates and proposes merges. It writes nothing; each proposal prints the exact `memory_merge_review` call that resolves it, and resolving is supersede-not-delete.

- **Deterministic.** The canonical row is the survivor's prose verbatim plus the absorbed rows' aliases as keywords. No model rewrites anything.
- **Proven by recorded reads.** Every read the ledger recorded for a cluster is replayed against the merged store, and a merge is proposed only when the canonical row catches at least as many of the cluster's own reads as the best single member did alone. A cluster with no recorded reads is reported as *unmeasured* and never merged on resemblance.

On the eval dataset the pass takes 200 rows to 52 with **R@3 52 → 53 and R@1 52 → 50**, and store-wide injected characters 25 945c → 6 933c. Both the regression and the budget swap are bounded in CI (`test/consolidate-bench.test.ts`).

## Secret redaction

One best-effort credential rule set (`src/secrets.ts`) runs over the auto-capture prompt before it leaves the plugin, at the write gate before content is hashed or analysed, and again in the final write choke point used by gated writes and the viewer's edit and restore paths.

Covered: OpenAI `sk-`, GitHub `ghp_` / `gho_` / `github_pat_`, Slack `xoxb-` / `xoxp-`, AWS `AKIA`, Google `AIza`, bearer tokens containing digits, PEM private-key blocks, and high-entropy values assigned to names ending in `_KEY`, `_TOKEN`, `_SECRET` or `_PASSWORD` (plus `password`).

Limits worth knowing:

- It can miss hex-only secrets, low-diversity passwords, and credentials written in prose without an assignment.
- Credential-shaped `scope`, `tags` or `issue` metadata is rejected rather than silently rewritten.
- `memory_remember` still replies `Remembered` when content was redacted, so the stored text can differ from what was sent.
- Redaction is forward-only: existing stores are not scrubbed, and `memory_export` writes what is already stored verbatim.

## Export and move between machines

`memory_export` writes the live store as JSONL: a machine-readable header line (`{_export, version, exportedAt, count}`) followed by one JSON object per line (`{ts,type,scope,content,status,tags,issue}`), active rows only. `memory_import` reads such a file back. Default path is `<memory-root>/exports/<timestamp>.jsonl`; pass `file` to choose one and `scope` to export a single scope.

```
Export my memories to ~/memories.jsonl        # memory_export
# …copy the file to the other machine…
Import ~/memories.jsonl                       # memory_import
```

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

- **Footer badge** — `● mem 1157/1200c · cache 96%`: the injected block against its budget, plus the measured session prompt-cache hit rate. The dot is green (stable and warm), yellow (recent recompute, or 50–90% reads) or red (last turn served almost nothing from cache); `—` until the first assistant turn.
- **`/memory`** — session panel: **CONTEXT** (chars and estimated tokens riding now, % of budget, requests this epoch has ridden, session totals, abstentions), **CACHE** (busts this session and the measured cache-served share of prompt tokens), **INJECTED BLOCK** (the verbatim block, or an explicit abstention), **RECENT BLOCKED WRITES** (with gate reasons), **STORE** (active / superseded / open / scopes, plus `malformed` when a row's `ts` is not a valid ISO instant — those rows are skipped by every reader). Keys: `r` refresh, `f` fullscreen.
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
| Stale plugin after an update | `opencode plugin update opencode-self-improvement` (or bump the pinned `@version` in the `plugins` entry) and restart opencode. |
| Auto-capture does nothing | `autoCapture` needs a valid `captureModel` in `provider/id` form; a bad one disables capture with a startup warning. `captureOnCompact` alone does nothing. Rejected candidates are logged as evidence, not errors — check `memory_evidence`. |
| Reset all memories | Delete `~/.config/opencode/memory/`. |
