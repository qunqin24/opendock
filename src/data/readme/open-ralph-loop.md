# Open Ralph Loop

Open Ralph Loop is an **OpenCode plugin** that executes Lisa PRDs one story at a time.

Lisa plans. Ralph does.

## What It Does

Open Ralph adds `/ralph-loop` to OpenCode. It:

1. Resolves a Lisa JSON PRD.
2. Creates or reuses the matching progress file.
3. Starts an OpenCode-native loop in the current session.
4. Continues when the session goes idle until the PRD is complete or max iterations is reached.
5. Stops only when the assistant prints `<promise>COMPLETE</promise>` and every `userStories[].passes` value is `true`.

No nested `opencode run` subprocess is used.

## Install

Add the plugin to your OpenCode config:

```json
{
  "plugin": ["open-ralph-loop"]
}
```

Restart OpenCode. On startup, the plugin installs these commands into `~/.config/opencode/commands/` if missing:

- `/ralph-loop`
- `/cancel-ralph`
- `/ralph-status`

## PRD Resolution

Open Ralph reads Lisa output directly.

Supported inputs:

```text
/ralph-loop docs/specs/my-feature.json
/ralph-loop lisa/my-feature.json
/ralph-loop my-feature
/ralph-loop
```

Resolution order for a slug such as `my-feature`:

1. `docs/specs/my-feature.json`
2. `lisa/my-feature.json`

Progress files:

- `docs/specs/my-feature.json` -> `docs/specs/my-feature-progress.txt`
- `lisa/my-feature.json` -> `lisa/my-feature-progress.txt`

Story ordering:

- If `priority` exists, the lowest numeric value wins.
- Otherwise Lisa categories are used in order: `setup`, `core`, `integration`, `polish`.
- Ties use the original array order.

## Commands

```text
/ralph-loop <spec-or-slug>
```

Starts a loop for a PRD path or feature slug.

```text
/cancel-ralph
```

Cancels the active loop by deleting `.opencode/ralph-loop.local.md`.

```text
/ralph-status
```

Shows active loop state, PRD path, progress path, iteration count, and next story hint.

## State

Runtime state is stored in:

```text
.opencode/ralph-loop.local.md
```

This file is intentionally ignored by git. Delete it to cancel a loop manually.

## PRD Shape

Open Ralph expects Lisa JSON:

```json
{
  "project": "user-authentication",
  "branchName": "ralph/user-authentication",
  "description": "User authentication",
  "userStories": [
    {
      "id": "US-001",
      "category": "setup",
      "title": "Database schema for users",
      "description": "As a developer, I want user tables created",
      "acceptanceCriteria": ["Migration creates users table"],
      "passes": false,
      "notes": ""
    }
  ]
}
```

## Development

```bash
npm run typecheck
```

The plugin entrypoint is `src/index.ts`.

## License

MIT
