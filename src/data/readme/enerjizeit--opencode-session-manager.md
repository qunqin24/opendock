# OpenCode Session Manager

[![npm version](https://img.shields.io/npm/v/@enerjizeit/opencode-session-manager?color=blue)](https://www.npmjs.com/package/@enerjizeit/opencode-session-manager)
[![npm downloads](https://img.shields.io/npm/dm/@enerjizeit/opencode-session-manager)](https://www.npmjs.com/package/@enerjizeit/opencode-session-manager)
[![license: MIT](https://img.shields.io/npm/l/@enerjizeit/opencode-session-manager?color=green)](https://github.com/EnerJizeIT/opencode-session-manager/blob/master/LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/EnerJizeIT/opencode-session-manager?style=social)](https://github.com/EnerJizeIT/opencode-session-manager)

> **Pin, back up, and restore your opencode AI sessions — never lose a valuable conversation again.**

> 🎬 **Demo screencast coming soon** — pinning, backing up, and restoring a session through chat.

## The problem it solves

Lost an important AI chat? Can't find that session from last week? Sessions piling up, and you can't keep track of what matters?

**OpenCode Session Manager** gives your AI agent a memory layer through session management. You talk in plain language — *"pin this session"*, *"back up the ones about payments"*, *"clean up old sessions"* — and the agent calls the right tool. **No commands to learn.**

## Features

- 📌 **Pin / unpin** — protect the sessions that matter; pinned ones are never auto-deleted.
- 💾 **Back up** — one session or all pinned; survives reinstalls and machine moves.
- ♻️ **Restore** — bring a session back from a backup in one phrase.
- 🧹 **Auto-cleanup** — old non-pinned sessions get backed up, then deleted (pinned always safe).
- 🔍 **Search** — find sessions by title substring.
- ⚙️ **Configure** — cleanup / retention settings; set once and forget.

## Installation

Add the scoped package to your `opencode.json` plugin array — opencode will install it from npm automatically:

```jsonc
// ~/.config/opencode/opencode.json
{
  "plugin": ["@enerjizeit/opencode-session-manager"]
}
```

Restart opencode after adding the plugin.

**Local development:** clone the repo and run `install.sh` to build and install from source:

```bash
git clone https://github.com/EnerJizeIT/opencode-session-manager.git
cd opencode-session-manager && ./install.sh
```

## Upgrade

opencode **does not auto-upgrade** installed plugins — it pins the version on first
install. To update to a newer release:

```bash
rm -rf ~/.cache/opencode/packages/@enerjizeit/opencode-session-manager
rm -rf ~/.cache/opencode/packages/@enerjizeit/opencode-session-manager@latest
```
Then restart opencode — it re-resolves `@latest` from npm and installs the new version.
(Or pin an exact version in `plugin[]`, e.g. `"@enerjizeit/opencode-session-manager@1.0.7"`.)

## Usage

Write in natural language in the chat — the model invokes the appropriate `sm_*` tool. No slash commands needed.

Example: "pin session ses_abc123", "find session about payment", "clean up old sessions".

See [USAGE.md](https://github.com/EnerJizeIT/opencode-session-manager/blob/master/USAGE.md) for full scenario reference.

## Architecture

- **CLI-first** — all session operations go through `opencode` CLI, not direct SQL.
- **Backup-then-delete** — sessions are only removed after a successful backup.
- **Backup envelope** — format: `{version, exportedAt, backupOf, session}`; formalized in `backup-schema.json`.
- **Protected backups** — pinned and orphaned backups (session no longer in DB) are protected forever.
- **Hooks** — `session.idle` triggers auto-cleanup and retention (1h debounce); `session.deleted` cleans the pinned list.
- **Migration** — `version` field in state + `migrateState` for future schema changes.

## Combo with opencode-mem

[opencode-mem](https://github.com/tickernelz/opencode-mem) is a plugin for persistent AI agent memory across sessions using a local vector DB (SQLite + USearch).

| Session Manager | opencode-mem |
| --- | --- |
| Pin/unpin sessions | Semantic search across context |
| Backup/restore sessions | Auto-capture key decisions from sessions |
| Auto-cleanup old sessions | Vector DB with compaction |
| Session lifecycle | Long-term agent memory |

Session Manager protects sessions from loss; opencode-mem extracts knowledge from them for future sessions. Together they cover the full lifecycle: creation → context extraction → preservation → restoration.

## Documentation

- [USAGE.md](https://github.com/EnerJizeIT/opencode-session-manager/blob/master/USAGE.md) — usage scenarios and tool reference
- [USAGE.ru.md](https://github.com/EnerJizeIT/opencode-session-manager/blob/master/USAGE.ru.md) — usage scenarios (Russian)
- [README.ru.md](https://github.com/EnerJizeIT/opencode-session-manager/blob/master/README.ru.md) — Russian README

## License

MIT — see [LICENSE](https://github.com/EnerJizeIT/opencode-session-manager/blob/master/LICENSE).
