# OpenCode Durable Task State

`opencode-durable-task-state` gives each OpenCode session one concise, durable task snapshot that survives compaction. It is intended for long-running or delegated work where the agent should be able to recover its objective, agreed plan, decisions, progress, and next action.

## Install

Add the npm package to your global `~/.config/opencode/opencode.json` or a project's `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-durable-task-state"]
}
```

OpenCode installs npm plugins automatically with Bun. Restart OpenCode after changing its configuration.

To pin a release, use an npm version in the plugin spec:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-durable-task-state@0.1.2"]
}
```

Do not configure both the npm package and a local copy. OpenCode loads local and npm plugins separately and would register the tool twice.

## Behavior

Each session's snapshot lives at:

```text
<project root>/.agent/sessions/<sessionID>/task.md
```

The project root is the session's worktree, or its directory when the worktree is the filesystem root. Session IDs that are not safe path segments are percent-encoded with an `encoded-` prefix.

The plugin provides:

- A `task_state` tool with `read`, `write`, and `delete` operations. The path is derived from the calling session ID, so a session cannot select another session's snapshot. `write` replaces the whole snapshot.
- A system-context note giving the session its exact state path.
- A compaction hook that injects only the compacting session's existing snapshot, so the continued session can recover its own work.

The plugin does not decide when state is worth writing. Pair it with instructions, for example in `AGENTS.md`, that say when to create, update, and finish the snapshot. Consider adding `.agent/` to your global Git ignore file and denying direct reads and edits of `.agent/sessions/*/task.md` so agents use the tool:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-durable-task-state"],
  "permission": {
    "task_state": "allow",
    "edit": { ".agent/sessions/*/task.md": "deny" },
    "read": { ".agent/sessions/*/task.md": "deny", "*/.agent/sessions/*/task.md": "deny" }
  }
}
```

The plugin is inactive when `OPENCODE_SUPERVISED=1`, which is reserved for launchers that supply their own state contract.

## Compatibility

Version `0.1.2` targets released OpenCode versions `>=1.18.35 <2` and is tested against `opencode-ai@1.18.35`.

The package uses the OpenCode 1.x server-plugin module contract. It does not claim OpenCode 2 compatibility; OpenCode 2 must be tested explicitly before widening the compatibility range.

The implementation uses these experimental hooks:

- `experimental.chat.system.transform`
- `experimental.session.compacting`

OpenCode may change experimental hook contracts. A packed-package smoke test against the released OpenCode binary is authoritative for supported versions.

## Development

```sh
npm ci
npm test
npm run pack:check
```

`npm test` builds the plugin, runs the behavior tests, packs and installs the npm artifact in an isolated fixture, and verifies that OpenCode 1.18.35 registers its `task_state` tool.

Release maintainers should follow [`RELEASING.md`](https://github.com/samiralibabic/opencode-durable-task-state/blob/main/RELEASING.md), including the one-time authentication procedure required to create the package on npm.

## License

MIT
