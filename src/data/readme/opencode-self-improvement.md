# Opencode-Self-Improvement

Durable memory for opencode, plus a one-command per-repo setup.

## Why is this here?

LLMs waste a lot of tokens reading and re-reading your code and asking you for clarifications you've already given it. This tells it to store those decisions so the next time you hit a similar part of the code, it knows more and gets to the answer faster. 
## What you get

- **`memory_*` tools** — remember facts, decisions, and commands the agent should
  keep across sessions (`memory_init`, `memory_remember`, `memory_recall`,
  `memory_update`, `memory_forget`, `memory_list`, `memory_undo`,
  `memory_evidence`, `memory_export`, `memory_import`, `memory_decay`,
  `memory_status`).
- **Memory at a glance** — the terminal shows a footer badge (injected chars
  vs budget + a cache-health dot) and a `/memory` panel; desktop/web/IDE get
  the same report in-chat via `/memory-report`, including the *measured*
  prompt-cache hit rate. See [Memory at a glance](#memory-at-a-glance).
- **`/repo-init`** — for each repo: indexes the code graph and remembers the
  test/build commands, keyed to the git head. The command installs itself; no
  setup beyond the plugin.
- **Memory-aware compaction** — durable memories are handed to the compaction
  summarizer, so a long session doesn't get an amnesia wipe exactly when it
  needs its memory most.
- **Export / import (JSONL)** — `memory_export` / `memory_import` back the store
  up or move it between machines. Every imported row re-enters through the same
  write gates, so an export can't smuggle junk in.
- **Injection-resistant by construction** — every injected memory block frames
  itself as *reference data, never instructions*; rows that arrived through a
  path the gates can't fully vouch for carry a visible `[via import]` /
  `[via auto-capture]` provenance marker; and the `status:"open"` frontier
  exemption is only honored for files carrying a machine-made export header.
- **Decay** — `memory_decay` retires stale open threads. Dry run by default;
  supersede-not-delete, snapshot-first, undoable.
- **Auto-capture (opt-in)** — with `autoCapture` on, session-idle events get one
  cheap model pass that proposes memory candidates; every candidate still faces
  the same write gates. Off by default, so the install stays zero-token.
- Automatically de-dupes similar memories and avoids contradictions by searching for existing memories before saving new ones.
- **Write gates** — every memory passes 4 checks before it sticks: code references are
  verified against your actual repo, near-duplicates are collapsed, contradictions with
  superseded memories are rejected. Blocked writes are logged with a reason
  (`memory_evidence`), and nothing is ever deleted — updates supersede the old row and
  `memory_undo` rolls back.
- **Safe across concurrent sessions** — the daily store file is shared by every
  opencode session on the machine plus the viewer, so the whole-file rewrites
  (update, forget, undo, viewer delete) hold a per-file lock that is honored
  across processes, and hand the new file over with an atomic rename. Another
  session's write is never overwritten, and a reader never sees a half-written
  store.
- Automatically looks for insights when you complete the verification gates (tests, linting, etc)
- Always defaults to memories first before sending a prompt to the LLM, which saves tokens! 

## Token cost, on purpose

Memory plugins have a reputation for burning tokens and busting the provider's
prompt cache on every message. This one is built the other way around:

- **Epoch-frozen injection.** The "Relevant durable memory" block is computed
  once per epoch — first prompt of a session, a change to the memory store, or
  a compaction — and stays byte-identical in between. A stable system prefix
  means the provider's prompt cache survives ordinary turns instead of being
  invalidated on every message.
- **Two-concept evidence gate.** A free-text prompt must share at least two
  distinct concepts with a memory for it to be injected; keyword-length
  queries (one or two words — a deliberate search) need only one. Injection
  stays quiet on single-word coincidences, which `memory_recall` still
  reaches on the pull path — rare and right beats frequent and maybe.
- **Hard character budget.** The block is capped at 1200 characters by default
  (see Options) and trimmed at whole-memory boundaries — never cut mid-sentence.
- **Evidence is never injected**, and the standing system digest is two lines.
- **Receipts, not promises.** The plugin measures your session's actual
  prompt-cache usage (from each turn's `tokens.cache` accounting) and shows it
  next to the badge — so a cache hit rate you can watch, not just a byte-freeze
  claim you have to trust.

Measured on a deterministic workload (50 memories, 20 prompts, 3 mid-session
store writes) using the plugin's real injection code:

| Policy | Recomputes | Injected chars (20 turns) | Avg/turn | Worst block |
| --- | ---: | ---: | ---: | ---: |
| A — recompute per prompt, uncapped (naive) | 20 | 25742 | 1287.1 | 1838 |
| B — epoch freeze + 1200-char cap (shipped) | 4 | 19990 | 999.5 | 1139 |

Policy B injects 22.3% fewer characters — and the bigger saving isn't even in
the character count: B's block is byte-identical between store changes, so the
prompt cache stays warm across ordinary turns. Reproduce (byte-identical
output):

```sh
bun bench/inject-cost.ts
```

## Write latency — one tree scan per write, not per ref

GATE-1 re-resolves call signatures embedded in a memory against the live
source tree, and GATE-2's stale-ref scan does the same for every memory in
the scope. The original resolver enumerated the whole tree (a glob pass per
extension, `node_modules` included) **per call form** — a write citing a few
symbols paid N full-tree scans: ~0.4s each in a small repo, seconds in a
monorepo. A write now builds one tree index — a single recursive walk that
prunes `node_modules`/VCS/dot dirs — shared by both gates, and source files
are read in bounded-parallel chunks and cached, so each file is read at most
once per write. Measured on a 5,300-file fixture (300 sources + 5,000
`node_modules` decoys), scope seeded with 5 embedded call forms:

| Call forms in the write | Shipped | Old (scan per form) |
| --- | ---: | ---: |
| 1 | 17ms | 105ms |
| 3 | 15ms | 136ms |
| 5 | 20ms | 169ms |

The shipped column is flat — the tree is walked once no matter how many refs
the write cites. In real `node_modules`-heavy repos the old per-form scan
measured 400–700ms, so the gap there is 20–100×. Reproduce:

```sh
bun bench/write-latency.ts
```

## Recall quality — no models required

Memory plugins get told "keyword matching isn't good enough," and the usual
prescription is a vector database or a local embedding model. This plugin ships
neither — no model, no download, no API key, ever. The question is what that
actually costs you, so we measured it:

```sh
bun bench:recall
```

A deterministic, auditable eval of the **shipped** matcher against classic
BM25, on query classes assigned by *measured* vocabulary overlap with the
right memory (store of 200; k=3 = the production injection limit):

| Query, vs. the stored memory | share | R@1 | R@3 |
| --- | ---: | ---: | ---: |
| lexical — reuses your project's words | 46% | 98% | 98% |
| near — reworded, one overlap | 17% | 28% | 28% |
| strict — zero shared words | 37% | 0% | 0% |

What the benchmark bought us:

- **In-project prompts are overwhelmingly lexical** — you keep saying
  `bun test`, "the rate limiter", "staging deploys". The shipped matcher
  nails those: 98–100% R@3, flat from store size 50 to 500, and the
  two-concept evidence gate never abstains on one (0 of 48).
- **It caught a real bug.** Function words ("the", "what", "how") counted as
  matches, so nearly half the time the top memory was the wrong one. The
  matcher now ignores them on the query side: wrong-first rate fell 49% → 34%,
  and the two-concept evidence gate + IDF ranking finished the job: **6%**.
- **One shared word is a coin flip, so injection stopped playing it.** At the
  near class (a single shared concept) the old matcher force-pushed a guess;
  free-text prompts now abstain and the pull path covers them. The trade,
  exactly: near-class R@3 83% → 28% (the remainder is keyword-length queries,
  which still inject on one concept) for the 34% → 6% wrong-memory number
  above. A quiet turn beats a confident wrong one.
- **Strict paraphrase is the real lexical wall**, and we won't pretend
  otherwise. Nothing keyword-side crosses it. So instead of confident noise the
  matcher now goes *silent* when the vocabulary shares nothing (35 of 39
  strict queries inject nothing at all), and the agent's `memory_recall` loop
  remains as the pull path. Embeddings are the only known crossing — the bench
  exposes a scorer seam if you want to measure them — but requiring an
  inference engine just to remember things is a non-starter for a zero-dependency
  plugin.
- Caveats, honestly: the dataset is synthetic (52 memories / 105 queries, a
  fictional project), its class mix is deliberately adversarial (far richer in
  zero-overlap paraphrases than real prompts), and scoring is single-gold.

Full methodology, all store sizes: `bench/recall-results.md`
(regenerate with `bun bench:recall`).

## Quick start

1. Add the plugin to your Opencode config (see install below) and restart Opencode.
2. In any repo, run:

   ```
   /repo-init
   ```

That's it. Rerun `/repo-init force` after a refactor to refresh.

## How to install

Add a `plugins` entry to your opencode config —
`~/.config/opencode/opencode.jsonc` (global) or any project `opencode.jsonc`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-self-improvement"]
}
```

Opencode installs the package (and its dependencies) automatically with Bun at
startup. Quit and restart opencode; the plugin loads and `/repo-init` installs
itself. Nothing else to do.

An unpinned entry resolves `@latest` exactly once and is never re-resolved
afterwards, so updates are deliberate: `opencode plugin update
opencode-self-improvement`. To install a specific release, append
`@<version>` — see [npm](https://www.npmjs.com/package/opencode-self-improvement)
for what's current — and bump it when you want to move. On Opencode v2 you
can also manage it with the CLI:

```sh
opencode plugin add opencode-self-improvement
opencode plugin update opencode-self-improvement
```

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

## Merge gate

Nothing merges without the full gate: CI runs it as required checks (`lint`,
`test`, `smoke`), and the same sequence is one command locally:

```sh
bun run gate          # typecheck + lint + unit tests + terminal smoke & BDD
bun run gate:hooks    # once per clone: run the gate automatically on `git push`
```

**Feature order is BDD-first.** Every new feature starts by adding (or fixing)
a BDD scenario in `e2e/` describing the behavior as a user would observe it —
before any implementation code and before unit tests. Then write the unit
tests for the pieces, then the code until everything is green. If no scenario
turns red first, the feature has no observable contract.

The `e2e/` suite is what keeps a load-error release from shipping again: it
boots the **real opencode CLI** against each candidate in a fully isolated
instance (fresh config, fresh db, fresh memory store, empty `HOME`) driven by
a scripted OpenAI-compatible fake model — no API keys anywhere. Scenarios
cover loading from the source tree and from the **packed npm artifact
installed runtime-deps-only** (the same semantics as opencode's plugin
cache), plus BDD flows for remember, recall, exact duplicates, near duplicates,
ungrounded claims, and forget. Needs `opencode` on `PATH` locally (or set
`OPENCODE_BIN`).

## Options

Zero configuration is the default. To tune the plugin, use the object form of
the plugin entry in `opencode.json(c)` instead of the plain string:

```json
{
  "plugins": [{ "package": "opencode-self-improvement", "options": { "injectBudget": 1200 } }]
}
```

| Option | Default | What it does |
| --- | --- | --- |
| `injectBudget` | `1200` | Character cap on the injected relevance block, trimmed at whole-memory boundaries. Env fallback: `OPENCODE_MEMORY_INJECT_BUDGET`. |
| `autoCapture` | `false` (off) | When on, each session-idle event makes one cheap model pass that proposes memory candidates. Every candidate still goes through the 4-gate write pipeline — capture can never bypass the gates. Off by default: the zero-token install stays zero-token. |
| `captureModel` | — | `"provider/id"` model used for auto-capture. Required when `autoCapture` is on; a missing or invalid value disables capture with a startup warning. |
| `captureMax` | `3` | Maximum candidates proposed per idle event. |
| `notifyBlocked` | `true` (on) | Terminal (TUI) half only: toast when the write gate blocks a memory write. `false` keeps the panel quiet; blocks are always in `memory_evidence` regardless. |

## Code graph (optional)

`/repo-init` also indexes the repo into a queryable knowledge graph via
[`codebase-memory-mcp`](https://github.com/DeusData/codebase-memory-mcp),
pinned to `0.11.0` as an optional dependency, so opencode's auto-install at
startup brings it in. If a copy is already on your `PATH`, that one is used
instead; override explicitly with `OPENCODE_CBM_BIN=/path/to/codebase-memory-mcp`.
When no graph binary is available, `/repo-init` still records scripts and the
init stamp — the graph is a lookup bonus, not a requirement (see below).

Manual install of the pinned binary (if you want it globally):

```sh
curl -fsSL https://raw.githubusercontent.com/DeusData/codebase-memory-mcp/main/install.sh | bash
```

## First use

Run `/repo-init` once in every repo you work in. It:

- indexes the repo's code graph (`codebase-memory-mcp`), only when missing or forced;
- stores the test/lint/typecheck commands as memories;
- writes an init stamp tied to the current git head.

Ongoing use is just the memory tools. Ask the agent to remember something and it
sticks across sessions; check what's stored with `memory_list`, refine with
`memory_update`, retract with `memory_forget`, roll back with `memory_undo`.

`memory_update` takes a `query` that picks the row: its id, a clock fragment such
as `00:11:25.867`, or a unique substring of its text. Omit it to update the newest
entry of that scope and type. A `query` matching nothing, or matching several rows,
writes nothing and says so rather than updating the wrong memory.

## Repo scoping

Memories belong to the repo that wrote them: rows are stamped with your git
remote (an id that survives re-clones and moves between machines) or, with no
remote, the repo path. Injection, recall, the frontier block, compaction,
`memory_forget`, and decay only ever see the current repo plus global rows —
project A's facts never surface in project B. Preferences and habits that
should follow you everywhere go in with `memory_remember global: true`.
Memories written before this existed, and ones restored through the viewer,
are global (visible everywhere), so upgrading changes nothing; exports carry
origin stamps, so scoping survives a machine hop.

## Backup & move between machines

`memory_export` writes the live store as JSONL — a machine-readable header line
(`{_export, version, exportedAt, count}`) followed by one JSON object per line
(`{ts,type,scope,content,status,tags,issue}`), active rows only (superseded
history stays in the store). `memory_import` reads such a file back. Defaults
to `<memory-root>/exports/<timestamp>.jsonl`; pass `file` to choose the path
and `scope` to export just one scope.

In practice you just ask the agent:

```
Export my memories to ~/memories.jsonl        # memory_export
# …copy the file to the other machine…
Import ~/memories.jsonl                       # memory_import
```

Import is safe by construction: every row re-enters through the same 4-gate
write pipeline as `memory_remember` (tagged `import`, original tags preserved),
and the tool reports a tally of outcomes per line —

| Outcome | Meaning |
| --- | --- |
| `promoted` | passed the gates and was stored |
| `collapsed` | near-duplicate of an existing memory; nothing written |
| `blocked` | rejected by a gate; reason is in `memory_evidence` |
| `skipped` | malformed line; never reaches the gates |
| `downgraded` | `status:"open"` without an export header to vouch for it; imported as settled |

The frontier policy matters because an open row is exempt from ref grounding:
a hand-written JSONL can't hand its rows that free pass (the header is
friction, not a signature — the real defense is that imported content always
injects framed as data and marked `[via import]`).

so re-running the same import is a no-op (everything collapses). Copying an
export to a fresh machine is how you seed a new laptop from an old one.

## Memory at a glance

"Wait, what did the memory plugin just do?" — answered differently per client,
same data (`memory_status` tool under the hood; no model call):

**Terminal (opencode CLI)** — the plugin ships a TUI half
(`@opencode/plugin/tui`) that loads automatically:

- a footer badge: `● mem 1157/1200c · cache 96%` — the injected block against
  its budget, and the measured session prompt-cache hit rate. The dot is green
  (stable + warm), yellow (a recent recompute, or 50–90% reads), or red (last
  turn served almost nothing from cache). `—` until the first assistant turn.
- **`/memory`** opens a session panel (every number is this session only):
  - **CONTEXT** — exact chars + estimated tokens riding now, % of the budget,
    requests the current epoch has ridden, session-lifetime totals, and how
    many requests abstained (silence is a feature)
  - **CACHE** — the receipts, in plain language: cache busts this session
    (0 = memory has never rewritten a byte of your history), the measured
    share of prompt tokens the provider served from cache (≥90% reads =
    "memory is cache-invisible"), or — when the provider reports no usage at
    all — the structural proof instead: the same block bytes rode every
    request with zero busts
  - **INJECTED BLOCK** — the verbatim block riding your prompts, or an explicit
    "abstained: no vocabulary overlap"
  - **RECENT BLOCKED WRITES** — that `memory_remember` that didn't stick,
    with its gate reason
  - **STORE** — active / superseded / open / scopes (plus `malformed`, only when the store contains rows whose `ts` is not a valid ISO instant — those are skipped by every reader, never loaded)
  - keys: `r` refresh, `f` fullscreen
- a warning toast when a write is blocked (opt out: `"notifyBlocked": false`)

**Desktop / web / IDE** — no TUI slots there (they're terminal-only), so use
the self-installed **`/memory-report`** chat command: the same four sections,
rendered in the conversation. For editing, the browser admin (`bun memory-view`)
works everywhere.

## Admin Tool

Editing and deleting memories is easy!

Run `bun memory-view` in your terminal and visit  http://127.0.0.1:8787 in your browser. 

## Troubleshooting

| Problem | Fix |
| --- | --- |
| `memory_*` tools not available | The plugin didn't load. Restart opencode and check the `plugins` entry in your config. |
| `memory_remember` says blocked | A gate rejected the write (stale code reference, a cited `path/to/file.ts` that doesn't exist in the repo, overlap with a superseded memory, or an ambiguous claim). The reason is logged — check `memory_evidence`, then rephrase against current code and retry. |
| `invalid arguments to memory_*` | The tool call didn't match the tool's input schema — nothing was done, and the message names the offending fields. Schema validation lives at the tool boundary; gate blocks look different (`blocked at GATE (…)`). |
| STORE shows `N malformed` | Rows in a daily file have a `ts=` that is not a valid ISO instant (typically a hand-edit gone wrong). Every reader skips them; fix the `ts=` value or restore the file with `memory_undo`. |
| `memory store is busy`, or a stray `*.logfmt.lock` | Another session or the viewer has held that store file for over 5s. Ordinary writes proceed anyway; only `memory_undo` and the viewer's restore refuse, because a forced rollback under a live writer would drop rows nobody agreed to drop. Retry. A lock left behind by a killed process is taken over after 10s; `*.lock` and `*.tmp` files in the store are write bookkeeping, safe to delete while nothing is writing. |
| `/repo-init` missing from the command list | The self-install couldn't write to `~/.config/opencode/commands/` (e.g. read-only config dir). Create it, restart, or just ask the model to "init memory for this repo" — it calls the same tool. |
| Init says `Graph: unavailable` | `codebase-memory-mcp` couldn't start (not installed, or its once-only download is blocked). Install pinned `0.11.0` via the one-liner above, or point `OPENCODE_CBM_BIN` at the binary. Scripts are still remembered without it. |
| Stale plugin after an update | Bump the pinned version in the `plugin` entry (or `opencode plugin update opencode-self-improvement` on v2) and restart opencode. |
| Auto-capture does nothing | `autoCapture` needs a valid `captureModel` in `provider/id` form — a bad one disables capture with a startup warning. Candidates rejected by the write gates are logged as evidence, not errors; check `memory_evidence`. |
| Reset all memories | Delete `~/.config/opencode/memory/`. |

