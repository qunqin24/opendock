# ocpg

Postgres-backed persistent memory plugin for [OpenCode](https://opencode.ai).

## What it does

ocpg gives your OpenCode agent memory that survives across sessions and projects. Every memory is a row in one Postgres `memories` table. Three things happen around it:

**1. Memories get in - three ways**
- The agent calls `memory_remember` when it decides something is worth keeping.
- You say "remember that…", "don't forget…", or "keep in mind…" in a prompt, and the text after the phrase is stored verbatim. This is a fixed regex, not a model call - deterministic and auditable. Questions ("remember when X broke?") are deliberately skipped.
- On write, the row is embedded (bge-m3 via Ollama) fire-and-forget, so a slow or dead embedder never delays the write confirmation.

**2. Memories come back - automatically, ranked by relevance to what you just asked.**
Before every model request, ocpg reads your latest message and runs two searches at once:
- **Keyword search** - your prompt becomes an OR-of-stemmed-words Postgres full-text query.
- **Embedding search** - the same prompt is embedded and compared by cosine similarity (pgvector HNSW).

The two ranked lists merge: the vector list's **top 2 rows are reserved unconditionally**, and the rest is filled by reciprocal rank fusion (RRF, k=60). This is why phrasing something differently than you originally stored it still finds the memory - the keyword half alone can't do that. Near-duplicates are collapsed out, the top 5 survive, and they're injected into the system prompt as a `<persistent-project-memory>` block.

If Ollama is unreachable, the vector half is skipped and search silently degrades to keyword-only. If the database is unreachable, injection is skipped entirely. Neither ever blocks or fails a model request - the injection query has a hard 1s deadline.

**3. Duplicates get cleaned up - on demand, never automatically.**
Writes are never rejected. `memory_consolidate` is the cleanup tool, and you (or the agent) run it when you want. It makes two passes - trigram wording similarity, then embedding meaning similarity - keeps the newest of each duplicate group, and **returns the text of everything it deleted** so nothing is lost silently.

### Scoping: the one concept worth understanding

Every memory has a **type**, and the type decides who can see it:

- `stack_fact` - about your tooling, portable across every project using the same stack ("our Terraform RDS module needs `ignore_changes`"). Visible everywhere.
- `project_fact` (the default) - true about this specific project/customer only ("customer A's staging DNS is flaky"). Visible **only from its origin project**.

The test when storing something: *would this help in a different customer's repo using the same tools?* Yes → `stack_fact`. No → `project_fact`.

### Using it well

- **Let the agent store things, but say "remember that…" when it matters.** The keyword trigger is a guarantee; the agent's own judgment is not.
- **Get the type right.** A `project_fact` that should have been a `stack_fact` is invisible in every other project - that's the most common way a useful memory goes missing.
- **Run `memory_consolidate` occasionally**, not constantly. It's cheap and it shows you what it removed before you lose anything.
- **Phrase recall queries naturally.** Hybrid search means you don't have to remember your original wording - meaning-based matching covers the gap.
- **Keep memories self-contained.** "Use jose, not jsonwebtoken, for Edge compatibility" survives out of context; "we decided on the second option" does not.

---

Uses the `memories` table (`content`, `tags`, `session_id`, `project`, `created_at`, `search_vector`, `embedding`, `memory_type`, `access_count`, `last_accessed_at`, `updated_at`) and the `pg_trgm` + `vector` extensions, and exposes `memory_recall` / `memory_remember` / `memory_forget` / `memory_update` / `memory_consolidate` tools.

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

Need a Postgres instance? The [`deploy/`](./deploy) directory ships a hardened Docker Compose setup (localhost-only, `memories` schema auto-created on first boot, plus an optional Ollama service as the embedding backend) - see [`deploy/README.md`](./deploy/README.md).

Configure the connection via shell environment variables:

```bash
export OCPG_HOST="localhost"
export OCPG_PORT="5432"
export OCPG_USER="ocpguser"
export OCPG_PASSWORD="your-postgres-password"
export OCPG_DB="ocpg"
export OCPG_SSL="disable"
```

| Env var         | Default      |
| --------------- | ------------ |
| `OCPG_HOST`     | `localhost`  |
| `OCPG_PORT`     | `5432`       |
| `OCPG_USER`     | `ocpguser`   |
| `OCPG_DB`       | `ocpg`       |
| `OCPG_SSL`      | `disable`    |
| `OCPG_INJECTION`| `relevance`  |
| `OCPG_OLLAMA_HOST` | `localhost` |
| `OCPG_OLLAMA_PORT` | `11434`    |
| `OCPG_EMBED_MODEL` | `bge-m3`    |

`OCPG_PASSWORD` is **env-only** by design - never read from plugin options, and the plugin spawns no processes to fetch it from a secret manager.

`OCPG_SSL` accepts `disable`, `prefer`, `require`, `verify-ca`, or `verify-full` (anything else falls back to `disable`). It defaults to `disable` for the usual localhost setup - **set it to `require` or stricter whenever `OCPG_HOST` is not local**, otherwise the password handshake crosses the network in plaintext.

Anything under `"options"` in `opencode.json` is ignored - configuration is env-only.

## How memory works

Visibility is **type-based**:

| Type           | Visibility                    | What it's for                                  |
| -------------- | ------------------------------ | ---------------------------------------------- |
| `stack_fact`   | Global                         | True about the tooling/stack itself - portable to any project using the same stack (a Terraform module quirk, a Helm convention) |
| `project_fact` | Origin project only (default)  | True about this specific project/customer only; pass `global: true` on `memory_recall` to reach across projects |
| `episodic`     | Reserved, unused                | -                                              |

`memory_forget` / `memory_update` follow the same rule: a foreign project's `project_fact` is off-limits (the call fails and names the owning project); the global type (`stack_fact`) is maintainable from any project.

`access_count` and `last_accessed_at` are updated on every `memory_recall` read but nothing currently ranks by them - they're collected as data for possible future use, not consumed by any ranking today. (An access-frequency ranking was tried and reverted: bumping exactly the returned top-5 created a rich-get-richer loop where a few rows pinned the top slot after a handful of runs.)

## How injection picks memories

By default the block is **relevance-ranked, not recency-ranked**: the user's latest prompt is turned into a full-text query (OR of stemmed words) over every **visible** memory (global types from anywhere, `project_fact` from its origin project), ranked by relevance with a small same-project tiebreak, top 5 injected - each line labeled with its origin project. When neither search half matches the prompt, it falls back to the latest visible memories, newest first. Near-duplicate memories (>=80% trigram content similarity) are collapsed out of this block automatically before the top 5 are chosen, so five near-identical restatements of one fact won't crowd out everything else. Injected content is truncated to 600 characters per memory.

Set `OCPG_INJECTION=recency` to restore the old blind-last-5 behavior instead: no prompt-matching, just the most recent visible memories.

Retrieval is **hybrid**: the prompt runs through keyword full-text search and, when Ollama is reachable, through embedding search (bge-m3, pgvector HNSW, cosine) - the two ranked lists merge with 2 reserved embedding slots plus reciprocal rank fusion (k=60) for the rest (bench-verified: R=2 recovers half the real-corpus paraphrase gap at zero synthetic cost), so exact-word hits and said-differently paraphrase hits both surface. The internal benchmark shows hybrid recall never worse than either half alone at 485/5k/50k rows ([`bench/README.md`](./bench/README.md)). Writes are embedded fire-and-forget; rows from before this feature carry no embedding until `bun run backfill` fills them (see [`deploy/README.md`](./deploy/README.md)).

If Ollama is unreachable - or the database predates the embedding column - search silently degrades to keyword-only; nothing breaks. A cold model load is ~2-3s (over the 1s injection deadline), so the plugin warms the model at session start and pins it with `keep_alive`; a warm embed is ~20ms and runs concurrently with the keyword query.

## Tools

Five agent tools are registered: `memory_remember` (store), `memory_recall` (search), `memory_forget` (delete by id), `memory_update` (rewrite an existing memory, keeping its original learned date), and `memory_consolidate` (remove near-duplicates on demand). The agent reads their usage rules from the tool schemas - as the user, the things worth knowing are:

- Visibility follows the type (see the table above); `memory_recall` takes `global: true` to also search other projects' `project_fact` memories (`stack_fact` is always searched regardless of this flag).
- Duplicate writes are **never rejected** - `memory_remember` is a plain store. Near-duplicates are collapsed out of the injected block automatically, and `memory_consolidate` cleans them up when you ask.

Writes are capped at 4000 characters of content, 10 tags, and 64 characters per tag; oversized writes are rejected with the actual size rather than silently truncated. Memories carry a `type` (`stack_fact`, `project_fact` default, or `episodic` - see the visibility table above).

### Automatic capture

Saying "remember this/that", "remember to ...", "don't forget ...", or "keep in mind ..." in a prompt stores the text following the phrase verbatim, tagged `user-requested` - matched by a fixed pattern, not an LLM call, so it's deterministic and auditable. Questions using the trigger phrase ("remember when the pool broke?") are deliberately not captured, since they're asking about the past, not asking to store something new - only imperative uses ("remember that when X happens, do Y") trigger it.

This runs alongside the model's own judgment to call `memory_remember` - it doesn't replace it, it's a safety net for the cases where you explicitly signal "this matters" and want it captured regardless of whether the model separately decides to store it.

### Duplicates

Writes are never rejected for duplicates - cleanup is `memory_consolidate`'s job, run on demand. It runs two passes and reports which one found each removed group:

- **`[wording]`** - trigram content similarity (>=80%): catches restatements that share most of their wording (the old FTS-on-first-60-chars rule missed 28 such pairs on the real corpus).
- **`[meaning]`** - embedding cosine similarity (bge-m3, >=0.83): catches the same fact stated in completely different words, which trigram similarity structurally cannot reach. Only memories that have an embedding participate, and templated auto-generated content (background-task status logs, session-compaction summaries, per-app checklist entries) is excluded - real-corpus testing found that boilerplate sentence shapes drive cosine similarity high between genuinely different facts (different task IDs, sessions, apps).

Both passes keep the newest of every group and delete the rest (capped at 25 groups per pass per run), returning the removed texts so the agent can merge back any unique detail with `memory_update`. The meaning pass also refuses to cluster across a project boundary that `memory_forget`/`memory_update` already won't cross. Near-duplicates are also collapsed out of the injected block automatically between consolidations. The wording pass needs the trgm index; fresh installs from [`deploy/`](./deploy) get it automatically, existing databases run the upgrade block in [`deploy/README.md`](./deploy/README.md). The meaning pass needs the `embedding` column populated - rows Ollama never reached simply aren't candidates for it.

If the database is unreachable, memory injection is skipped and the tools return a generic error - a slow or dead database never blocks a model request.

## Development

```bash
bun install
bun run check      # biome lint
bun run typecheck  # tsc --noEmit
bun test           # integration suite, needs a live Postgres with pg_trgm
```

Enable the commit hooks once per clone ([pre-commit](https://pre-commit.com)):

```bash
pre-commit install
```

It runs lint and typecheck on commits that touch `.ts` files. `bun test` is left out of the hook because it writes to a real database - CI runs it against a throwaway Postgres service container instead.

There's also a retrieval benchmark (`bench/`) that measures recall/latency of candidate retrieval strategies against synthetic data with known ground truth - see [`bench/README.md`](./bench/README.md) if you're evaluating a ranking or retrieval change.
