# OpenCode Session Archiver

CLI plugin for OpenCode `2.0+` that reduces the current root session to its native compaction summary, then deletes the leftover messages, purges their history from the local database, and removes subagent children — all only after explicit confirmation.

## Install

```bash
opencode plugin add @evgenyzh/opencode-session-archiver
```

Restart OpenCode after installing. The plugin is registered in the global CLI configuration (`~/.config/opencode/cli.json`) and loaded at startup.

For local development, point `cli.json` at the built module:

```json
{
  "plugins": ["/absolute/path/to/opencode-session-archiver/dist/tui.js"]
}
```

## Use

Run `/archive-session`, review the confirmation, and confirm.

The command:

1. Refuses a child session or an active session.
2. Reuses the latest completed native compaction when it is already the session's current summary, or requests OpenCode's normal compaction once and waits for the `session.compaction.ended` event.
3. Keeps only the native compaction message, which carries both the summary and the recent transcript.
4. Deletes every other message from the local SQLite database because OpenCode V2 exposes no message-deletion API.
5. Deletes subagent child sessions through the supported `remove` API: children referenced by a matching `task` tool part are always removed; orphaned subagent sessions (child title ends with `(@agent subagent)` and matches the child's agent) are removed too, since they lost their task evidence when the parent was archived earlier.
6. Re-reads the session and every expected deleted child and reports an error if OpenCode leaves any survivor.
7. Purges pre-compaction history from the local SQLite database: V2 `session_message` rows other than the compaction message, legacy `message`/`part` rows left over from a V1 migration, and `event` rows below the compaction boundary. Then runs a passive WAL checkpoint.

User-created forks and manually created child sessions are never removed: they carry neither task evidence nor the subagent naming pattern. Cancelling the confirmation leaves the session unchanged.

## Limits

The session keeps its ID, title, model, and permission. Only its messages are pruned to the compaction.

OpenCode V2 has no public API for deleting messages, and its experimental `session.import` refuses an existing session ID, so the plugin edits the local database directly for that step. The archive therefore runs only against a local OpenCode installation with a reachable database; when the database is unavailable the command refuses instead of leaving a half-archived session.

Neither deleting rows nor the passive checkpoint shrinks the database file on disk: free pages are reused, and reclaiming space requires an offline `VACUUM`. The plugin never runs `VACUUM`.

## Development

```bash
npm install
npm run check
npm run spike   # isolated V2 server on a temporary database
```

The spike starts a throwaway OpenCode server, verifies that direct message pruning is visible to the running server and survives a restart, and exercises compaction when a provider is reachable.

## License

MIT
