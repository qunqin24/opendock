![Git That Shit logo](./gitthatshit.jpeg)

# @gitdamnit/opencode-git-that-shit

> "Oh Shit Git" is what you say after the disaster. Git That Shit is what the tool does *before* the disaster.

Automatic pre-disaster snapshots for OpenCode AI coding agent config and state files.

## What is Git That Shit?

Git That Shit is a safety plugin for [OpenCode](https://opencode.ai) V2 AI coding sessions. It automatically
snapshots fragile configuration and agent state files into a separate shadow git repository before risky operations.

The product exists because one malformed JSON edit, one whitespace-sensitive config mistake, one bad agent command, or
one accidental overwrite can break an entire coding environment. Git That Shit makes those failures recoverable. It is
both an OpenCode **plugin** and a standalone **`gts` CLI** that shares the same snapshot engine.

## Why it exists

AI coding agents operate with elevated privileges over project files. Unlike human developers who hesitate before
destructive acts, agents execute commands confidently — and sometimes catastrophically.

**Why project git is not enough:**

- Git is not always present
- Config files are often in `.gitignore` or untracked
- Git records changes *after* they happen, not *before*
- Most users don't commit before every risky operation

Git That Shit is inspired by **etckeeper** — the Linux tool that automatically commits `/etc` to git before package
manager operations.

## What it protects

By default, Git That Shit tracks:

- `opencode.json`, `opencode.jsonc` — OpenCode config
- `.opencode/state/checkpoint.json`, `.opencode/state/handoff.md`,
  `.opencode/state/checkpoint-history.json`, `.opencode/state/strangerdanger-audit.jsonl` — agent state
- `package.json`, `tsconfig.json`, `jsconfig.json`
- Build configs (`vite.config.ts`, `webpack.config.js`, `rollup.config.js`, `eslint.config.js`, `prettier.config.js`,
  `biome.json`, `turbo.json`, `pnpm-workspace.yaml`)
- Container configs (`Dockerfile`, `docker-compose.yml`)
- `.env.example`, `.env.sample`, `.env.template` — env templates (never real `.env` files)

## What it does NOT protect

- **Not a replacement for project git** — use project git for code
- **Not a general backup system** — focused on config/state files only
- **Not secret management** — real secrets are excluded and redacted, but this is not a vault
- **Not cloud sync** — local git only
- Does not copy live databases (see *Interoperability*)

---

## Installation

```bash
npm install @gitdamnit/opencode-git-that-shit
```

> **v0.3.0 distribution note.** `v0.3.0` is published as a GitHub release
> ([`v0.3.0`](https://github.com/gitdamnit/opencode-git-that-shit/releases/tag/v0.3.0)).
> npm publication of `0.3.0` is **pending**, so until it lands `npm install`
> resolves to the latest version published on npm (`0.2.2`). To use `0.3.0`
> immediately, install from the GitHub release source archive and run
> `npm run build`.

## OpenCode V2 plugin setup

Git That Shit targets **OpenCode 2.0.x** and depends on `@opencode/plugin` 2.0.21. Add it to `opencode.json(c)`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["@gitdamnit/opencode-git-that-shit"]
}
```

With options, or from a local checkout during development:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "@gitdamnit/opencode-git-that-shit",
      "options": {}
    },
    "./plugins/git-that-shit"
  ]
}
```

The plugin id is `gitdamnit.git-that-shit`. It is a V2 plugin using
`Plugin.define({ id, setup(ctx) })`; the V1 `@opencode-ai/plugin` interface is no longer used.

> **V1 users:** V1 plugin functions do not run in V2. See *Migrating from V1* below.

---

## How it works

### Shadow git repository

Git That Shit creates an **isolated shadow git repository** that is completely separate from your project's `.git`.

| Item | Canonical location |
| --- | --- |
| Shadow repo | `.git-that-shit/git-that-shit/snapshots/` |
| Config | `.git-that-shit/git-that-shit/config.json` |
| Manifest | `.git-that-shit/git-that-shit/snapshots/.git-that-shit/manifest.jsonl` |
| Lock | `.git-that-shit/git-that-shit/snapshots/.gts.lock` |

The nested `git-that-shit/git-that-shit` path is historical, but it is what every existing snapshot repository on disk
already uses, so it remains canonical. Older builds documented `.git-that-shit/snapshots/`; on first use Git That Shit
**migrates** such a repository to the canonical location instead of orphaning it.

Your project's git history stays clean: shadow commits never appear in your normal `git log`, and the shadow repo only
stores config/state snapshots.

### Automatic triggers (OpenCode V2)

| Trigger type | V2 mechanism | Snapshot type |
| --- | --- | --- |
| Destructive git command | `ctx.tool.hook("execute.before")` | `pre-op` |
| Risky package-manager op | `ctx.tool.hook("execute.before")` | `pre-risky-op` |
| Config/file edit | `ctx.tool.hook("execute.before")` | `pre-edit` |
| Edit tool completed | `ctx.tool.hook("execute.after")` | `post-edit` |
| File changed out of band | `ctx.event.subscribe("filesystem.changed")` | `post-edit` (debounced) |
| New session | `ctx.event.subscribe("session.created")` | `session-start` |
| Context compaction | `ctx.event.subscribe("session.compaction.ended")` | `post-compact` |
| Manual / restore | CLI or `gts_snapshot` / restore | `manual`, `pre-restore` |

Pre-edit snapshots are taken **before** the edit runs (`execute.before`); post-edit snapshots are taken **after** the
edit completes (`execute.after`). A snapshot is never labelled `pre-edit` when it was actually taken after the edit.

> **Verified against OpenCode 2.0.21:** post-edit snapshots are driven by `ctx.tool.hook("execute.after")`.
> The public `filesystem.changed` event is only emitted for out-of-band filesystem changes, **not** for agent tool
> writes, so it is registered as a debounced fallback rather than the primary post-edit signal.

### Migrating from V1

The V1 plugin API was replaced by a domain-based V2 API. The hook migration is not a mechanical rename:

| V1 hook | V2 API |
| --- | --- |
| `tool.execute.before` | `ctx.tool.hook("execute.before", …)` |
| `file.edited` | `ctx.tool.hook("execute.after", …)` (verified: `filesystem.changed` does not fire for agent tool writes) |
| `session.created` | `ctx.event.subscribe()` → `session.created` |
| `session.compacted` | `ctx.event.subscribe()` → `session.compaction.ended` |
| returned `event` hook | `ctx.event.subscribe()` |
| returned `dispose()` | cleanup function returned from `setup` |
| `tool` map / `tool()` helper | `ctx.tool.transform(editor => editor.add({ input: <JSON Schema>, … }))` |

---

## CLI usage

The `gts` CLI works without an active OpenCode session and uses the same engine as the plugin:

```bash
gts status              # Show status
gts list                # List recent snapshots
gts diff <hash>         # Show what changed
gts restore <hash>      # Restore (dry-run by default)
gts snapshot            # Manual snapshot
gts prune               # Prune old snapshots (dry-run by default)
gts config              # Show configuration
gts init                # Initialize the shadow repo
gts doctor              # Run health checks
gts version             # Show the packaged version
```

### Restore examples

```bash
gts restore abc1234                 # Dry-run (default)
gts restore abc1234 --yes           # Restore, but skip files changed since the snapshot
gts restore abc1234 --yes --force   # Restore, overwriting conflicting files
gts restore abc1234 --to-temp       # Restore into a temp directory, leave the project untouched
```

Restore semantics:

- **Dry-run** (default) reports what would happen and writes nothing.
- `--yes` restores, but files that differ from the snapshot are treated as **conflicts** and left untouched.
- `--force` / `--overwrite` overwrites conflicting files. Restore never silently overwrites your current work.
- **Redacted files are never restored.** A snapshot stores `[REDACTED]` placeholders instead of real secret values,
  so restoring them would destroy live credentials. Redacted files are skipped and reported; re-enter secrets manually.
- A `pre-restore` recovery snapshot is recorded automatically before a restore (unless `--force`).

### Prune

```bash
gts prune                 # Preview what would be pruned
gts prune --keep 20       # Preview keeping the newest 20
gts prune --keep 20 --yes # Actually prune
```

Prune protects the newest `keep` snapshots and:

1. writes a safety `git bundle` of the entire shadow repo before touching anything, then
2. rewrites the shadow history to keep only those snapshots, atomically moving the branch, then
3. rebuilds the manifest so every remaining entry references a real commit.

Because history is rewritten, surviving snapshot hashes change. The safety bundle (`prune-backup-*.bundle` under
`.git-that-shit/git-that-shit/`) is your recovery path.

---

## Configuration

Config lives at `.git-that-shit/git-that-shit/config.json`:

```jsonc
{
  "version": "0.1",
  "tracking": {
    "include": ["opencode.json", "opencode.jsonc", ".opencode/state/*.json", "*.config.js"],
    "exclude": [],
    "allowSensitiveFiles": false
  },
  "destructiveOps": {
    "riskyPackageManagerOps": true,  // snapshot before npm/yarn/pnpm/bun install
    "configWrites": true             // snapshot before config file edits
  },
  "fileEdits": {
    "mode": "pre-if-available",      // pre-if-available | post-only | disabled
    "debounceMs": 2000               // debounce for post-edit snapshots
  },
  "secrets": {
    "redactKeys": ["token", "apiKey", "password", "secret", "credential"],
    "warnOnSensitive": true
  },
  "snapshot": {
    "maxFileSizeMb": 10,             // skip files larger than 10 MB
    "minDiskSpaceMb": 100,           // fail if less than 100 MB free
    "gitTimeoutMs": 30000,           // subprocess timeout for shadow-repo git operations
    "failureMode": "standard"        // standard | strict (see below)
  },
  "restore": {
    "autoPreRestoreSnapshot": true   // snapshot before a restore
  }
}
```

---

## Snapshot failure behavior

A protective snapshot is created before risky operations, but snapshots can fail (no disk space, a locked project,
repository corruption, a timeout, an unreadable file). Git That Shit never claims a snapshot exists unless the commit
was **verified** to resolve in the shadow repository, and it never blocks a harmless command because the snapshot
engine is unhealthy.

Two configurable modes (`snapshot.failureMode`):

| Mode | Behavior when a required snapshot cannot be created |
| --- | --- |
| **`standard`** (default) | The requested operation **continues**. A clear, credential-free warning is emitted, and no recovery point is claimed. |
| **`strict`** (opt-in) | Git That Shit **attempts to block** exclusively classified *destructive* operations (e.g. `git reset --hard`, `git clean -fd`, `rm -rf`). Risky package-manager operations, config writes and harmless commands are never blocked. |

In strict mode, blocking uses the OpenCode V2 `permission.evaluate` gate: when the protective snapshot for a specific
tool call fails, that **exact** tool call is denied with an explanatory message. Two honest caveats are documented in
`docs/INTEROP.md`:

- The `execute.before` *tool hook* returns `void` and **cannot** veto an operation; only `permission.evaluate` can.
- The SDK does not specify the ordering of `permission.evaluate` relative to `execute.before`, so blocking is
  **best-effort**. If no permission gate is exposed, strict mode **fails open**, logs that the operation was *not*
  blocked, and does not pretend otherwise.

Strict mode also makes the restore path fail closed: a restore whose mandatory pre-restore snapshot cannot be created is
refused (unless `--force`). This path is guaranteed because Git That Shit owns it.

---

## Secret handling

Git That Shit treats secrets as a first-class concern:

1. **`.env` files are excluded** — real env files are never tracked
2. **Sensitive filenames blocked** — `*.pem`, `*.key`, `id_rsa`, `credentials.json`, `*.sqlite`, `*.db` and more
3. **Structured redaction** — JSON values under secret-like keys become `[REDACTED]`, including deeply nested keys
4. **Text redaction** — YAML/TOML/`.env`-style/`.jsonc`/shell files are line-redacted for `key: value`, `key=value`,
   `Authorization: Bearer …` headers, and multiline PEM private-key blocks
5. **Global config is always redacted** — the global OpenCode config is redacted before being stored as
   `global-opencode/*`
6. **Fail closed** — if a file cannot be safely processed (for example malformed JSON), it is **skipped**, never stored
   raw
7. **No secret logging** — secret values never appear in logs, tool output, or errors

Git That Shit does **not** rewrite historical commits to remove secrets. If a secret was committed before redaction was
fixed, it remains in the shadow history. Report it and rotate the credential; see `docs/SECURITY.md`.

---

## Concurrency and multiple sessions

Multiple OpenCode sessions and CLI processes can operate on the same project safely:

- Every snapshot/restore/prune runs under a single **project-scoped exclusive lock**.
- Lock acquisition is **atomic** (exclusive file create), so two processes can never both hold the lock.
- Stale locks (dead process or older than 30 s) are detected and reclaimed; a process only removes a lock it can prove
  is stale.
- The snapshot manifest is written atomically and each entry records the **originating session id**.
- There is one project-wide shadow history; sessions are tracked as metadata, not separate repositories.

---

## Independence and interoperability

Git That Shit is designed to be installed and operated completely on its own. It is one of three independently
developed OpenCode plugins (Git That Shit, Stranger Danger, Checkpoint Orchestrator) and it shares no code, runtime,
storage, or initialization with the others.

### Independence guarantees

- **Works alone.** It functions with no companion plugin installed.
- **Works in any combination.** It works alongside each other plugin, or both, in any load order.
- **No ordering assumptions.** Correctness never depends on another plugin running before or after it. It never
  requires a companion to initialize first, and a missing, disabled, failed, or outdated companion cannot prevent it
  from working.
- **No shared framework.** It depends only on `@opencode/plugin` and Node built-ins. It does not import any other
  plugin's modules and does not require a plugin manager or shared runtime.
- **Read-only hooks.** Its hooks never mutate the tool event (`event`/`event.input`). They are purely additive.
- **Failure isolation.** Snapshot failures, malformed project files, and absent companions are caught and logged; they
  never surface as tool failures or affect other plugins.
- **Namespaced.** Configuration lives at `.git-that-shit/git-that-shit/config.json`, the shadow repository at
  `.git-that-shit/git-that-shit/snapshots/`, and logs are prefixed `[git-that-shit]`.

### Pre-operation protection

`ctx.tool.hook("execute.before", …)` is **awaited** by OpenCode before the tool executes, so a pre-operation snapshot
completes before the risky operation runs. Verified against OpenCode 2.0.21: a deliberately delayed `execute.before`
hook retained the tool until the hook (including the snapshot commit) returned. (Note: the tool part's `time.start` is
recorded when the call is created, before hooks run; execution completes after the hook returns.)

The `execute.before` hook is **awaited, but it cannot veto** the tool: its callback returns `void` and there is no
documented throw-to-block contract. Pre-execution *blocking* therefore uses the separate `permission.evaluate` gate and
is only available in **strict mode**; see [Snapshot failure behavior](#snapshot-failure-behavior) and `docs/INTEROP.md`.

### Companion behavior

| Companion state | Git That Shit behavior |
| --- | --- |
| Stranger Danger absent | Fully functional; redacts secrets independently |
| Checkpoint Orchestrator absent | Fully functional; snapshot history independent |
| Both absent | Fully functional |
| Companion disabled/failed | Fully functional; failures are isolated |
| Companion data malformed | Non-fatal; malformed files fail closed or are skipped |

### Companion matrix (expected results)

| Configuration | Expected result |
| --- | --- |
| Git That Shit alone | Fully functional |
| Stranger Danger + Git That Shit | Both functional |
| Git That Shit + Checkpoint Orchestrator | Both functional |
| All three plugins | All functional |

### Specific companions

- **Checkpoint Orchestrator** (migrating to SQLite): Git That Shit does **not** copy live SQLite databases. `.sqlite`,
  `.sqlite3`, `.db`, `*.db-wal`, and `*.db-shm` are hard-excluded to avoid capturing a database mid-write. It may
  back up stable, human-readable handoff files (`.opencode/state/checkpoint.json`, `handoff.md`,
  `checkpoint-history.json`) as ordinary project files. A future integration should use Checkpoint Orchestrator's
  supported backup/export interface; that interface is not yet finalised, so no speculative integration code exists.
  See `docs/INTEROP.md`.
- **Stranger Danger**: Git That Shit does **not** assume Stranger Danger's sanitization runs before it. It redacts
  secrets independently in its own pipeline, so snapshots are safe regardless of ordering. It never mutates tool input
  and never depends on another plugin's processing.
- **Other plugins/agents**: Git That Shit only reads project config/state files and writes its own shadow repository.
  It does not modify other projects, other plugins' storage, or global configuration.

### Optional interoperability (implemented, no dependency)

The only cross-plugin interaction is **read-only observation of well-known human-readable project state files** for
backup purposes. These files are project files, not another plugin's private storage; if they are absent or malformed,
Git That Shit still works. This is a path-based, versioned-by-convention interface with no imports and no shared state.

---

## Doctor

```bash
gts doctor
```

Health checks include git availability, config validity, shadow repo validity, local git config, manifest readability
and validity, stale-lock detection, disk space, global config presence, sensitive files, and project git independence.

---

## Plugin tools

The plugin registers eight tools, callable directly in OpenCode:

| Tool | Purpose |
| --- | --- |
| `gts_status` | Shadow repo path, snapshot count, last snapshot, version |
| `gts_list` | List recent snapshots |
| `gts_diff` | Diff introduced by a snapshot |
| `gts_restore` | Restore (`dry_run`/`yes`/`force`/`to_temp`) |
| `gts_snapshot` | Manual snapshot |
| `gts_prune` | Preview or prune (`keep`/`yes`) |
| `gts_config` | Effective configuration |
| `gts_doctor` | Health diagnostics |

All destructive tools are safe by default: `gts_restore` is a dry run unless `dry_run:false` **and** `yes:true`, and
`gts_prune` only previews unless `yes:true`.

---

## Testing

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # tsc --noEmit
npm run build       # clean + tsc
npm test            # bun test
```

The suite contains **322 tests** across 24 files covering snapshots, snapshot-failure behavior, restore behavior and
restore security, filesystem permissions, concurrency, security, prune, CLI, packaging, independence/interoperability,
and the OpenCode V2 plugin surface (including strict-mode pre-execution blocking). Tests are hermetic and use isolated
`/tmp` directories and an isolated global-config directory.

Test framework: `bun test`.

### Docker Plugin Test Lab compatibility

Git That Shit is designed to be exercised by an external, Docker-based OpenCode Plugin Test Lab without any special
integration framework inside the plugin:

- Runs under an **isolated OpenCode V2 runtime** (`opencode run --standalone` / `opencode serve`) with independent
  `XDG_CONFIG_HOME`, `XDG_DATA_HOME`, `XDG_STATE_HOME`, and `XDG_CACHE_HOME`.
- Works against a **disposable project directory** and a **local mock model provider** (no external network or keys).
- Registers a stable plugin id (`gitdamnit.git-that-shit`), eight tools, and its hooks for automated assertions.
- Owns all of its state under `.git-that-shit/`, so it never contends with other plugins' fixtures.
- Supports concurrency tests (serialized project lock) and the installation combinations in the companion matrix.

Docker is never required for normal operation. The test lab's code is owned separately and is not part of this
repository.

---

## Limitations

- **Prune rewrites history** — surviving snapshot hashes change; a safety bundle is always written first.
- **No cross-machine restore** — snapshots are local only (git bundles are on the roadmap).
- **No selective restore** — restores all files in a snapshot.
- **Fail-closed skips** — malformed JSON config files are skipped rather than stored, because their contents cannot be
  proven secret-free.
- **Redacted files are not restored** — snapshots store `[REDACTED]` placeholders rather than real secret values, so
  restore skips those files and reports them; re-enter secrets manually after a restore.
- **Post-edit signal** — driven by `execute.after`; the `filesystem.changed` event does not fire for agent tool writes
  and is used only as a fallback for out-of-band changes.
- **Disk space check** — requires `minDiskSpaceMb` free or the snapshot fails.
- **Historical secrets** — pre-existing secrets in old shadow commits are not rewritten automatically.
- **Strict-mode blocking is best-effort** — the SDK's `execute.before` hook cannot veto an operation, and the ordering
  of `permission.evaluate` relative to it is unspecified. Strict mode fails open (with a loud warning) when no gate is
  available. Restore's strict check is guaranteed because Git That Shit owns that path.
- **Private storage permissions are POSIX-only** — snapshot directories use `0700` and files `0600` on Linux/macOS.
  Windows has no equivalent POSIX mode; permission enforcement there relies on the platform ACL model.
- **Symlink hardening is best-effort against a local attacker** — restore refuses symlinked destinations and resolves
  the nearest existing ancestor, and writes atomically via `rename` so a symlink cannot be substituted between
  validation and writing. A determined same-user attacker racing the filesystem is still out of scope.

---

## Roadmap

- Bundle export/import for portability
- Selective (single-file) restore
- Integration with Checkpoint Orchestrator's export interface
- Snapshot comparison UI

---

## License

Apache-2.0

---

## Support

1. Run `gts doctor` for diagnostics
2. Inspect `.git-that-shit/git-that-shit/snapshots/.git-that-shit/manifest.jsonl` for history
3. Review `.git-that-shit/git-that-shit/config.json` for configuration
4. See `docs/ARCHITECTURE.md`, `docs/SECURITY.md`, and `docs/INTEROP.md`
