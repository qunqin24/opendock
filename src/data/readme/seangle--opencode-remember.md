# agents-remember

Portable plain-file memory for coding agents: facts, notes, stable memo IDs,
lexical search, and a byte-stable session snapshot — with a host-agnostic core
and one adapter per harness.

The design is lifted from [`pi-remember`](https://github.com/Esensats/pi-remember):
curated knowledge that was expensive to obtain, not transcripts and not todos.
The difference is packaging: the engine no longer knows which agent is calling.
The Pi adapter continues the existing npm name `@seangle/pi-remember`, starting
with the breaking 0.3.0 release. The legacy repository is historical; active
development lives here.

## Install for Pi

```sh
pi install npm:@seangle/pi-remember
```

Already installed? Use `pi update npm:@seangle/pi-remember` (pinned versions stay
pinned). Restart or `/reload` afterward. **Upgrading from 0.2.x requires explicit
store migration**; see the [Pi adapter guide](packages/pi/README.md#upgrading-from-02x),
including the global in-place migration and renamed configuration variables.
Do not load a local/manual copy alongside the npm package.

The core, migrators, and all three adapters are published independently. See
[RELEASING.md](RELEASING.md) for artifact validation and publishing.

## Install for OpenCode

Add the plugin to `opencode.json(c)` (global or project) and run `/reload`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "@seangle/opencode-remember",
      "options": { "dirName": ".agents" },
    },
  ],
}
```

See the [OpenCode adapter guide](packages/opencode/README.md) for store paths,
tool behaviour, and configuration.

## Install for DSH

The bundle is published as `@seangle/dsh-remember`. Point the Plugins page at the
package directory, or use the `plugin_manager` tool's `install_bundle` action;
whether that DSH build can install by npm name directly depends on the host.

```yaml
- id: remember
  name: '@seangle/dsh-remember'
  config:
    dirName: .agents
```

See the [DSH adapter guide](packages/dsh/README.md) for compatibility,
configuration, and the snapshot lifecycle.

## Layout

```
packages/core/       @seangle/remember-core       engine, no host SDK imports
packages/migrators/  @seangle/remember-migrators  migration strategies, also host-free
packages/dsh/        @seangle/dsh-remember        DeepSeek Harness bundle
packages/pi/         @seangle/pi-remember         Pi extension
packages/opencode/   @seangle/opencode-remember   OpenCode server plugin
```

Every adapter is a thin shell over the same engine, and all default to
`<workspace>/.agents/memory`, so a workspace's memory is shared between the
harnesses. The global store stays harness-owned: DSH uses `$DSH_HOME/memory`,
Pi uses `~/.pi/agent/memory`, OpenCode uses `$XDG_DATA_HOME/opencode/memory`.

### Core

| Module | Responsibility |
|---|---|
| `store.ts` | paths, facts, memo IDs, append/update/forget/restore, recovery, notes |
| `notes.ts` | the four-field frontmatter subset, bounded header reads |
| `search.ts` | query-local lexical ranking (no index, no embeddings, no model call) |
| `inject.ts` | byte-stable, middle-truncated snapshot block |
| `workspace.ts` | root validation, store resolution, initialization |
| `migration.ts` | `remember.json` version marker; refuses unmarked content instead of adopting it |

Nothing in `core` imports a coding-agent SDK, and nothing writes outside the
directories it is handed.

### Store

```
<workspace>/.agents/memory/
  MEMORY.md                         # one-line facts with <!-- 2026-10-23T03:09Z [8hex] --> comments
  notes/<YYYY-MM-DD>-<slug>.md      # frontmatter: description, memory-id, created-date, last-modified-date (minute-precision ISO)
  remember.json                     # {"version": 1} store marker
  recovery/<8hex>.json              # undo records for updates and deletions
```

`dirName` is configurable; both adapters default to `.agents`, so the workspace
store is shared. A store with content but no `remember.json` is never adopted
silently: core reports it as needing an explicit migration.

Two harnesses writing one store concurrently is serialized per process, not
across processes. The append path is atomic per write, but a race can still lose
one fact; avoid writing memory from both harnesses at the same moment.

Timestamps are UTC ISO 8601 truncated to the minute (`2026-10-23T03:09Z`).
Stores written earlier may contain seconds or fractional seconds; those values
remain readable and are preserved, while every new stamp is minute precision.

## Migration

Legacy stores are converted by strategies in `packages/migrators`, never by core:

```ts
interface MemoryMigrator {
  id: string;
  detect(source: string): Promise<number | null>;   // cheap, read-only
  plan(source: string, target: string): Promise<MigrationPlan>;  // validates everything first
  apply(plan: MigrationPlan, options?: { dryRun?: boolean }): Promise<MigrationReport>;
}
```

`pi-remember-v1` is the only strategy today. It copies **current knowledge only**:
`MEMORY.md` facts (dropping legacy `#note` reference lines, which the catalogue
derives again) and valid `notes/**/*.md` files with their frontmatter. `recovery/`,
`migrations/`, and any other history directories are left behind. Invalid notes
and duplicate memo IDs are skipped and reported rather than guessed at.

`apply` stages the whole store in a sibling directory and renames it into place,
so a failed migration leaves either the complete target or nothing. An existing
target is refused, never merged. When source and target are the same directory
(a copied `.pi/memory` missing only the marker), the strategy writes just
`remember.json` and touches no content.


## Parity with pi-remember

| Capability | State |
|---|---|
| Facts (`memory_write`, ≤300 chars, duplicate + cross-scope warning) | yes |
| Notes (`memory_store`, four-field frontmatter, slug rules, date prefix) | yes |
| Catalogue reads, ID reads, path reads, substring filter | yes |
| Ranked lexical search with matching-passage counts | yes |
| In-place update with preserved identity and recovery ID | yes |
| Forget with recoverable snapshots | yes |
| Restore / undo, refusing later edits | yes |
| Status: paths, counts, bytes, recoveries, snapshot size | yes |
| Version marker, refusal to adopt unmarked stores | yes |
| `root` per call for another workspace | yes |
| Byte-stable snapshot, 20/80 middle truncation, budgets | yes |
| Legacy store migration (`memory_migrate`, `/memory migrate`) | yes, via `packages/migrators` |
| `/memory` slash command | `status` and `migrate` in both; Pi also has `update` |
| Exit summary | **never implemented** (excluded by request) |
| Old recovery records and migration artifacts | not migrated, not a compatibility goal |

Model-facing behavior is at parity; what differs is only the host seam. The
`/memory` command is a harness UI affordance, and the exit summary is
deliberately absent rather than ported.

## Build

No TypeScript toolchain and no dependencies. The build uses Node's own type
stripping (`node:module.stripTypeScriptTypes`) and rewrites `.ts` specifiers to
`.js`, because runtime hosts load plugins from `node_modules` where Node refuses
to strip types.

```sh
npm run build     # or: node scripts/build.mjs
npm test          # 220 tests: core + migrators + Pi and OpenCode adapters
npm run check       # build, then the same tests
npm run test:packed # isolated tarball install + compiled adapter integration tests
npm run pack        # validated release tarballs in artifacts/
```

Output lands in each package's `dist/`. `dist/` is gitignored; build before
installing either adapter.

The Pi adapter's tests map `@seangle/remember-core` and
`@seangle/remember-migrators` to their sources and stub the host packages, so
`npm test` works without a build or a Pi installation. `npm run check` runs the
build and source tests; `npm run test:packed` additionally verifies the emitted
JavaScript and dependency resolution outside the monorepo.

### Local development

`pnpm install` creates workspace links (`packages/*/node_modules/@seangle`).
Package manifests use registry-compatible version ranges, linked locally
by `linkWorkspacePackages: true`. No external runtime dependencies are needed. The DSH smoke
script additionally needs the host packages resolvable:

```sh
mkdir -p node_modules/@seangle
ln -s <dsh-install>/node_modules/@deepseek-ai node_modules/@deepseek-ai
ln -s ../../packages/core node_modules/@seangle/remember-core
npm run build && npm run smoke
```

## DSH adapter

`@seangle/dsh-remember` is a host-only bundle (no UI):

- **Injection** — on `agent/pre-step`, render the snapshot from the workspace and
  global stores and splice it after the entering user message. A digest of the
  rendered bytes is stored in the message source, so a resumed session does not
  duplicate the snapshot and a changed store refreshes exactly once.
- **Tools** — `memory_init`, `memory_write`, `memory_store`, `memory_read`,
  `memory_search`, `memory_update`, `memory_forget`, `memory_restore`,
  `memory_status`, `memory_migrate`.
- **Migration** — when a legacy store exists and the target has no marker, the
  first turn carries a `<remember-migration>` notice asking the model to obtain
  consent; `/memory migrate` performs it directly. Nothing is written without
  consent.
- **Command** — `/memory [status|migrate]`.
- **Config** — `dirName` (`.agents`), `globalDir` (`$DSH_HOME/memory` when empty),
  `injectCharsGlobal`, `injectCharsLocal`, `autoInject`.

```yaml
- id: remember
  name: '@seangle/dsh-remember'
  config:
    dirName: .agents
    injectCharsLocal: 3000
```

Install from the Plugins page by pointing at `packages/dsh`, or with the
`plugin_manager` tool's `install_bundle` action targeting that absolute
directory after running `pnpm install` and the build at the repository root. The
package is also published as `@seangle/dsh-remember`; use it when that DSH build
can install a bundle from npm. Core and migrators resolve through workspace links
during development, or their published npm versions when the host installs
dependencies itself.

### Model experience

The snapshot is injected once per session, not on every turn. Facts and note
descriptions ride in context; note bodies stay on disk until a `memory_read` or
`memory_search`. Every write returns the memo ID and, for updates and deletions,
a recovery ID.

Compaction counts as losing the snapshot: DSH replaces the visible surface with a
summary, so the next step — even mid-turn — injects a fresh snapshot. Deduplication
reads the surface, not a side table, which is what makes that automatic.

Injected memory is framed as background knowledge, never instructions: memory is
agent-writable, so treating it as authority would turn it into a prompt-injection
channel.

## Pi adapter

`@seangle/pi-remember` is a Pi extension built from the same core:

- **Injection** — `before_agent_start` rebuilds the snapshot and assigns it to
  the named system-prompt section `remember`. Pi wraps that section in
  `<remember>…</remember>` and patches the transcript only when its bytes change,
  so the snapshot is stable between runs and refreshes exactly once after a write.
- **Tools** — the same ten tools, with Pi's `withFileMutationQueue` serializing
  mutations and `truncateTail` bounding output.
- **Migration** — the first run of a session in a workspace with a legacy
  `.pi/memory` store carries the same `<remember-migration>` notice; `/memory
  migrate` performs it directly.
- **Command** — `/memory [status|migrate|update]`; `update` sends the incremental
  review prompt as a follow-up turn.
- **Config** — `REMEMBER_DIR_NAME` (`.agents`), `REMEMBER_GLOBAL_DIR`
  (`~/.pi/agent/memory`), `REMEMBER_INJECT_CHARS_GLOBAL`, `REMEMBER_INJECT_CHARS_LOCAL`,
  `REMEMBER_AUTO_INJECT` (`1` by default).

```sh
pnpm install
node scripts/build.mjs
pi install /absolute/path/to/repo/packages/pi
```

Local packages are loaded from their path without copying, so `dist/` must exist
and the path is recorded in `~/.pi/agent/settings.json`. Rebuild and run `/reload`
after changing the adapter. Remove a previously installed `npm:@seangle/pi-remember`
first: two extensions registering the same `memory_*` tools collide.

## OpenCode adapter

`@seangle/opencode-remember` is an OpenCode V2 server plugin built from the same
core. It imports no host SDK at runtime and registers a plain `{ id, setup }`
object; `@opencode/plugin` supplies types only.

- **Injection** — a `session.hook("context")` appends the snapshot to the system
  prompt for every model call. OpenCode rebuilds that prompt per request and does
  not persist it, so the block is never duplicated, a write is visible on the next
  step, and compaction cannot remove it. Bytes stay identical while the store is
  unchanged, keeping prefix caches warm.
- **Workspace** — the session's `location.directory`, not the plugin's load
  location, so `session_move` and worktrees resolve to their own local store.
- **Tools** — the same ten tools, with a per-`MEMORY.md` promise queue and bounded
  output; recoverable failures return text instead of throwing across the boundary.
- **Migration** — the same `<remember-migration>` notice once per session when a
  legacy `.pi/memory` store exists; `/memory migrate` performs it directly.
- **Command** — `/memory [status|migrate]`, answered with a synthetic message so
  no model turn starts.
- **Config** — plugin options in `opencode.json(c)`: `dirName` (`.agents`),
  `globalDir` (`$XDG_DATA_HOME/opencode/memory`), `injectCharsGlobal`,
  `injectCharsLocal`, `autoInject`.

## Status

- 220 tests pass (187 core, 6 migrators, 12 Pi adapter, 15 OpenCode adapter).
- Adapter suites pass end to end against fake hosts: all ten tools, duplicate
  handling, update → forget → restore round-trip, workspace/root isolation,
  snapshot injection and stability, legacy detection, dry-run migration,
  in-place marker adoption, and the `/memory` command.
- The DSH adapter has been exercised with `npm run smoke` against DSH desktop
  0.2.1-rc.3; its tarball ships the bundle patch, locale files, and icon, with
  host packages declared as peers.
- The Pi adapter has been exercised in a live Pi session. Its integration suite
  also runs against an isolated installation of the published-format tarballs.
- The OpenCode adapter has been exercised in live OpenCode 2.2.0 sessions: the
  tools wrote a fact, a fresh session recalled it from the injected snapshot
  without calling a tool, and `/memory status` and `/memory migrate` answered
  with synthetic messages. Its suite and packed-artifact run cover the host seam
  without a live harness.
- `dist/` must be built before installing any adapter from a local path;
  npm releases already include the compiled JavaScript.

## License

Apache-2.0, same as pi-remember.
