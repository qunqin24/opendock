# opencode-permission-audit

OpenCode plugin that records permission prompts and replies to local JSONL audit logs.

## What it logs

The plugin writes one JSON object per line for permission activity, including:

- prompt, grant, and denial outcomes
- session, request, message, and tool call identifiers when available
- permission type, title, patterns, and metadata
- project directory and worktree

Logs are written to:

```text
~/.local/share/opencode/permission-audit/
```

Set `OPENCODE_PERMISSION_AUDIT_DIR` to use a different directory.

## Install

Install dependencies and build the package:

```sh
bun install
bun run build
```

For local OpenCode use, copy the plugin source into your OpenCode plugin directory:

```sh
bun run install:local
```

That writes:

```text
~/.config/opencode/plugins/permission-audit.ts
```

Then add the plugin to your OpenCode config if it is not already enabled:

```json
{
  "plugin": ["permission-audit"]
}
```

## Log Files

The plugin maintains two log streams:

- `<sessionID>.jsonl`: entries for one OpenCode session
- `latest.jsonl`: appended stream across sessions

The log directory is chmodded to `0700`, and log files are chmodded to `0600` when the platform supports it.

Example entry:

```json
{
  "version": 1,
  "timestamp": "2026-04-30T00:00:00.000Z",
  "source": "event.permission.asked",
  "outcome": "prompted",
  "sessionID": "session-1",
  "requestID": "request-1",
  "permission": "bash",
  "patterns": ["npm test"],
  "directory": "/path/to/repo",
  "worktree": "/path/to/repo"
}
```

## Permission Reports

Generate an evidence-backed permission report:

```sh
bunx opencode-permission-audit report --since 7d
```

For local development:

```sh
bun src/cli.ts report --since 7d --min-approvals 2
```

The report groups repeated permission decisions and suggests `opencode.json` rules only when a pattern has enough grants and no denials. Review suggestions before applying them.

## Development

```sh
bun install
bun run check
```

Useful commands:

- `bun run typecheck`
- `bun run lint`
- `bun run test`
- `bun run build`
- `bun run format`

## Security

Permission audit logs may contain command patterns, project paths, and tool metadata. Treat the log directory as private data. Do not commit generated logs.

Report security concerns privately using the guidance in [SECURITY.md](SECURITY.md).

## License

MIT. See [LICENSE](LICENSE).
