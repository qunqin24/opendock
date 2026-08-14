# @gotgenes/opencode-session-context

[![npm version](https://img.shields.io/npm/v/@gotgenes/opencode-session-context?style=flat&logo=npm&logoColor=white)](https://www.npmjs.com/package/@gotgenes/opencode-session-context)
[![CI](https://img.shields.io/github/actions/workflow/status/gotgenes/opencode-session-context/ci.yml?style=flat&logo=github&label=CI)](https://github.com/gotgenes/opencode-session-context/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.x-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-%3E%3D1.0-f9f1e1?style=flat&logo=bun&logoColor=black)](https://bun.sh/)
[![OpenCode Plugin](https://img.shields.io/badge/OpenCode-Plugin-8B5CF6?style=flat)](https://opencode.ai/)

OpenCode plugin for cross-session context access in subagent workflows.

## What it does

This package provides a plugin that exposes `parent_session_messages`,
`session_messages`, and `session_messages_batch` tools for reading conversation
history across sessions.

When OpenCode dispatches a subagent via the Task tool, the subagent runs in a
fresh child session with no access to the parent's conversation history.
This plugin bridges that gap by fetching the parent session's messages through
the OpenCode SDK.

## Installation

Add the plugin to your `opencode.json`:

```json
{
  "plugin": ["@gotgenes/opencode-session-context"]
}
```

## How it works

The plugin registers these tools:

| Tool                                 | Description                                                                                                      |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `parent_session_messages`            | Reads the current session's `parentID` via the SDK and fetches all messages from the parent session.             |
| `session_messages(sessionId)`        | Fetches all messages from any session by ID.                                                                     |
| `session_messages_batch(sessionIds)` | Fetches all messages from multiple sessions by ID and concatenates them with `=== Session: <id> ===` delimiters. |

Both return structured text with agent attribution, full message text, and
one-line summaries for tool invocations (using the title computed by OpenCode).

### Output format

```text
1. user
How do I fix the login bug?

---

2. assistant (tdd) [anthropic/claude-opus-4 (high)]
Let me check the existing test helpers.

  [tool] Read file: web/app/auth/routes/sign-in.test.ts → completed
  [tool] bun test verify.test.ts → error: Process exited with code 1

I see the test is failing because...
```

## Use cases

### Retro-stage analysis

A retro-stage subagent can analyze the parent session's conversation to capture
retrospective observations (friction, wins, user-side feedback) without
requiring a human to invoke a command or switch agents.

### Parent-orchestrated TDD session reconstruction

In parent-orchestrator workflows, `task_id` values returned by the Task tool
are session IDs. A reviewer agent can reconstruct full TDD phase ordering by:

1. Calling `parent_session_messages` to read the orchestrator thread and
   extract `task_id` values
2. Calling `session_messages_batch([taskId, ...])` for the `tdd-red`,
   `tdd-green`, and `tdd-refactor` subagent sessions
3. Reviewing full per-phase detail, including file writes, test runs, and
   checkpoint calls
