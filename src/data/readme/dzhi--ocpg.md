# ocpg


Postgres-backed persistent memory plugin for [OpenCode](https://opencode.ai).

Uses the existing `memories` table (`content`, `tags`, `session_id`, `project`, `created_at`, `search_vector`). Injects recent project memories into the system prompt and exposes `memory_recall` / `memory_remember` tools.

## Install

In `opencode.json`:

```json
{
  "plugin": [
    ["@dzhi/ocpg", {}]
  ]
}
```

## Connecting to the database

Pass connection params as the plugin options tuple (all optional):

```json
{
  "plugin": [
    [
      "@dzhi/ocpg",
      {
        "host": "localhost",
        "port": 5432,
        "user": "pguser",
        "database": "agent-memory"
      }
    ]
  ]
}
```

Precedence: plugin options > env vars > defaults.

| Param      | Env var (fallback) | Default        |
| ---------- | ------------------ | -------------- |
| `host`     | `OCPG_HOST`        | `localhost`    |
| `port`     | `OCPG_PORT`        | `5432`         |
| `user`     | `OCPG_USER`        | `pguser`       |
| `database` | `OCPG_DB`          | `agent-memory` |

**Password is never set via params** — it resolves from `OCPG_PASSWORD`.

## Tools

- `memory_remember` — store a memory (dedups against similar entries per project)
- `memory_recall` — search past memories (`query`, `global`, `limit`)

Memories are project-scoped by working directory; use `global: true` on recall to search across projects.
