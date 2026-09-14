# OpenCode Multidevice Sync

A community fork of `opencode-github-sync` 3.0.1 for moving OpenCode configuration and selected conversations between computers.

**Early preview, not a stable production release.** Keep independent backups. Use one active computer at a time. This project is not affiliated with OpenCode or the upstream author.

[Русская документация](README.ru.md) | [Migration](docs/MIGRATION.md) | [Safety model](docs/SAFETY.md) | [Roadmap](docs/ROADMAP.md)

## What is implemented

- Configuration, skills, plugins and machine-local overrides via a private GitHub repository.
- Selected conversations as compressed JSON shards, never a live SQLite database in Git.
- Non-destructive SQLite UPSERT and preservation of existing project metadata, including `global`.
- Deterministic serialization with canonical ordering; unchanged exports stay byte-identical.
- Whole-batch transactional session import, schema/ownership validation and integrity checks before commit.
- Verified SQLite snapshots before modifying session data, with configurable backup retention.
- Per-session content baselines to detect divergent edits, including message changes without a timestamp change.
- Canonical-to-local path mappings, reversed on export.
- `doctor`, `backup`, offline `restore`, and isolated `--dry-run` previews.
- A local process lock and debounced auto-push. This is **not** a distributed multi-writer lock.

## Requirements

Node.js 22.13+ (24 LTS recommended), Git, GitHub CLI (`gh`), and an initialized OpenCode installation. The plugin dependency is pinned to the OpenCode 1.18.30 SDK. Other OpenCode schema versions require testing; unsupported columns fail closed rather than being silently dropped.

The source-code repository is public. Your **separate sync-data repository must be private**. Do not point the tool at this source-code repository.

## Install from source

```sh
git clone https://github.com/logser13/opencode-multidevice-sync.git
cd opencode-multidevice-sync
npm ci
npm run check
npm pack
npm install -g ./opencode-multidevice-sync-0.1.0.tgz
omds --version
```

On Windows PowerShell with script execution disabled, use `npm.cmd` and `omds.cmd`. Changing execution policy is not required.

This repository does not imply an npm registry release. Until a registry release is announced, install the locally built tarball or the reviewed GitHub release asset.

## First device

```sh
gh auth login
omds init my-opencode-config
omds sessions enable
omds doctor
omds push --dry-run
omds push
```

Start OpenCode once before importing conversations so it creates its own database schema and synthetic project. Configuration and session settings are stored in `~/.config/opencode/opencode-sync.jsonc`; the legacy filename is kept for migration compatibility.

## Second device

```sh
gh auth login
omds link YOUR_ACCOUNT/my-opencode-config
omds sessions enable
omds pull --dry-run
omds pull
```

Use a different `machineAlias` on each device. Keep credentials local and review machine-specific paths before starting OpenCode. See `examples/work-laptop.jsonc` and `examples/home-laptop.jsonc`.

## OpenCode plugin

For an installation from a local tarball, find the absolute installed plugin entry:

```sh
npm root -g
# Append /opencode-multidevice-sync/dist/plugin/index.js
```

Add its absolute file URL to the OpenCode `plugin` array, for example `file:///C:/Users/YOU/AppData/Roaming/npm/node_modules/opencode-multidevice-sync/dist/plugin/index.js`. Do not paste this example without adapting the path. Do not run the upstream sync plugin or its old safe-wrapper alongside this plugin.

`autoPullOnStartup` checks for incoming changes at startup. `autoPushOnIdle` is opt-in and waits for a successful initial pull; errors are logged and surfaced as notifications. Restart OpenCode after changes to imported configuration or sessions. Wait for a successful push before switching computers; closing the app or losing the network can interrupt a sync.

## Recovery

```sh
omds doctor --json
omds backup
```

Close every OpenCode process cleanly before restoring:

```sh
omds restore /absolute/path/to/verified-backup.db --offline
```

Restore refuses existing WAL/SHM/journal files rather than deleting them. The current database is backed up first. `--force` does not bypass the offline requirement. Never delete database journals to force a restore.

## Limitations you must understand

A sync transfers history and configuration, not the project's source files, browser profiles, active processes, external tool-output files or API credentials. Transfer project files separately. Path mapping covers session `directory`/`path` and project `worktree`, not every path embedded in message text or tool JSON.

Time/count/size limits select what gets exported. Existing remote shards are not automatically deleted when one device lacks a session or its selection window expires. Git history may retain data even after a file is removed.

A private repository is access control, not end-to-end encryption. Conversations can contain secrets even when credential-file sync is disabled. The credential scanner is a best-effort guard, not proof that a repository is free of secrets.

Conflicting sessions stop the import for manual review. There is no automatic merge of competing conversations. `--dry-run` uses a disposable snapshot and can require additional disk space; previews with `extraPaths` are refused. Local locking does not prevent simultaneous writers on other computers.

## Development and origin

Run `npm run check` for lint, type checking, build and tests. SQLite tests must execute, not silently skip. CI covers supported Node versions on Windows, Linux and macOS.

Based on [doomsday616/opencode-github-sync](https://github.com/doomsday616/opencode-github-sync), version 3.0.1. The original MIT copyright and permission notice remain in [LICENSE](LICENSE). See [NOTICE](NOTICE) for attribution and [CONTRIBUTING.md](CONTRIBUTING.md) for development rules.
