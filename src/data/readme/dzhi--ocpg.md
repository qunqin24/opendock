# ocpg


Postgres-backed persistent memory plugin for [OpenCode](https://opencode.ai).

Uses the existing `memories` table (`content`, `tags`, `session_id`, `project`, `created_at`, `search_vector`) and the `pg_trgm` extension. Injects recent project memories into the system prompt and exposes `memory_recall` / `memory_remember` / `memory_forget` tools.

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

Configure the connection via environment variables, e.g. in `~/.zshenv`. Any Postgres user and database name will do - use whatever names fit your setup and mirror them here:

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

**Password is env-only.** The plugin never reads config files, options, or external secret managers - set `OCPG_PASSWORD` in your shell environment (e.g. via direnv/.envrc, however you source your secrets).

`OCPG_SSL` accepts `disable`, `prefer`, `require`, `verify-ca`, or `verify-full` (anything else falls back to `disable`). It defaults to `disable` for the usual localhost setup - **set it to `require` or stricter whenever `OCPG_HOST` is not local**, otherwise the password handshake crosses the network in plaintext.

## Tools

- `memory_remember` - store a memory (`content`, `tags`, `force`); rejects near-duplicates within the project
- `memory_recall` - search past memories (`query`, `tags`, `global`, `limit`)
- `memory_forget` - delete a memory of the current project by id

Memories are project-scoped by working directory; use `global: true` on recall to search across projects. `tags` on recall matches rows carrying *all* the given tags — tags aren't covered by full-text search, so this is the only way to reach them.

Writes are capped at 4000 characters of content, 10 tags, and 64 characters per tag; oversized writes are rejected with the actual size rather than silently truncated.

`memory_forget` only ever deletes within the calling project, so an id from another project matches nothing.

### Duplicate detection

`memory_remember` rejects a new memory when the project already holds one with trigram similarity ≥ 0.8, reporting the score and the existing id. Pass `force: true` to store it anyway.

This needs the `pg_trgm` extension. Fresh installs from [`deploy/`](./deploy) get it automatically; on an existing database run once:

```sql
CREATE EXTENSION pg_trgm;
```

Without it, `memory_remember` returns an error naming this exact fix.

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
