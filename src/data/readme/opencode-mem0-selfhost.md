# opencode-mem0-selfhost

> Persistent memory for [OpenCode](https://opencode.ai), backed by a self-hosted
> [Mem0](https://docs.mem0.ai/open-source/setup) REST server.
> [Install from npm](https://www.npmjs.com/package/opencode-mem0-selfhost) — no build required.

A community-maintained self-host fork of the official
[`@mem0/opencode-plugin`](https://github.com/mem0ai/mem0/tree/main/integrations/mem0-plugin/.opencode-plugin).
The hooks, tool names, slash skills, scope model, and memory context injection are
all preserved; only the `mem0ai` SDK call layer is swapped for a small REST
client that talks to your self-host server. The plugin sends no data to
Mem0's hosted platform.

---

## Table of contents

- [What this is — and isn't](#what-this-is--and-isnt)
- [Why a fork?](#why-a-fork)
- [Status](#status)
- [Install](#install)
- [Configure](#configure)
- [What's included](#whats-included)
- [Self-host caveats](#self-host-caveats)
- [Differences from the official plugin](#differences-from-the-official-plugin)
- [What changed from upstream](#what-changed-from-upstream)
- [Verify](#verify)
- [Troubleshooting](#troubleshooting)
- [Keeping in sync with upstream](#keeping-in-sync-with-upstream)
- [Development](#development)
- [Credits and license](#credits-and-license)

---

## What this is — and isn't

The mem0 project ships three things that are sometimes called "self-host":

| Project | What it is | Port | API path | This plugin works against it? |
|---|---|---|---|---|
| [`server/`](https://github.com/mem0ai/mem0/tree/main/server) | FastAPI REST server, the documented self-host bundle (API + dashboard) | 8888 (Compose), 8000 (raw Docker) | `/memories`, `/search`, `/entities` — no `/v1/` prefix | **Yes — this is the target** |
| [`openmemory/`](https://github.com/mem0ai/mem0/tree/main/openmemory) | Separate self-hostable platform (FastAPI + Qdrant + Next.js dashboard) with its own API | 8765 | `/api/v1/...` | No — different endpoints, different auth |
| `mem0ai` Python SDK self-hosted mode | In-process library (`from mem0 import Memory`); no HTTP at all | — | — | No — different concept entirely |

This plugin only targets the `server/` Docker stack. The official
[`docs/open-source/setup`](https://docs.mem0.ai/open-source/setup) page
describes that stack.

## Why a fork?

The official plugin (`@mem0/opencode-plugin`) is hardcoded to call the
[Mem0 Platform](https://app.mem0.ai) using the `mem0ai` SDK. There is no
documented way to point it at a self-host server. The hooks, tool
definitions, and skill set are all reusable as-is — only the SDK call
layer needs replacing. That's what this fork does.

## Status

- **Published on npm** as [`opencode-mem0-selfhost`](https://www.npmjs.com/package/opencode-mem0-selfhost)
  (latest = 0.1.4). CI builds and publishes automatically on every
  `vX.Y.Z` tag via [npm OIDC trusted publishing](https://docs.npmjs.com/trusted-publishers).
- **Tested against source, not yet against a running server.** Every
  endpoint, request shape, and response shape was cross-checked against
  `mem0/server/main.py`, `mem0/server/routers/entities.py`, and the docs at
  `mem0/docs/open-source/{setup,features/rest-api}.mdx`. End-to-end
  integration testing against a live `docker compose up` stack is the
  next step — PRs welcome.
- 63 unit tests pass (`bun test`).
- Type-check clean (`bun run type-check`).
- Build produces a 0.49 MB ESM bundle (`bun run build`).

---

## Install

OpenCode loads plugins in three ways: from npm, from a local file, or
from a directory. The npm install is the recommended one. See
[opencode.ai/docs/plugins](https://opencode.ai/docs/plugins) for the
full mechanism.

### From npm (recommended)

Add the package to your OpenCode config. Edit `~/.config/opencode/opencode.json`
(for a global install) or `<project>/opencode.json` (for a project-local
install):

```json
{
  "plugin": ["opencode-mem0-selfhost"]
}
```

Restart OpenCode. It will `bun install` the package (and its dependencies)
automatically into `~/.cache/opencode/node_modules/` on first launch. The
plugin registers its memory tools and skills itself — no MCP server to
configure.

The `opencode plugin` CLI command documented in the mem0 integration
guide is shorthand for the same thing.

### Pin a specific version

If you want a reproducible install (recommended for teams), pin the
version:

```json
{
  "plugin": ["opencode-mem0-selfhost@0.1.4"]
}
```

Omit the `@<version>` to track the latest `dist-tag.latest` from npm.

### From a Git checkout (contributors / local dev)

Clone the repo, build, and load the bundle via `file://`:

```bash
git clone https://github.com/imsudip/opencode-mem0-selfhost.git
cd opencode-mem0-selfhost
bun install
bun run build
```

Then point your config at the built bundle:

```json
{
  "plugin": [
    "file:///absolute/path/to/opencode-mem0-selfhost/dist/index.js"
  ]
}
```

This is the path maintainers use while developing. End users should use
the npm install above.

## Configure

```bash
# Required — the X-API-Key value your self-host server accepts.
# Per-user keys are prefixed `m0sk_`; the legacy `ADMIN_API_KEY` is also
# accepted. See "Self-host caveats" below for JWT auth.
export MEM0_API_KEY="m0sk_your-key"

# Optional — base URL of your self-host Mem0 server.
# Default is the Docker Compose port; override for raw Docker / uvicorn.
#   - Docker Compose (`make up` in `server/`): http://localhost:8888
#   - Raw Docker / uvicorn:                 http://localhost:8000
export MEM0_HOST="http://localhost:8888"

# Optional — stable user identity. Defaults to $USER / os.userInfo().username.
export MEM0_USER_ID="your-name"

# Optional — override the auto-detected git-remote-based project id.
# The plugin derives this from the git remote (`owner-repo`), falling back
# to the repo root dir name, then the cwd. Override here if those don't
# match what you want stored with the memory.
export MEM0_APP_ID="my-project"

# Optional — disable the auto-dream memory-consolidation scheduler.
# The `/mem0-dream` slash command still works.
export MEM0_DREAM=false

# Optional — opt in to anonymous PostHog usage events.
# Default is OFF. The official plugin defaults to ON; this fork flips it
# because self-host users tend to be more privacy-sensitive.
export MEM0_TELEMETRY=true
```

`MEM0_HOST` accepts `MEM0_SELF_HOST_URL` as a fallback for ergonomics if
you already have it set in your shell.

## What's included

Identical surface to the upstream plugin, minus the cloud-only pieces:

| Component | Description |
|-----------|-------------|
| **9 native memory tools** | `add_memory`, `search_memories`, `get_memories`, `get_memory`, `update_memory`, `delete_memory`, `delete_all_memories`, `delete_entities`, `list_entities`, plus a `get_event_status` compatibility stub (self-host writes are synchronous) |
| **7 lifecycle hooks** | `config`, `chat.message`, `tool.execute.before`, `tool.execute.after`, `experimental.chat.messages.transform`, `experimental.session.compacting`, `shell.env` |
| **9 slash skills** | `/mem0-remember`, `/mem0-tour`, `/mem0-search`, `/mem0-status`, `/mem0-scope`, `/mem0-dream`, `/mem0-forget`, `/mem0-pin`, `/mem0-context-loader` — discovered in place from `opencode-skills/` |
| **Auto-dream** | Gated memory consolidation (time + sessions + memory-count). Opt-out via `MEM0_DREAM=false` or the `dream` block in `~/.mem0/settings.json` |
| **Scope model** | Per-call `scope: "project" \| "session" \| "global"` plus a persistent default set by `/mem0-scope` |

---

## Self-host caveats

These are the practical gotchas that don't show up in the API shape
verification. All confirmed by reading the server source and docs.

### Default port depends on how you run the server

- **Docker Compose** (the documented `make up` path in `server/`) publishes
  internal port 8000 as **8888** on the host.
- **Raw `docker run -p 8000:8000`** and **`uvicorn main:app`** listen on
  **8000** unless you remap.
- The plugin defaults to `http://localhost:8888` (the Compose default). If
  you run the server another way, set `MEM0_HOST` accordingly.

### Auth: per-user `X-API-Key` is what this plugin supports

The self-host server accepts three auth modes:

- `X-API-Key: m0sk_…` (per-user key) — **supported by this plugin**
- `Authorization: Bearer <jwt>` (dashboard session) — **not supported** by
  this plugin. If you want JWT auth (long-running agent that logs in once
  and refreshes), this needs adding. Per-user `m0sk_…` keys are the
  documented "programmatic" path, so most users won't notice.
- `X-API-Key: <ADMIN_API_KEY env value>` (legacy shared key) — works
  with this plugin (it's just an `X-API-Key` header with a different value).
  Prefer per-user keys for new deployments.

### `GET /memories` with no identifier is admin-only

If you somehow call `get_memories` with no `user_id`/`agent_id`/`run_id`
and no `app_id`, the server returns 403 unless the API key has admin role.
The plugin always populates `user_id` from `MEM0_USER_ID` before this
code path is hit, so it doesn't bite in practice. Worth knowing if you
build tooling on top of the plugin.

### No `/health` endpoint

The server has no `GET /health` route. The plugin's `health()` method
pings `/openapi.json` (always 200 when the app is up) then falls back to
`/` (redirect to `/docs`). Use it for connectivity checks; for liveness
probes on the server itself, point your orchestrator at `/openapi.json`.

### No `rerank` parameter

The mem0 Python library's `search()` accepts a `rerank: bool` flag. The
self-host REST server's `SearchRequest` schema does **not** expose it —
it's filtered out at the server before the underlying lib sees it. The
official skills were updated to drop `rerank: true` accordingly.

---

## Differences from the official plugin

A short summary. See the [next section](#what-changed-from-upstream) for
the full file-by-file diff.

- **No `mem0ai` SDK dependency.** All memory operations are plain `fetch`
  calls against `MEM0_HOST`.
- **No phone-home telemetry.** `MEM0_TELEMETRY` defaults to `false`.
  Upstream defaults to `true`.
- **No Platform-specific APIs.** Per-project category configuration,
  `getProject`/`updateProject`, and async `get_event_status` are gone.
  `get_event_status` is a stub that returns `UNSUPPORTED` for skill
  compatibility.
- **`app_id` lives in metadata.** The self-host REST only supports
  `user_id`, `agent_id`, `run_id`, and `metadata` as top-level identity
  fields. The plugin writes `app_id` to `metadata.app_id` and filters by
  it client-side on reads.
- **`delete_all_memories` is a list-then-delete loop.** The server's
  `DELETE /memories` bulk endpoint is admin-only; the plugin fetches
  matching IDs and deletes them one at a time. Works with a regular
  per-user API key.
- **Entity management is real, just at different paths.** `list_entities`
  calls `GET /entities`; `delete_entities` calls
  `DELETE /entities/{type}/{id}`.
- **`update_memory` requires `text`.** The server's `MemoryUpdate` schema
  has `text: str` as required. The plugin reads the current memory first
  if `text` is omitted, so "update metadata only" calls work transparently.

---

## What changed from upstream

A file-by-file diff against
[`mem0ai/mem0` `integrations/mem0-plugin/.opencode-plugin/`](https://github.com/mem0ai/mem0/tree/main/integrations/mem0-plugin/.opencode-plugin).
Upstream SHA tracked in `.upstream-sha` (currently pinned to the
`mem0ai/mem0@main` HEAD this fork was verified against).

### New files

| File | Purpose |
|---|---|
| `selfhost-client.ts` | The whole point of the fork — thin REST wrapper around the self-host server. ~480 lines, typed `Memory` / `Entity` shapes matching the server's Pydantic models. |
| `selfhost-client.test.ts` | 22 unit tests covering host resolution, auth header, `app_id` → `metadata.app_id` migration on `add`, client-side filtering on `getAll` (including `app_id` which the server can't filter), pagination, error formatting with the host in the message, `health()`, and entity endpoints. |
| `.github/workflows/sync-upstream.yml` | Weekly (and on `workflow_dispatch`) check of `mem0ai/mem0@main`; opens a PR with the upstream diff in the body when it changes. |
| `.github/workflows/ci.yml` | `type-check` + `bun test` + `bun run build` + artifact presence on every push/PR. |
| `.upstream-sha` | Pinned upstream SHA used by the sync workflow. |
| `.gitignore` | Excludes `node_modules/` and `dist/` (upstream ships no `.gitignore`). |
| `LICENSE` | Apache-2.0; copyright assigned to the project, not upstream. |

### Files modified

**`package.json`** — new name, repo, keywords; `mem0ai` removed from
`dependencies`; `esbuild` not added; `scripts.build` identical to upstream
(`bun build` + `tsc --emitDeclarationOnly`); `types` points at
`dist/opencode-mem0.d.ts` (the actual emitted file, not `dist/index.d.ts`
which the upstream `types` field incorrectly points at).

**`tsconfig.json`** — unchanged.

**`telemetry.ts`** — opinionated diff:
- `isTelemetryEnabled()` defaults to `false` (was `true`).
- Env-var parsing inverted: accepts `true`/`1`/`yes`/`on` to enable.
- Package name check: `"@mem0/opencode-plugin"` → `"opencode-mem0-selfhost"`.
- Doc comments rewritten to explain the opt-in rationale.

**`opencode-mem0.ts`** — surgical edits (the diff is too long to enumerate
line-by-line here; the commit messages in `git log` walk through them):
- `import {MemoryClient} from "mem0ai"` →
  `import {SelfHostMemoryClient, type Memory} from "./selfhost-client"`.
- Dropped `mkdirSync`/`writeFileSync` from the `fs` import (only used by
  removed code).
- Removed entirely: `CODING_CATEGORIES`, `categoriesFingerprint`,
  `apiKeyFingerprint`, `autoSetupCategories` — the self-host REST has no
  project-category API, so they're not stubbed, just not present.
- `extractMemories` retyped: `res: any` → `res: Memory[] | { results?: Memory[] } | undefined`.
- Client construction: `new MemoryClient({apiKey})` →
  `new SelfHostMemoryClient({apiKey, defaultUserId, defaultAppId})`, and
  the construction line moved to **after** `userId`/`appId` resolution
  so they can be passed as defaults.
- Error message: "Get one at https://app.mem0.ai/dashboard/api-keys" →
  "Set it to the X-API-Key value accepted by your self-host Mem0 server."
- Slash command template: appended a self-host note about sync writes
  and the no-op `get_event_status`.
- `get_event_status` tool returns a static `{status: "UNSUPPORTED", …}`
  JSON instead of calling the SDK's `/v1/event/{id}/` endpoint.
- `delete_entities` and `list_entities` tool descriptions corrected (they
  call real self-host endpoints at `/entities`, not Platform paths).
- Parameter naming: SDK style `topK`/`pageSize` → REST style
  `top_k`/`page_size` (8 call sites).
- `memoryCount` parsing simplified — upstream had a 3-tier fallback
  (count → array length → results length) for legacy SDK responses; we
  just read `count` because the self-host REST always returns
  `{results, count}`.

**`opencode-skills/*/SKILL.md`** — all 9 skills adapted for self-host:
- `remember`, `pin`, `status` — extract the `id` directly from the
  `add_memory` response (no `get_event_status` polling).
- `search`, `tour` — dropped `rerank: true` (not exposed by the server).
- `dream` — swapped the merge order to write-new-then-delete-old (safer
  for sync writes; upstream was delete-then-write to avoid event_id churn).
- `pin` — added `metadata.pinned = true` (so `dream` can detect pinned
  memories without text-parsing).
- `scope`, `forget`, `context-loader` — minor wording tweaks, no logic
  change.

### Files unchanged (byte-identical to upstream)

`scope.ts`, `project.ts`, `dream.ts` — pure logic with no SDK
dependency; copied verbatim and we own the result under the same Apache-2.0
license.

---

## Verify

After installing via npm (or source) and restarting OpenCode:

1. Start OpenCode inside a git repo (so `app_id` resolves from the git
   remote).
2. Ask: *"Search my memories for recent decisions"*
3. If the `mem0_*` tools respond, you're connected.
4. Run `/mem0-status` for a diagnostic summary.

You can also verify the round trip without OpenCode:

```bash
curl -s -X POST "$MEM0_HOST/memories" \
  -H "X-API-Key: $MEM0_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"messages\":[{\"role\":\"user\",\"content\":\"hello\"}],\"user_id\":\"$MEM0_USER_ID\",\"metadata\":{\"app_id\":\"$MEM0_APP_ID\"}}"
```

Expect a JSON body with `results: [{id, memory, ...}]`.

## Troubleshooting

| Problem | Fix |
|---------|-----|
| No tools appearing in OpenCode | Check `~/.config/opencode/opencode.json` (or `<project>/opencode.json`) has `"opencode-mem0-selfhost"` in the `plugin` array, then restart OpenCode. |
| `Connection refused` | Check `MEM0_HOST`. Default is `http://localhost:8888` (Compose). Raw Docker / uvicorn use 8000. |
| `401 Unauthorized` | `echo $MEM0_API_KEY` — the value must match a key your self-host server accepts (per-user `m0sk_…` or `ADMIN_API_KEY` env value). |
| `403 Forbidden` on `delete_all_memories` or `get_memories` with no identifier | API key doesn't have admin role. Use a per-user key (which is what the dashboard setup wizard issues) and pass a `user_id`. |
| Plugin not loading from source build | Verify the `file://` path in `opencode.json` points to `dist/index.js` and that `bun run build` ran without errors. Also check the file is readable. |
| `bun install` step fails when OpenCode auto-installs the npm package | Check your network can reach the npm registry. For air-gapped installs, see the `From a Git checkout` path above. |
| Memories missing project context on search | `app_id` is stored in `metadata.app_id`. Searches must filter on `metadata.app_id`, not top-level `app_id`. The plugin does this automatically. |
| `get_event_status` returns `UNSUPPORTED` | Expected. Self-host writes are synchronous; the `add_memory` response already contains the memory ID. |
| `delete_entities` or `list_entities` 404 on older self-host | Requires `mem0` server ≥ a release that ships `routers/entities.py`. Very old pre-1.x builds may not have it. |

---

## Keeping in sync with upstream

`.github/workflows/sync-upstream.yml` runs weekly (Monday 06:00 UTC) and
on `workflow_dispatch`. It:

1. Clones `mem0ai/mem0@main`.
2. Compares the HEAD to the SHA pinned in `.upstream-sha`.
3. If they differ, opens a PR that:
   - Bumps `.upstream-sha` to the new HEAD.
   - Includes the upstream diff (truncated to ~40 KB) in the PR body, with
     a list of changed files.

The PR is **informational** — porting upstream changes into our source
files is a manual step, because upstream uses the `mem0ai` SDK while we
use a thin REST client. Read the diff, port the relevant changes to
`src/` (likely `opencode-mem0.ts`, `scope.ts`, `dream.ts`, and the
skills), then merge the PR so we don't re-notify for the same upstream
changes.

The diff is small enough that porting is typically a 10–30 minute job
per upstream release. The PR description makes it clear what files
changed upstream.

---

## Development

```bash
bun install              # install deps (uses bun.lock)
bun run type-check       # tsc --noEmit
bun test                 # bun test (63 tests)
bun run build            # bun build + tsc emit-decls → dist/
```

The build produces `dist/index.js` (the bundled plugin) and
`dist/opencode-mem0.d.ts` (types). The bundle is ESM-targeted for Bun.

### Project layout

```
.
├── .github/workflows/   ci.yml, sync-upstream.yml
├── opencode-skills/     9 slash skills (SKILL.md per skill)
├── opencode-mem0.ts     main plugin entry
├── selfhost-client.ts   REST client (the only net-new file)
├── scope.ts             project.ts             dream.ts
├── telemetry.ts
├── *.test.ts            bun:test unit tests
├── package.json
├── tsconfig.json
├── bun.lock
├── .upstream-sha        pinned mem0ai/mem0 SHA
├── .gitignore
├── LICENSE              Apache-2.0
├── README.md
└── CHANGELOG.md
```

### Verification methodology

The REST client was written by reading:

- `mem0/server/main.py` — endpoint paths, request/response Pydantic models,
  auth dependencies (`verify_auth` vs `require_admin`).
- `mem0/server/routers/entities.py` — `/entities` router (list + cascade
  delete). The first round had stubbed entity endpoints as no-ops. Round 2
  fixed
  that.
- `mem0/server/auth.py` — confirmed `X-API-Key` is the API-key auth
  header name.
- `mem0/mem0/memory/main.py` — confirmed the underlying Python lib's
  return shapes (`add()` → `{results: [...]}`, `search()` → list,
  `get_all()` → `{results: [...]}`) so the client's response parsers
  handle them.
- `mem0/docs/open-source/setup.mdx` and
  `mem0/docs/open-source/features/rest-api.mdx` — confirmed the
  public-facing contract (port, paths, auth, no `/v1/` prefix).

End-to-end testing against a live `docker compose up` stack is the
obvious next step. PRs welcome.

---

## Credits and license

- **Upstream**: [`@mem0/opencode-plugin`](https://github.com/mem0ai/mem0/tree/main/integrations/mem0-plugin/.opencode-plugin)
  by [Mem0](https://mem0.ai) and contributors. All credit for the
  hooks, tool definitions, skill set, scope model, and dream consolidation
  design goes to the upstream maintainers. This fork would not exist
  without their work.
- **Self-host server**: the [`mem0ai/mem0/server`](https://github.com/mem0ai/mem0/tree/main/server)
  FastAPI server this plugin targets.
- **This fork**: maintained by the opencode-mem0-selfhost contributors.

**License**: Apache-2.0. See [LICENSE](./LICENSE).

Contributions are welcome — please open an issue before sending a non-trivial
PR so we can agree on the approach first.
