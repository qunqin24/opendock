# SessionPort

Local-first encrypted checkpoint and restore for OpenCode sessions.

**Local-first 0.1.7.** `opencode-session-port` 0.1.7 is the local-first release described here. Registry availability is governed by npm, not this README: check the [npm package](https://www.npmjs.com/package/opencode-session-port) and [release status](https://github.com/maivand-rahmani/opencode-session-port/releases).

SessionPort saves a project's session state to a password-protected artifact and restores it on the same Windows host. This release is for local self-use. Cloud sync is paused and is **not** part of the 0.1.7 claim.

## What it preserves

- One encrypted artifact per checkpoint, created from the selected project's current OpenCode session state.
- Restore into the same Windows host and project, after an explicit preview and confirmation.
- Recovery artifacts for current state, created and decrypt-verified before any old target is deleted.

A checkpoint is local backup material, not a portable cross-platform export, a cloud backup, or a replacement for source control. Keep project files in Git or another backup system you already trust.

## Scope

- Windows only, with bounded evidence on OpenCode **2.1.1** (native) and **2.1.3** (isolated); there is no Linux/macOS or cross-OS compatibility claim. A separate bounded restore-function run used stock **2.1.3** Linux over its public HTTP bridge; it is not a packaged-TUI, native-2.1.1, or Linux-support proof. See [recorded 0.1.7 evidence](docs/evidence/local-release-017-20261025.md).
- Artifacts use the existing experimental Windows crypto/artifact profile. Format, parameters, and caps are unchanged.
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

## Commands

```text
/checkpoint [output path]
/restore [artifact path]
```

- `/checkpoint` writes one encrypted artifact for the selected project. Without a path, the default is a UTC-timestamped `.sessionport` file under **`PROJECT/.sessionport/`**.
- `/restore` restores from an explicit artifact path. With no argument, it uses the latest checkpoint in the project's `.sessionport/` directory.
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
6. Exact duplicates may be skipped. A skip never deletes.
7. If the old target is absent, restore imports only; it never deletes a source on another machine.
8. For a graph/fork/revert case, SessionPort creates a standalone copy, flattens only known fork/revert metadata, keeps the original, and shows a warning. This is not native graph preservation.
9. Restore is not atomic and has no CAS/TOCTOU guarantee. Manual quiescence is required: do not edit sessions or run agents while a restore is in progress.
10. Backups are encrypted copies, not secure erasure of older data.

**Recovery artifacts.** Restore reports the path of the encrypted recovery artifact it creates; keep it until the restored state is confirmed. The intended naming is `recovery-...sessionport`, but the exact integrated filename and path are pending and not promised here. Use the path shown in the report, and pass it explicitly to `/restore` when needed.

## Crypto and host boundary

The artifact format and crypto are the existing experimental Windows profile; this release adds no parameters and has no plaintext fallback. Compatibility evidence is bounded to the recorded OpenCode 2.1.1 native and 2.1.3 isolated Windows results. Treat other hosts, other host versions, and cross-OS artifact interchange as unverified.

**Recorded 0.1.7 evidence (2026-10-25).** Three package-consumer scenarios installed the same 85-file tarball (one performed a native import/load check); the local source suite recorded `976 pass / 1 skip / 0 fail` plus a passing typecheck. Bounded restore-function cases ran on stock OpenCode 2.1.3 over its public HTTP bridge - not a packaged-TUI or native-2.1.1 proof. Local test success is not hosted-CI success. Details and hashes: [docs/evidence/local-release-017-20261025.md](docs/evidence/local-release-017-20261025.md).

## Limits and non-claims

- Limited local mode is accepted for this release; it is **not** M1/HOST-01 full acceptance.
- No production durability, secure-erasure, atomicity, or CAS guarantee is made.
- Fork/revert handling is a standalone-copy workaround, not native graph preservation and not tool replay.
- Windows bounded evidence only; no Linux/macOS host support or cross-OS artifact interchange claim.
- Local test success is not hosted-CI success, and no green-CI claim is made; see the recorded evidence for the current CI caveat.
- Cloud sync is not part of this release.

## Cloud status: paused

Cloud/V2 work is paused until host issues are fixed. Cloud code, sync state/outbox source, and evidence are preserved for future work, but sync remains deferred engine wiring rather than a user-facing function. `/sync` is not active or published in this release. See [docs/V2/README.md](docs/V2/README.md).

## Documentation

- [docs/local-release-0.1.7.md](docs/local-release-0.1.7.md) - authoritative current local-release policy, status, and non-claims.
- [docs/evidence/local-release-017-20261025.md](docs/evidence/local-release-017-20261025.md) - recorded 0.1.7 source, package, and bounded runtime evidence with claim boundaries.
- [docs/archive/cloud/m3-launcher-preparation-20261024.md](docs/archive/cloud/m3-launcher-preparation-20261024.md) - archived 2026-10-24 M3 launcher preparation, preserved as historical evidence and not current direction.
- [docs/README.md](docs/README.md) - documentation index, including archived V1 and paused V2 material.
