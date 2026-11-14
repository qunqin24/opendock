# SessionPort

Local-first encrypted checkpoint and restore for OpenCode sessions.

**Local-first 0.1.9.** `opencode-session-port` 0.1.9 is published on npm and is the current `latest`. See the [npm package](https://www.npmjs.com/package/opencode-session-port) and the [release record](docs/local-release-0.1.9.md).

SessionPort saves a project's session state to a password-protected artifact and restores it on Windows, macOS, or Linux. This release is for local self-use. SessionPort does **not** provide a hosted cloud service and its built-in cloud sync is paused; the encrypted artifact is a normal file, so you can store it in your own cloud drive and restore it on another supported machine.

## What it preserves

- One encrypted artifact per checkpoint, created from the selected project's current OpenCode session state.
- Checkpoints keep root sessions and a user-selected subset of subagent sessions: all sessions, only subagents created after the project's most recent compaction (default), the last N root sessions plus all of their subagents, or a chosen number of recent subagents. The chooser reads root-session dates (metadata only) and marks the option it recommends. `Last N root sessions` with `N = 1` keeps **one root session plus every subagent that descends from it** — a 15-session restore is normally 1 root + 14 subagents, not 15 roots. Older sessions are excluded from the artifact and are **not** deleted from the host; the report states the kept/excluded counts. This is the checkpoint weight policy recorded in [the retention evidence](docs/evidence/checkpoint-retention-20261113.md) and [the root-session evidence](docs/evidence/root-session-retention-20261113.md).
- Restore into the same Windows, macOS, or Linux host and project, after an explicit preview and confirmation. You choose whether to keep existing sessions (safe copies; nothing is deleted) or replace only sessions the safety checks prove unchanged. Parent/child links are preserved, so restored subagents stay nested under their root instead of appearing as top-level sessions.
- Recovery artifacts for current state, created and decrypt-verified before any old target is deleted.

A checkpoint is local backup material; SessionPort does not provide a hosted cloud backup or a replacement for source control. Keep project files in Git or another backup system you already trust.

## Scope

- **Windows, macOS, and Linux** are supported targets; the plugin registers on all three. Recorded automated evidence is Windows-first (OpenCode **2.1.1** native and **2.1.3** isolated); macOS/Linux behavior is owner-verified in local use, not yet recorded as a CI platform matrix. A separate bounded restore-function run used stock **2.1.3** Linux over its public HTTP bridge. See [recorded 0.1.7 evidence](docs/evidence/local-release-017-20261025.md).
- Artifacts use the existing experimental crypto/artifact profile (historically named `sessionport-experimental-win-v1`; the name is historical, not a platform restriction). The format and crypto parameters are unchanged; post-0.1.7 changes raise only the experimental size caps so long-session projects fit, as recorded in [the long-session evidence](docs/evidence/long-session-checkpoint-20261112.md).
- The plugin makes no direct OpenCode-database writes, no LLM calls, and never replays historical tools. It never runs Git commands.
- No cloud deployment, runtime acceptance, production, or high-assurance claim is made.

## Install

Installation uses OpenCode's CLI plugin system, not a project-local config.

1. OpenCode's TUI plugins live in the **global CLI config**: `~/.config/opencode/cli.json`, or `$XDG_CONFIG_HOME/opencode/cli.json` when that variable is set. There is no project-local `cli.json`.
2. Merge the plugin entry into an existing `plugins` array; do not replace other preferences:

   ```json
   {
     "plugins": ["opencode-session-port"]
   }
   ```

3. Restart OpenCode so the CLI loads the plugin.

The package's existing `./tui` export is the compiled entry point. Use the package name exactly as shown; do not add a `/tui` suffix, and do not pin a version in this config.

**Registry resolution.** OpenCode resolves the registry's current package version; this README does not pin or promise it. This read-only check reports what npm serves without credentials:

```sh
npm view opencode-session-port version
```

Official references: [CLI plugins](https://opencode.ai/v2/docs/build/plugins/cli) and [CLI configuration](https://opencode.ai/v2/docs/cli/config).

### Optional sidebar quick actions

SessionPort can add two clickable shortcuts to OpenCode's session sidebar: **Checkpoint** and **Restore**. They dispatch the same native commands as `/checkpoint` and `/restore`, so dialogs, errors, and confirmations are identical. This is off by default and is not configured in a file.

Turn it on from inside OpenCode:

1. Run `/sessionport` or open the command palette and choose **SessionPort settings**.
2. Toggle **Sidebar quick actions** to `on`.

The same settings modal includes **Delete older checkpoints**: it scans the active project's `.sessionport` directory, keeps the newest checkpoint, and deletes the older `checkpoint-*.sessionport` files after confirmation. Recovery backups, non-checkpoint files, directories, and symlinks are never deleted; checkpoints outside `.sessionport` are untouched.

The choice is stored in OpenCode's plugin storage and survives restarts. No `cli.json` edit is required.

- The actions appear in the `sidebar.footer` slot, so built-in footer content is preserved.
- The sidebar is 42 columns and has no keyboard focus; these are pointer buttons only. `/checkpoint`, `/restore`, and the command palette remain the keyboard paths.
- They are hidden whenever OpenCode hides the sidebar (child sessions, narrow terminals with `session.sidebar: "auto"`, or `session.sidebar: "hide"`).
- OpenCode 2.0.22's built-in `/settings` list is static and not plugin-extensible. SessionPort therefore provides its own native settings modal from the command palette; it is not injected into the host's `/settings` page.

Implementation and limits: [optional sidebar evidence](docs/evidence/optional-sidebar-actions-20261113.md).

## Commands

```text
/checkpoint [output path]
/restore [artifact path]
/sessionport
```

- `/checkpoint` writes one encrypted artifact for the selected project. Without a path, the default is a UTC-timestamped `.sessionport` file under **`PROJECT/.sessionport/`**.
- `/restore` restores from an explicit artifact path. With no argument, it uses the latest checkpoint in the project's `.sessionport/` directory.
- `/sessionport` opens the native SessionPort settings modal (optional sidebar quick actions).
- Flow: choose the project, enter the artifact password, review the preview, then confirm explicitly. Nothing is replaced or deleted before that confirmation.

Example:

```text
/checkpoint
# writes PROJECT/.sessionport/checkpoint-<UTC>.sessionport

/restore
# previews the newest checkpoint; confirm to continue

/restore PROJECT/.sessionport/checkpoint-2026-10-25T12-00-00Z.sessionport
# restore a specific artifact
```

A checkpoint is an older encrypted payload, not a backup of the current target. A fresh encrypted recovery artifact is required before replacing current state.

## Restore safety

1. The imported candidate must be complete and verified.
2. The preview lists the exact destination targets before any mutation.
3. Before deleting the current old target, SessionPort creates an encrypted backup of that target and decrypt-verifies it. If backup creation or verification fails, nothing is deleted.
4. Deletion is limited to targets confirmed standalone, settled, unchanged, and free of fork/revert, parent/child, and incoming-reference risk. Pending, changed, error, unknown-reference, and incomplete-inventory states block delete.
5. An uncertain delete is read back and reconciled once; there is no blind retry loop.
6. Exact duplicates, and the same normalized session content already present under a different derived ID, are skipped without importing. A content match is duplicate evidence only: a skip never deletes, overwrites, or merges. See [two-machine dedup evidence](docs/evidence/two-machine-dedup-20261113.md).
7. A portable lineage stamp (`info.metadata.sessionport`) lets a session continued on another computer update its existing local copy under the same session ID. The existing session is deleted only after an encrypted recovery backup is verified; the continuation is then imported once. If that import fails, the recovery file is the only restore path; there is no rollback or atomicity claim. See [lineage update evidence](docs/evidence/two-machine-lineage-update-20261113.md).
8. A diverged lineage is never merged or overwritten. SessionPort preserves both versions as a copy. A destination with child/fork/revert or incoming message references is also kept as a copy rather than updated in place.
9. If the old target is absent, restore imports only; it never deletes a source on another machine.
10. For a graph/fork/revert case, SessionPort creates a standalone copy, flattens only known fork/revert metadata, keeps the original, and shows a warning. This is not native graph preservation.
11. Restore is not atomic and has no CAS/TOCTOU guarantee. Manual quiescence is required: do not edit sessions or run agents while a restore is in progress.
12. Backups are encrypted copies, not secure erasure of older data.

**Portable lineage.** On import, SessionPort may add one namespaced metadata key to the imported session: `info.metadata.sessionport = { version: 1, lineageID }`. It preserves all other metadata and never overwrites a valid existing stamp. The key lets a session continued on another computer find its local counterpart without relying on derived session IDs. It is identity metadata, not session content; the duplicate-content fingerprint excludes it. A record with malformed or foreign metadata is imported unchanged rather than having that metadata replaced.

**Recovery artifacts.** Restore reports the path of the encrypted recovery artifact it creates; keep it until the restored state is confirmed. The intended naming is `recovery-...sessionport`, but the exact integrated filename and path are pending and not promised here. Use the path shown in the report, and pass it explicitly to `/restore` when needed.

## Crypto and host boundary

The artifact format and crypto are the existing experimental profile (historically named `sessionport-experimental-win-v1`; the name is historical, not a platform restriction). This release adds no parameters and has no plaintext fallback. Recorded automated compatibility evidence is bounded to the OpenCode 2.1.1 native and 2.1.3 isolated Windows results, plus owner-reported macOS/Linux local use. Treat other host versions and unrecorded platform combinations as unverified.

**Recorded 0.1.7 evidence (2026-10-25).** Three package-consumer scenarios installed the same 85-file tarball (one performed a native import/load check); the local source suite recorded `976 pass / 1 skip / 0 fail` plus a passing typecheck. Bounded restore-function cases ran on stock OpenCode 2.1.3 over its public HTTP bridge - not a packaged-TUI or native-2.1.1 proof. Local test success is not hosted-CI success. Details and hashes: [docs/evidence/local-release-017-20261025.md](docs/evidence/local-release-017-20261025.md).

## Limits and non-claims

- Limited local mode is accepted for this release; it is **not** M1/HOST-01 full acceptance.
- No production durability, secure-erasure, atomicity, or CAS guarantee is made.
- Fork/revert handling is a standalone-copy workaround, not native graph preservation and not tool replay. Parent/child (subagent) sessions are preserved by the restore flow.
- Recorded automated evidence is Windows-based; macOS/Linux are owner-verified local targets, not yet recorded as a CI platform matrix. Cross-OS artifact interchange is owner-reported, not yet backed by recorded automated tests.
- Local test success is not hosted-CI success, and no green-CI claim is made; see the recorded evidence for the current CI caveat.
- Cloud sync is not part of this release.

## Cloud status: paused

SessionPort does **not** provide a hosted cloud service. Cloud/V2 work is paused until host issues are fixed. Cloud code, sync state/outbox source, and evidence are preserved for future work, but the built-in sync (`/sync`) remains deferred engine wiring rather than a user-facing function and is not active or published in this release. See [docs/V2/README.md](docs/V2/README.md).

This does **not** prevent using your own cloud storage: the encrypted `.sessionport` artifact is a normal file, so you can upload it to your own drive and download it on another supported machine. That manual transfer is not the paused `/sync` feature; cross-OS artifact interchange is owner-reported and not yet backed by recorded automated tests.

## Documentation

- [docs/local-release-0.1.9.md](docs/local-release-0.1.9.md) - authoritative current local-release policy, status, and non-claims.
- [docs/local-release-0.1.8.md](docs/local-release-0.1.8.md) - published 0.1.8 release policy and receipt, retained as historical.
- [docs/local-release-0.1.7.md](docs/local-release-0.1.7.md) - published 0.1.7 release policy and receipt, retained as historical.
- [docs/evidence/local-release-017-20261025.md](docs/evidence/local-release-017-20261025.md) - recorded 0.1.7 source, package, and bounded runtime evidence with claim boundaries.
- [docs/archive/cloud/m3-launcher-preparation-20261024.md](docs/archive/cloud/m3-launcher-preparation-20261024.md) - archived 2026-10-24 M3 launcher preparation, preserved as historical evidence and not current direction.
- [docs/README.md](docs/README.md) - documentation index, including archived V1 and paused V2 material.
