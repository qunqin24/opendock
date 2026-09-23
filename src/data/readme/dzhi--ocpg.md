# ocpg

Postgres-backed persistent memory for [OpenCode](https://opencode.ai).

## In simple terms

Your OpenCode agent normally forgets everything the moment a session
ends. ocpg fixes that: it gives the agent a real memory that survives
across sessions and across projects, stored in your own Postgres
database.

**What it's good at:**

- **It remembers on its own.** Say "remember that we use jose, not
  jsonwebtoken" and it's stored, word for word, with no extra step. The
  agent can also choose to save things itself when it decides something
  is worth keeping.
- **It finds things even if you don't ask the same way twice.** Search
  works both by keyword and by meaning, so asking about "the API rate
  limit" still finds a memory that only says "requests per minute" - you
  don't have to remember your own wording.
- **It keeps project knowledge separate from general knowledge**,
  automatically. A fact about *this specific customer's setup* stays out
  of every other project. A fact about *your tooling in general* is
  available everywhere. You don't have to manage folders or configure
  this - the agent picks the right one when it saves something, and you
  can correct it if it gets it wrong.
- **It corrects itself properly.** When something changes, the old
  memory doesn't just sit there contradicting the new one - it's marked
  as replaced and stops showing up, while still being there if you ever
  want to check the history.
- **It never gets in the way.** If the database or the search engine is
  slow or offline, the agent just keeps working with whatever it already
  has - memory is a helpful extra, never something that can break or
  stall a request.
- **Nothing disappears by accident.** Cleaning up duplicate memories is
  something you trigger on demand, you can preview exactly what would be
  removed before committing to it, and it always shows you exactly what
  it removed before it's gone for good.
- **It's yours.** Everything runs on your own Postgres database and your
  own local embedding model (via Ollama) - no data leaves your machine,
  no cloud service, no API key required.

If you only read one more section, read "Using it well" below - a
handful of habits that make the difference between a memory system that
quietly helps and one that quietly fills up with noise.

---

## Technical overview

Every memory is a row in one Postgres `memories` table. Four things
happen around it:

**1. Memories get in - three ways**
- The agent calls `memory_remember` when it decides something is worth
  keeping.
- You say "remember that…", "don't forget…", or "keep in mind…" in a
  prompt, and the text after the phrase is stored verbatim. This is a
  fixed regex, not a model call - deterministic and auditable. Questions
  ("remember when X broke?") are deliberately skipped.
- On write, the row is embedded (`embeddinggemma:300m` via Ollama)
  fire-and-forget, so a slow or dead embedder never delays the write
  confirmation.

**2. Memories come back - automatically, ranked by relevance to what you
just asked.**
Before every model request, ocpg reads your latest message and runs two
searches at once:
- **Keyword search** - your prompt becomes an OR-of-stemmed-words
  Postgres full-text query.
- **Embedding search** - the same prompt is embedded and compared by
  cosine similarity (pgvector HNSW).

The two ranked lists merge: the vector list's **top 2 rows are reserved
unconditionally**, and the rest is filled by reciprocal rank fusion (RRF,
k=60). This is why phrasing something differently than you originally
stored it still finds the memory - the keyword half alone can't do that.
Near-duplicates are collapsed out, the top 5 survive, and they're
injected into the system prompt as a `<persistent-project-memory>`
block.

If Ollama is unreachable, the vector half is skipped and search silently
degrades to keyword-only. If the database is unreachable, injection is
skipped entirely. Neither ever blocks or fails a model request - the
injection query has a hard 1s deadline.

**3. Duplicates get cleaned up - on demand, never automatically.**
Writes are never rejected. `memory_consolidate` is the cleanup tool, and
you (or the agent) run it when you want. It makes two passes - trigram
wording similarity, then embedding meaning similarity - keeps the newest
of each duplicate group, and **returns the text of everything it
deleted** so nothing is lost silently.

**4. Corrections replace, not just add.**
Call `memory_remember` with `supersedes: <id>` when a new memory corrects
or reverses an older one. The old memory is marked as superseded (not
deleted) and stops showing up in recall or injection, so a correction
can't end up sitting next to the outdated fact it was meant to replace.
`memory_recall` with `includeSuperseded: true` brings it back into view,
noting what replaced it.

### Scoping: the one concept worth understanding

Every memory has a **type**, and the type decides who can see it:

- `stack_fact` - about your tooling, portable across every project using
  the same stack ("our Terraform RDS module needs `ignore_changes`").
  Visible everywhere.
- `project_fact` (the default) - true about this specific
  project/customer only ("customer A's staging DNS is flaky"). Visible
  **only from its origin project**.

The test when storing something: *would this help in a different
customer's repo using the same tools?* Yes → `stack_fact`. No →
`project_fact`.

### Using it well

- **Let the agent store things, but say "remember that…" when it
  matters.** The keyword trigger is a guarantee; the agent's own
  judgment is not.
- **Get the type right.** A `project_fact` that should have been a
  `stack_fact` is invisible in every other project - that's the most
  common way a useful memory goes missing.
- **Run `memory_consolidate` occasionally**, not constantly. It's cheap
  and it shows you what it removed before you lose anything.
- **Phrase recall queries naturally.** Hybrid search means you don't
  have to remember your original wording - meaning-based matching covers
  the gap.
- **Keep memories self-contained.** "Use jose, not jsonwebtoken, for
  Edge compatibility" survives out of context; "we decided on the second
  option" does not.
- **Use `supersedes` when you correct something**, not a second
  unrelated memory. Two memories that disagree with no link between them
  is exactly the situation `supersedes` exists to avoid.

---

Uses the `memories` table (`content`, `tags`, `session_id`, `project`,
`created_at`, `search_vector`, `embedding`, `memory_type`,
`access_count`, `last_accessed_at`, `updated_at`, `superseded_by`) plus a
`memory_recalls` table (which sessions have recalled a memory, feeding a
small ranking tiebreak) and the `pg_trgm` + `vector` extensions, and
exposes `memory_recall` / `memory_remember` / `memory_forget` /
`memory_update` / `memory_consolidate` / `memory_tags` / `memory_retag`
tools.

## Install

In `opencode.json`:

```json
{
  "plugin": [
    "@dzhi/ocpg"
  ]
}
```

## Connecting to the database

Need a Postgres instance? The [`deploy/`](./deploy) directory ships a
hardened Docker Compose setup (localhost-only, `memories` schema
auto-created on first boot, plus an optional Ollama service as the
embedding backend) - see [`deploy/README.md`](./deploy/README.md).

Configure the connection via shell environment variables:

```bash
export OCPG_HOST="localhost"
export OCPG_PORT="5432"
export OCPG_USER="ocpguser"
export OCPG_PASSWORD="your-postgres-password"
export OCPG_DB="ocpg"
export OCPG_SSL="disable"
```

| Env var            | Default              |
| ------------------ | -------------------- |
| `OCPG_HOST`         | `localhost`           |
| `OCPG_PORT`         | `5432`                |
| `OCPG_USER`         | `ocpguser`             |
| `OCPG_DB`           | `ocpg`                 |
| `OCPG_SSL`          | `disable`              |
| `OCPG_INJECTION`    | `relevance`             |
| `OCPG_OLLAMA_HOST`  | `localhost`              |
| `OCPG_OLLAMA_PORT`  | `11434`                   |
| `OCPG_EMBED_MODEL`  | `embeddinggemma:300m`      |

`OCPG_SSL` accepts `disable`, `prefer`, `require`, `verify-ca`, or
`verify-full` (anything else falls back to `disable`). It defaults to
`disable` for the usual localhost setup - **set it to `require` or
stricter whenever `OCPG_HOST` is not local**, otherwise the password
handshake crosses the network in plaintext.

Anything under `"options"` in `opencode.json` is ignored - configuration
is env-only.

## How memory works

Visibility is **type-based**:

| Type           | Visibility                          | What it's for                                                                                                                                             |
| -------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `stack_fact`   | Global                                | True about the tooling/stack itself - portable to any project using the same stack (a Terraform module quirk, a Helm convention)                          |
| `project_fact` | Origin project only (default)          | True about this specific project/customer only; pass `global: true` on `memory_recall` to reach across projects                                          |
| `episodic`     | Global (same rule as `stack_fact`)      | Reserved for a future feature; nothing writes it automatically today, but a manual `memory_remember` with this type stores and is visible everywhere, same as `stack_fact` |

`memory_forget` / `memory_update` follow the same rule: a foreign
project's `project_fact` is off-limits (the call fails and names the
owning project); the global type (`stack_fact`) is maintainable from any
project.

`access_count` and `last_accessed_at` are updated on every
`memory_recall` read but nothing currently ranks by them - they're
collected as data for possible future use, not consumed by any ranking
today. (An access-frequency ranking was tried and reverted: bumping
exactly the returned top-5 created a rich-get-richer loop where a few
rows pinned the top slot after a handful of runs.)

`memory_recall` also records which session did the recalling in a
separate `memory_recalls` table - a memory recalled from several
distinct sessions gets a small ranking tiebreak (capped, weighed well
below the same-project boost). Recalling it many times from the *same*
session doesn't compound the count, which is the deliberate difference
from `access_count`'s reverted attempt above.

## How injection picks memories

By default the block is **relevance-ranked, not recency-ranked**: the
user's latest prompt is turned into a full-text query (OR of stemmed
words) over every **visible** memory (global types from anywhere,
`project_fact` from its origin project), ranked by relevance with a
small same-project tiebreak, top 5 injected - each line labeled with its
origin project. When neither search half matches the prompt, it falls
back to the latest visible memories, newest first. Near-duplicate
memories (>=80% trigram content similarity) are collapsed out of this
block automatically before the top 5 are chosen, so five near-identical
restatements of one fact won't crowd out everything else. Injected
content is truncated to 600 characters per memory.

Set `OCPG_INJECTION=recency` to restore the old blind-last-5 behavior
instead: no prompt-matching, just the most recent visible memories.

Retrieval is **hybrid**: the prompt runs through keyword full-text
search and, when Ollama is reachable, through embedding search
(`embeddinggemma:300m`, pgvector HNSW, cosine) - the two ranked lists
merge with 2 reserved embedding slots plus reciprocal rank fusion (k=60)
for the rest (bench-verified: R=2 recovers half the real-corpus
paraphrase gap at zero synthetic cost), so exact-word hits and
said-differently paraphrase hits both surface. The internal benchmark
shows hybrid recall never worse than either half alone at 485/5k/50k
rows, and `embeddinggemma:300m` outperforming the previous default
(`bge-m3`) on every quality metric while running roughly 10x faster
warm ([`bench/README.md`](./bench/README.md)). Writes are embedded
fire-and-forget; rows from before this feature carry no embedding until
`bun run backfill` fills them (see
[`deploy/README.md`](./deploy/README.md)).

If Ollama is unreachable - or the database predates the embedding column
- search silently degrades to keyword-only; nothing breaks. A cold model
load is over the 1s injection deadline, so the plugin warms the model at
session start and pins it with `keep_alive`; a warm embed runs
concurrently with the keyword query, well inside the query budget.

## Tools

Seven agent tools are registered: `memory_remember` (store),
`memory_recall` (search), `memory_forget` (delete by id), `memory_update`
(rewrite an existing memory, keeping its original learned date),
`memory_consolidate` (remove near-duplicates on demand),
`memory_tags` (list tags currently in use, with counts, to reuse an
existing tag instead of minting a near-duplicate), and `memory_retag`
(rename a tag across every memory that has it, once `memory_tags` shows
two variants of the same tag exist). The agent reads their usage rules
from the tool schemas - as the user, the things worth knowing are:

- Visibility follows the type (see the table above); `memory_recall`
  takes `global: true` to also search other projects' `project_fact`
  memories (`stack_fact` is always searched regardless of this flag).
  `memory_tags` takes the same flag, plus `limit` (default 200).
  `memory_retag` follows the same project-boundary rule as
  `memory_forget`/`memory_update` (no `global` flag - a rename's reach
  is whatever it's already allowed to touch, not something to opt into
  widening).
- Duplicate writes are **never rejected** - `memory_remember` is a plain
  store. Near-duplicates are collapsed out of the injected block
  automatically, and `memory_consolidate` cleans them up when you ask.
- `memory_remember` takes an optional `supersedes: <id>` to mark an
  earlier memory as replaced rather than just narrating the change in
  prose - see "Supersede tracking" below.

Writes are capped at 4000 characters of content, 10 tags, and 64
characters per tag; oversized writes are rejected with the actual size
rather than silently truncated. A write over 700 characters still
succeeds, but the response includes a note that most of it won't fit in
the 600-character injected block - a nudge to keep entries short, not a
rejection. Memories carry a `type` (`stack_fact`, `project_fact` default,
or `episodic` - see the visibility table above).

### Automatic capture

Saying "remember this/that", "remember to ...", "don't forget ...", or
"keep in mind ..." in a prompt stores the text following the phrase
verbatim, tagged `user-requested` - matched by a fixed pattern, not an
LLM call, so it's deterministic and auditable. Questions using the
trigger phrase ("remember when the pool broke?") are deliberately not
captured, since they're asking about the past, not asking to store
something new - only imperative uses ("remember that when X happens, do
Y") trigger it.

This runs alongside the model's own judgment to call `memory_remember` -
it doesn't replace it, it's a safety net for the cases where you
explicitly signal "this matters" and want it captured regardless of
whether the model separately decides to store it.

### Duplicates

Writes are never rejected for duplicates - cleanup is
`memory_consolidate`'s job, run on demand. Pass `dryRun: true` to preview
exactly what a real run would remove, without deleting anything - review
the output, then call again without `dryRun` to commit. (The preview
reflects the corpus at that moment; if memories are added in between, a
follow-up real call re-evaluates independently and may not match
exactly.) It runs two passes and reports which one found each removed
group:

- **`[wording]`** - trigram content similarity (>=80%): catches
  restatements that share most of their wording (the old
  FTS-on-first-60-chars rule missed 28 such pairs on the real corpus).
- **`[meaning]`** - embedding cosine similarity
  (`embeddinggemma:300m`, >=0.83): catches the same fact stated in
  completely different words, which trigram similarity structurally
  cannot reach. Only memories that have an embedding participate, and
  templated auto-generated content (background-task status logs,
  session-compaction summaries, per-app checklist entries) is excluded -
  real-corpus testing found that boilerplate sentence shapes drive
  cosine similarity high between genuinely different facts (different
  task IDs, sessions, apps).
- **`[meaning-uncertain]`** - a pair that matched by meaning, but with a
  specific number, path, or name that differs between them (a rate limit
  of 100 vs 500; two different file paths). Close enough to look like a
  duplicate, different enough that deleting either side could lose a
  real fact - so neither is touched. Review the pair yourself and use
  `memory_update` if it turns out to be the same fact after all.

Both passes (`[wording]`, `[meaning]`) keep the newest of every group and
delete the rest (capped at 25 groups per pass per run), returning the
removed texts so the agent can merge back any unique detail with
`memory_update`. `[meaning-uncertain]` pairs are the exception - nothing
is deleted, they're only reported. Both passes refuse to cluster across
a project boundary that `memory_forget`/`memory_update` already won't
cross. Near-duplicates are also collapsed out of the
injected block automatically between consolidations. The wording pass
needs the trgm index; fresh installs from [`deploy/`](./deploy) get it
automatically, existing databases run the upgrade block in
[`deploy/README.md`](./deploy/README.md). The meaning pass needs the
`embedding` column populated - rows Ollama never reached simply aren't
candidates for it.

The 0.83 meaning-similarity threshold was calibrated and independently
re-verified against two different embedding models (the original
`bge-m3` and the current `embeddinggemma:300m`) - both land on the same
value, and `embeddinggemma:300m` actually shows a cleaner separation
between duplicates and distinct pairs than `bge-m3` did.

If the database is unreachable, memory injection is skipped and the
tools return a generic error - a slow or dead database never blocks a
model request.

### Supersede tracking

A correction or a reverted decision used to leave the OLD memory in
place, discoverable by recall/injection exactly like a current fact -
the only signal it was reverted was a *later*, unrelated memory
narrating the change in prose, which recall/injection have no reason to
always return together. `memory_remember` now takes an optional
`supersedes: <id>`: the new memory is inserted and the old one is marked
`superseded_by` in a single transaction (either both happen or neither
does - a rejected supersede, e.g. across a project boundary, rolls back
the whole write). A superseded memory is excluded from `memory_recall`
and injection by default - it is not deleted, just no longer treated as
current - and stays visible with `memory_recall`'s `includeSuperseded:
true`, annotated with what replaced it. `memory_consolidate` also skips
superseded rows entirely on both passes: they are already a resolved,
explicit decision, not an accidental duplicate to guess about. Forgetting
the *newer* memory un-supersedes the old one (`ON DELETE SET NULL`)
rather than leaving a dangling reference; forgetting or updating the
superseded memory itself works as normal, since ownership checks are
separate from "is this current".

## Development

```bash
bun install
bun run check      # biome lint
bun run typecheck  # tsc --noEmit
bun test           # integration suite, needs a live Postgres with pg_trgm
```

Enable the commit hooks once per clone
([pre-commit](https://pre-commit.com)):

```bash
pre-commit install
```

It runs lint and typecheck on commits that touch `.ts` files. `bun test`
is left out of the hook because it writes to a real database - CI runs
it against a throwaway Postgres service container instead.

There's also a retrieval benchmark (`bench/`) that measures
recall/latency of candidate retrieval strategies against synthetic data
with known ground truth - see [`bench/README.md`](./bench/README.md) if
you're evaluating a ranking or retrieval change.
