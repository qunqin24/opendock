# OpenCode Session Archiver

TUI command and CLI for OpenCode `2.2+` that reduces a session to its native compaction summary and the recent context OpenCode still sends to the model, then prunes the summarized history from the local database. Sessions keep their ID, title, model, permissions, and remain visible in OpenCode.

## Install (TUI)

```bash
opencode plugin add @evgenyzh/opencode-session-archiver
```

Restart OpenCode after installing. The plugin is registered in the global CLI configuration (`~/.config/opencode/cli.json`) and loaded at startup.

For local development, point `cli.json` at the package directory:

```json
{
  "plugins": ["/absolute/path/to/opencode-session-archiver"]
}
```

## Use (TUI)

Run `/archive-session`, review the confirmation, and confirm.

The command:

1. Refuses a child session or an active session.
2. Reuses the latest completed native compaction when it is already the session's current summary, or requests OpenCode's normal compaction once and waits for the `session.compaction.ended` event. The summary itself is produced by OpenCode, never by this plugin.
3. Keeps the native compaction summary and the recent tail OpenCode still uses:
   - OpenCode 2.1+ stores the tail as regular messages and points at the first kept message with `metadata.keepID`. The plugin keeps everything from `keepID` through the compaction and all newer messages.
   - Pre-2.1 compactions embed the recent transcript as `recent` inside the compaction message. The plugin keeps that message unchanged.
   - Compactions without either marker are summary-only; newer messages are still kept.
4. Deletes only the summarized history from the local SQLite database: `session_message` rows below the keep boundary, `session_part` rows for those messages, legacy `message`/`part` rows left over from a V1 migration, and `event` rows before the boundary where the boundary is known. Then runs a passive WAL checkpoint.
5. Deletes subagent child sessions through the supported `remove` API: children referenced by a matching `task` tool part are always removed; orphaned subagent sessions (child title ends with `(@agent subagent)` and matches the child's agent) are removed too. Pass `--keep-children` in the CLI to skip this.
6. Re-reads the session and every expected deleted child and reports an error if OpenCode leaves any survivor.

User-created forks and manually created child sessions are never removed. Cancelling the confirmation leaves the session history unchanged, though a compaction requested by that run may remain.

## CLI

The same package ships a standalone CLI:

```bash
npx -y @evgenyzh/opencode-session-archiver@0.4.0 list --older-than 30d
npx -y @evgenyzh/opencode-session-archiver@0.4.0 archive ses_abc ses_def --yes
npx -y @evgenyzh/opencode-session-archiver@0.4.0 archive --all --older-than 60d --min-size 10MB --dry-run
npx -y @evgenyzh/opencode-session-archiver@0.4.0 archive --all --older-than 60d --min-size 10MB --yes
npx -y @evgenyzh/opencode-session-archiver@0.4.0 vacuum
```

Requirements: Node.js 22+ and a running local OpenCode background service (`opencode service start`). The CLI reads the service URL and password from `~/.local/state/opencode/service.json`; use `--server`/`--password` for a custom local service.

Commands:

- `list` shows top-level sessions, total messages, removable history, the recent tail that will be kept, and a state (`ready`, `compact`, `clean`, `empty`, `active`).
- `archive <sessionID...>` archives explicit sessions.
- `archive --all` selects every matching top-level session. At least one of `--older-than`, `--min-size`, `--project`, `--directory`, or `--search` is recommended; `--limit` caps the result.
- `vacuum` runs SQLite `VACUUM` manually. The archive command only runs it with `--vacuum`.

Filters: `--older-than 12h|30d|6w|ISO-date`, `--min-size 10MB`, `--project <id>`, `--directory <path>`, `--search <text>`, `--limit <n>`.

Archive options: `--dry-run`, `--yes`/`-y`, `--keep-children`, `--concurrency 1-4` (default 1), `--vacuum`, `--json`, `--quiet`.

Safety:

- The CLI refuses non-local servers because it prunes the local database.
- Before any native compaction it verifies that the newest API message exists in the local database. If the database is out of sync, the session is skipped instead of being compacted without the ability to prune it.
- Active, empty, and already-clean sessions are skipped.
- Failures are reported per session; the rest of the batch continues. The exit code is non-zero if any session failed.
- `--json` requires `--yes` for an actual run; use `--dry-run --json` for a machine-readable plan.

Compaction uses the session's model (or `agents.compaction.model`) and costs tokens. Sessions with a current compaction are pruned without a model call. If a provider quota is exhausted, that session fails and the batch continues.

## Limits

Only messages are pruned. The session keeps its ID, title, model, permissions, and visibility.

OpenCode V2 has no public API for deleting messages, and its experimental `session.import` refuses an existing session ID, so the plugin edits the local database directly. The archive therefore runs only against a local OpenCode installation with a reachable database; when the database is unavailable the command refuses instead of leaving a half-archived session.

Neither deleting rows nor the passive checkpoint shrinks the database file on disk: free pages are reused, and reclaiming space requires an offline `VACUUM`. The TUI never runs `VACUUM`; the CLI only runs it with `--vacuum` or the `vacuum` command.

## Development

```bash
npm install
npm run check
npm run spike   # isolated V2 server on a temporary database

node dist/cli.js list
node dist/cli.js archive --all --older-than 90d --dry-run
```

The spike starts a throwaway OpenCode server, verifies that direct message pruning is visible to the running server and survives a restart, and exercises compaction when a provider is reachable.

## License

MIT
