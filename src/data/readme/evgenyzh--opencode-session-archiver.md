# OpenCode Session Archiver

TUI plugin for OpenCode `1.18.21+` that reduces the current root session to its native compaction summary, then deletes the leftover messages, purges their history from the event log, and removes subagent children — all only after explicit confirmation.

## Install

```bash
opencode plugin @evgenyzh/opencode-session-archiver --global
```

Restart OpenCode after installing. The plugin is registered in the TUI configuration, so it is loaded at startup.

For local development, add the source module to `~/.config/opencode/tui.json`:

```json
{
  "plugin": [["/absolute/path/to/opencode-session-archiver/src/tui.tsx", {}]]
}
```

## Use

Run `/archive-session`, review the confirmation, and confirm.

The command:

1. Refuses a child session or an active session.
2. Reuses the latest completed native compaction, or runs OpenCode's normal compaction once if the summary is missing or stale.
3. Keeps only the native compaction pair: the `Compaction` divider and its assistant summary.
4. Deletes every other message in the session through the supported `deleteMessage` API.
5. Deletes subagent child sessions: children referenced by a matching `task` tool part are always removed; orphaned subagent sessions (child title ends with `(@agent subagent)` and matches the child's agent) are removed too, since they lost their task evidence when the parent was archived earlier.
6. Re-reads the session and every expected deleted child and reports an error if OpenCode leaves any survivor.
7. Purges pre-compaction history from the local SQLite database: durable events with a sequence below the compaction pair are deleted, so the event log matches the archived session. Then runs a passive WAL checkpoint.

User-created forks and manually created child sessions are never removed: they carry neither task evidence nor the subagent naming pattern. Cancelling the confirmation leaves the session unchanged.

## Limits

The session keeps its ID, title, model, and permission. Only its messages are pruned to the compaction pair.

OpenCode's public API cannot clone an arbitrary compaction summary into another session, so the plugin works in place instead.

History purge runs only on local installations, inside the OpenCode (Bun) runtime, and only touches `event` rows below the compaction pair; messages, parts, sessions, and the aggregate sequence row are never modified by it. When the database is unreachable (for example when attached to a remote server), the archive still succeeds and only the event log is left untouched.

Neither deleting rows nor the passive checkpoint shrinks the database file on disk: free pages are reused, and reclaiming space requires an offline `VACUUM`. The plugin never runs `VACUUM`.

## Development

```bash
npm install
npm run check
```

## License

MIT
