# OpenCode Session Archiver

TUI plugin for OpenCode `1.18.21+` that reduces the current root session to its native compaction summary, then deletes the leftover messages and subagent children only after explicit confirmation.

## Install

```bash
opencode plugin @evgenyzh/opencode-session-archiver --global
```

Restart OpenCode after installing. The plugin is registered in the TUI configuration, so it is loaded at startup.

For local development, add the source module to `~/.config/opencode/tui.json`:

```json
{
  "plugin": [["/absolute/path/to/opencode-session-archiver/src/tui.tsx"]]
}
```

## Use

Run `/archive-session`, review the confirmation, and confirm.

The command:

1. Refuses a child session or an active session.
2. Reuses the latest completed native compaction, or runs OpenCode's normal compaction once if the summary is missing or stale.
3. Keeps only the native compaction pair: the `Compaction` divider and its assistant summary.
4. Deletes every other message in the session through the supported `deleteMessage` API.
5. Deletes subagent child sessions, fail-closed: a child is removed only when its parent contains a matching `task` tool part whose `state.metadata.sessionId`/`parentSessionId` reference it.
6. Re-reads the session and every expected deleted child and reports an error if OpenCode leaves any survivor.

User-created forks and manually created child sessions are never removed because they carry no task evidence. Cancelling the confirmation leaves the session unchanged.

## Limits

The session keeps its ID, title, model, and permission. Only its messages are pruned to the compaction pair.

OpenCode's public API cannot clone an arbitrary compaction summary into another session, so the plugin works in place instead. It never uses SQLite directly and does not run `VACUUM`; OpenCode itself retains SQLite free pages after deletion.

## Development

```bash
npm install
npm run check
```

## License

MIT
