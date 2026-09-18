# ocpg

Postgres-backed persistent memory plugin for [OpenCode](https://opencode.ai).

Uses the `memories` table (`content`, `tags`, `session_id`, `project`, `created_at`, `search_vector`, `memory_type`, `access_count`, `last_accessed_at`, `updated_at`) and the `pg_trgm` extension. Injects the memories most relevant to what you're currently asking into the system prompt, captures deliberate "remember that..." prompts verbatim, and exposes `memory_recall` / `memory_remember` / `memory_forget` / `memory_update` tools.

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

Need a Postgres instance? The [`deploy/`](./deploy) directory ships a hardened Docker Compose setup (localhost-only, `memories` schema auto-created on first boot) - see [`deploy/README.md`](./deploy/README.md).

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

`OCPG_SSL` accepts `disable`, `prefer`, `require`, `verify-ca`, or `verify-full` (anything else falls back to `disable`). It defaults to `disable` for the usual localhost setup - **set it to `require` or stricter whenever `OCPG_HOST` is not local**, otherwise the password handshake crosses the network in plaintext.

<!--
FIXME before merging: the `memories_type_check` CHECK constraint in
deploy/init/01-init.sh (and mirrored in bench/generate.ts) currently allows
only ('preference', 'project_fact', 'episodic') - it does NOT include
'stack_fact'. This README documents stack_fact as a fully working type
below. Either:
  (a) ship the migration adding 'stack_fact' to the constraint first, or
  (b) mark stack_fact as "not yet released" in the table below.
Whichever it is, the "Tools" section's type list further down must match
the visibility table exactly - right now they disagree with each other.
-->

## How memory works

Visibility is **type-based**:

| Type           | Visibility                    | What it's for                                  |
| -------------- | ------------------------------ | ---------------------------------------------- |
| `preference`   | Global                         | Personal to the operator, not about any codebase |
| `stack_fact`   | Global                         | True about the tooling/stack itself - portable to any project using the same stack (a Terraform module quirk, a Helm convention) |
| `project_fact` | Origin project only (default)  | True about this specific project/customer only; pass `global: true` on `memory_recall` to reach across projects |
| `episodic`     | Reserved, unused                | -                                              |

`memory_forget` / `memory_update` follow the same rule: a foreign project's `project_fact` is off-limits (the call fails and names the owning project); global types (`preference`, `stack_fact`) are maintainable from any project.

`access_count` and `last_accessed_at` are updated on every `memory_recall` read but nothing currently ranks by them - they're collected as data for possible future use, not consumed by any ranking today. (An access-frequency ranking was tried and reverted: bumping exactly the returned top-5 created a rich-get-richer loop where a few rows pinned the top slot after a handful of runs.)

## How injection picks memories

By default the block is **relevance-ranked, not recency-ranked**: the user's latest prompt is turned into a full-text query (OR of stemmed words) over every **visible** memory (global types from anywhere, `project_fact` from its origin project), ranked by relevance with a small same-project tiebreak, top 5 injected - each line labeled with its origin project. When nothing matches the prompt, it falls back to the latest visible memories (preferences first, then most recent). Near-duplicate memories (>=80% content similarity) are collapsed out of this block automatically before the top 5 are chosen, so five near-identical restatements of one fact won't crowd out everything else.

Set `OCPG_INJECTION=recency` to restore the old blind-last-5 behavior instead: no prompt-matching, just the most recent visible memories (preferences first).

This is keyword relevance, not embedding-based semantic search - close phrasing wins, paraphrases may not. (An internal benchmark measures this explicitly: paraphrase-only queries currently score ~0 recall regardless of ranking strategy tried, which is the known gap and the number that would justify adding semantic search later.) Note the OR ranking: common words in a prompt surface more rows; the ranking favors rows matching more distinctive terms.

## Tools

Five agent tools are registered: `memory_remember` (store), `memory_recall` (search), `memory_forget` (delete by id), `memory_update` (rewrite an existing memory, keeping its original learned date), and `memory_consolidate` (remove near-duplicates on demand). The agent reads their usage rules from the tool schemas - as the user, the things worth knowing are:

- Visibility follows the type (see the table above); `memory_recall` takes `global: true` to also search other projects' `project_fact` memories (global types are always searched regardless of this flag).
- Duplicate writes are **never rejected** - they land, the injection block collapses them, and `memory_consolidate` cleans them up when you ask: it keeps the newest of each >=80%-similar group and reports the removed texts so the agent can merge any unique fact back.

Writes are capped at 4000 characters of content, 10 tags, and 64 characters per tag; oversized writes are rejected with the actual size rather than silently truncated. Memories carry a `type` (`preference`, `project_fact` default, `stack_fact`, or `episodic` - see the visibility table above); `preference` memories are surfaced first when browsing without a search query.

### Automatic capture

Saying "remember this/that", "remember to ...", "don't forget ...", or "keep in mind ..." in a prompt stores the text following the phrase verbatim, tagged `user-requested` - matched by a fixed pattern, not an LLM call, so it's deterministic and auditable. Questions using the trigger phrase ("remember when the pool broke?") are deliberately not captured, since they're asking about the past, not asking to store something new - only imperative uses ("remember that when X happens, do Y") trigger it.

This runs alongside the model's own judgment to call `memory_remember` - it doesn't replace it, it's a safety net for the cases where you explicitly signal "this matters" and want it captured regardless of whether the model separately decides to store it.

### Duplicates

Writes are never rejected for duplicates. Near-duplicates (>=80% content similarity, measured on the real corpus - the old FTS-on-first-60-chars rule missed 28 pairs) are collapsed out of the injected block automatically, and `memory_consolidate` removes them on demand (keeps the newest of each group, reports removed texts for the agent to merge back). Needs the trgm index; fresh installs from [`deploy/`](./deploy) get it automatically, existing databases run the upgrade block in [`deploy/README.md`](./deploy/README.md).

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

It runs lint and typecheck on commits that touch `.ts` files. `bun test` is left out of the hook because it writes to a real database — CI runs it against a throwaway Postgres service container instead.

There's also a retrieval benchmark (`bench/`) that measures recall/latency of candidate retrieval strategies against synthetic data with known ground truth - see [`bench/README.md`](./bench/README.md) if you're evaluating a ranking or retrieval change.
