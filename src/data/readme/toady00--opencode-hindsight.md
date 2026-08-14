# opencode Hindsight

An opencode plugin for integrating with Vectorize Hindsight, an AI agent
memory system. The plugin gives each opencode agent one configured Hindsight
bank for automatic recall, automatic retention, manual tools, and TUI retain.

> **Status:** This package is pre-1.0 alpha software. The one-agent/one-bank
> configuration model is a breaking pre-1.0 change. Test with non-critical
> memory banks before relying on it for important workflows.

## Features

- Per-agent Hindsight configuration via `agent.<name>.options.hindsight`.
- Global defaults with per-agent overrides.
- `applyMode: "opt-in"` and `applyMode: "opt-out"` support.
- One Hindsight bank per enabled agent.
- Automatic memory recall at root session start.
- Configure session-start context injection with a Hindsight mental model ID or
  a custom recall query, with per-agent overrides.
- Automatic transcript retention on `session.status` idle events.
- On-demand TUI session retention with `/hindsight-retain`.
- Pre-compaction retention and recall support.
- Manual tools:
  - `hindsight_retain`
  - `hindsight_recall`
  - `hindsight_reflect`
- Root-session-only automatic behavior, while manual tools remain available to
  configured child agents.
- Graceful degradation when disabled, unconfigured, or when Hindsight/API calls
  fail.

Advanced workflows that need multiple banks per agent should use the Hindsight
CLI or Hindsight MCP server directly.

## Requirements

- Bun 1.3.10 or newer compatible runtime for development.
- opencode with `@opencode-ai/plugin` `>=1.14.41`.
- A running Hindsight API endpoint.
- Optional Hindsight API token, depending on your Hindsight deployment.

## Installation

After the package is published to npm, install it in the environment where
opencode loads plugins:

```bash
bun add @toady00/opencode-hindsight
```

For local development from this repository:

```bash
bun install
bun run build
```

Then reference the package from your opencode configuration.

If you are testing from a local checkout before publishing, build the package
first and use your package manager's local-link workflow from the opencode
configuration environment.

## Quick Start

For a single shared project memory bank, this is the smallest useful setup:

`.opencode/opencode.json`:

```jsonc
{
  "plugin": [
    [
      "@toady00/opencode-hindsight",
      {
        "hindsightApiUrl": "http://localhost:8888",
        "applyMode": "opt-out",
        "defaults": {
          "bankId": "project",
          "autoRetain": true,
          "autoRecall": true,
          "tags": ["source:opencode", "repo:my-project"]
        }
      }
    ]
  ]
}
```

`.opencode/tui.json`:

```jsonc
{
  "plugin": ["@toady00/opencode-hindsight"]
}
```

With this configuration, root sessions automatically recall from `project` at
startup, retain transcripts to `project` as the session goes idle, expose manual
retain/recall/reflect tools for configured agents, and enable the
`/hindsight-retain` TUI slash command.

The TUI command is configured in `tui.json`, not `opencode.json`. Keep all
Hindsight options, including `hindsightApiUrl`, `defaults`, `applyMode`, and
per-agent behavior, on the server plugin in `opencode.json`; the TUI plugin
reads that server configuration at runtime.

By default, automatic retention waits for three new user turns before retaining.
Set `retainEveryNTurns` to `1` while smoke-testing if you want the first idle
event after a prompt to retain immediately.

## Basic opencode Configuration

Add the server plugin to `opencode.json`:

```jsonc
{
  "plugin": [
    [
      "@toady00/opencode-hindsight",
      {
        "hindsightApiUrl": "http://localhost:8888",
        "hindsightApiToken": "optional-token",
        "applyMode": "opt-in",
        "debug": false,
        "defaults": {
          "bankId": "project",
          "async": true,
          "tags": ["source:opencode", "repo:my-project"],
          "retainStrategy": "conversation",
          "retainMode": "full-session",
          "retainEveryNTurns": 3,
          "retainConversationExtras": false,
          "autoRetain": true,
          "autoRecall": true,
          "sessionStartMentalModel": null,
          "sessionStartRecallPrompt": null
        }
      }
    ]
  ]
}
```

Add the TUI plugin to `tui.json` if you want the `/hindsight-retain` TUI slash
command:

```jsonc
{
  "plugin": ["@toady00/opencode-hindsight"]
}
```

If you pin the server plugin to a version, pin the TUI plugin to the same
version:

```jsonc
{
  "plugin": ["@toady00/opencode-hindsight@0.2.2"]
}
```

You can also configure the Hindsight endpoint via environment variables:

```bash
export HINDSIGHT_API_URL="http://localhost:8888"
export HINDSIGHT_API_TOKEN="optional-token"
export HINDSIGHT_DEBUG="true"
```

Environment variables are used when the equivalent plugin options are omitted.

## Plugin Options

| Option | Description | Default |
| --- | --- | --- |
| `hindsightApiUrl` | Hindsight API URL. Required unless `HINDSIGHT_API_URL` is set. | none |
| `hindsightApiToken` | Optional API token. Can also use `HINDSIGHT_API_TOKEN`. | none |
| `applyMode` | `"opt-in"` enables only agents with explicit `hindsight` config; `"opt-out"` enables agents unless they explicitly disable Hindsight. | `"opt-in"` |
| `debug` | Enable debug logging. Can also use `HINDSIGHT_DEBUG`. | `false` |
| `defaults` | Agent Hindsight defaults shared by enabled agents. | built-in defaults |

If no Hindsight API URL is configured, the plugin logs an error and returns no
hooks so opencode can continue.

### Apply Modes and `enabled`

`applyMode` controls how the plugin decides whether an agent receives Hindsight
behavior:

- `"opt-in"`: agents are disabled by default. Add an `options.hindsight` block
  to enable an agent. Set `enabled: false` inside that block to keep the agent
  disabled while documenting its intended configuration.
- `"opt-out"`: agents are enabled by default and receive plugin defaults. Set
  `enabled: false` in an agent's `options.hindsight` block to disable that
  agent.

When `enabled` is omitted from an agent config, the apply mode decides the
default. When `enabled: true` is present, that agent is enabled in either mode.

## Agent Hindsight Defaults

The `defaults` object and each agent's `options.hindsight` block use the same
field names:

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `enabled` | `boolean` | apply-mode dependent | Per-agent override for whether Hindsight behavior is enabled. |
| `bankId` | `string` | omitted | Hindsight bank used by this agent for automatic recall, automatic retention, manual tools, and TUI retain. |
| `async` | `boolean` | `true` | Whether retain calls use Hindsight async processing. |
| `tags` | `string[]` | `[]` | Tags attached to retain calls. |
| `retainStrategy` | `string` | omitted | Hindsight retain strategy name. Must exist in Hindsight bank configuration. |
| `retainMode` | `"full-session" \| "last-turn"` | `"full-session"` | Transcript scope used for idle auto-retain. |
| `retainEveryNTurns` | `number` | `3` | User-turn interval for idle auto-retain. Minimum is `1`. |
| `retainConversationExtras` | `boolean` | `false` | Whether retained transcripts include extra non-conversational content. By default, retain sends only conversational text and omits tool outputs, reasoning parts, thinking-style tags, synthetic text, ignored text, injected Hindsight memory blocks, and legacy user system prompts. Set to `true` to preserve the older, more verbose retention behavior where text-bearing extras are retained. |
| `autoRetain` | `boolean` | `true` | Whether idle and pre-compaction transcript retention run for root sessions. |
| `autoRecall` | `boolean` | `true` | Whether root session-start and compaction recall run. |
| `sessionStartMentalModel` | `string \| null` | `undefined` | Hindsight mental model ID to fetch at root session start instead of performing generic recall. Use `null` to explicitly clear an inherited default. |
| `sessionStartRecallPrompt` | `string \| null` | `undefined` | Custom query string for root session-start recall when no mental model is configured. Use `null` to explicitly clear an inherited default. |

Agent-level values replace plugin-level defaults using a shallow override model.
For example, a per-agent `tags` array replaces default tags instead of merging
with them.

## Per-Agent Configuration

Agent settings live under each agent's `options.hindsight` field:

```jsonc
{
  "agent": {
    "build": {
      "options": {
        "hindsight": {
          "enabled": true,
          "bankId": "build-memory",
          "retainMode": "last-turn",
          "retainEveryNTurns": 2,
          "retainConversationExtras": false,
          "tags": ["source:opencode", "agent:build"],
          "async": true,
          "retainStrategy": "conversation",
          "autoRetain": true,
          "autoRecall": true,
          "sessionStartMentalModel": "build-agent-context"
        }
      }
    },
    "review": {
      "options": {
        "hindsight": {
          "enabled": true,
          "bankId": "review-memory",
          "sessionStartMentalModel": null,
          "sessionStartRecallPrompt": "Relevant code review preferences, recurring review findings, project risk areas, and recent review context."
        }
      }
    },
    "plan": {
      "options": {
        "hindsight": {
          "enabled": false
        }
      }
    }
  }
}
```

## YAML Frontmatter

Agent markdown frontmatter uses the same nested `hindsight` object. Use nested
YAML only:

```yaml
hindsight:
  enabled: true
  bankId: tester-memory
  async: false
  retainStrategy: conversation
  retainMode: last-turn
  retainEveryNTurns: 1
  retainConversationExtras: false
  autoRetain: true
  autoRecall: true
  tags:
    - source:opencode
    - agent:tester
  sessionStartMentalModel: null
  sessionStartRecallPrompt: Relevant testing conventions, flaky tests, and recent QA context for this repository.
```

## TUI Plugin

Add `@toady00/opencode-hindsight` to `tui.json` to enable the
`/hindsight-retain` slash command:

```jsonc
{
  "plugin": ["@toady00/opencode-hindsight"]
}
```

The package exports a `./tui` entrypoint, but opencode resolves that entrypoint
internally when loading `tui.json`; do not put
`@toady00/opencode-hindsight/tui` in config. Also do not put the TUI plugin in
`opencode.json`; server plugins and TUI plugins are loaded by different
opencode runtimes.

Keep Hindsight options on the server plugin in `opencode.json`; no separate TUI
options are needed. The TUI plugin reads the loaded server plugin tuple from
opencode state when `/hindsight-retain` runs, so the same `hindsightApiUrl`,
`hindsightApiToken`, `applyMode`, and `defaults` apply to manual TUI retain.

Plugin and config changes, including adding the TUI plugin entry, require
restarting opencode before they take effect.

To use the command, open a session in the TUI and type `/hindsight-retain` in
the command palette. The command retains the current session transcript to the
agent's configured `bankId` on demand. Manual TUI retain always sends the full
session transcript, uses the opencode session ID as the Hindsight document ID,
and re-running the command for the same session overwrites that retained
document. The retained transcript is filtered the same way as automatic
retention, so tool call records, tool outputs, reasoning parts, thinking-style
tags, synthetic text, ignored text, and injected Hindsight memory blocks are not
sent to Hindsight. It does not update automatic retain turn counters;
`retainEveryNTurns` only affects idle auto-retain.

Set `retainConversationExtras: true` in plugin defaults or per-agent
`hindsight` config if you want retained transcripts to keep text-bearing extras
such as tool outputs, reasoning/thinking text, synthetic/ignored text, and
legacy user system prompts.

If `/hindsight-retain` is missing or cannot find configuration, check:

- `.opencode/tui.json` contains the package spec, for example
  `"plugin": ["@toady00/opencode-hindsight"]`.
- `.opencode/opencode.json` contains the server plugin tuple with
  `hindsightApiUrl` or `HINDSIGHT_API_URL` is set.
- opencode was restarted after editing either config file.

## Session-Start Context Configuration

Root sessions can receive context from either a Hindsight mental model or a
recall query. Configure these fields in plugin-level `defaults` or override them
per agent.

Precedence rules:

1. If `sessionStartMentalModel` is configured, the plugin fetches that mental
   model ID from the agent's `bankId` and injects the content. `recall()` is not
   called.
2. If only `sessionStartRecallPrompt` is configured, the plugin calls `recall()`
   with that custom query instead of the built-in default.
3. If neither is configured, the plugin uses the built-in default recall query.

`sessionStartMentalModel` and `sessionStartRecallPrompt` are mutually exclusive
in effect: a configured mental model always wins. Set a field to `null` to clear
an inherited plugin default for a specific agent.

Plugin-level default mental model:

```jsonc
{
  "plugin": [
    ["@toady00/opencode-hindsight", {
      "hindsightApiUrl": "http://localhost:8888",
      "defaults": {
        "bankId": "project-memory",
        "sessionStartMentalModel": "project-architecture"
      }
    }]
  ]
}
```

Per-agent custom recall prompt, clearing an inherited mental model:

```jsonc
{
  "agent": {
    "review": {
      "options": {
        "hindsight": {
          "bankId": "review-memory",
          "sessionStartMentalModel": null,
          "sessionStartRecallPrompt": "Relevant code review preferences, recurring review findings, project risk areas, and recent review context."
        }
      }
    }
  }
}
```

YAML frontmatter clearing an inherited mental model:

```yaml
hindsight:
  bankId: review-memory
  sessionStartMentalModel: null
  sessionStartRecallPrompt: Relevant code review context.
```

Validation and limitations:

- `sessionStartMentalModel` expects a mental model **ID**, not the display name.
- Empty strings and whitespace-only values are ignored with warnings.
- Invalid per-agent values, such as non-string non-null values, fall back to
  valid plugin defaults.
- `null` explicitly clears an inherited plugin default without a warning.

## Automatic Recall

For root sessions, the plugin marks a session for recall when the
`session.created` event arrives and the agent has `autoRecall: true` and a
configured `bankId`. On the next `experimental.chat.system.transform` hook, the
bank is queried with this fixed query unless session-start configuration
overrides it:

```text
Relevant project context, user preferences, and recent work for this agent.
```

Successful recall results are appended to the system prompt in a
`<hindsight_memories>` block with an ISO timestamp. Existing system prompt
entries are preserved.

If the bank query fails, the session remains marked for recall so the plugin can
retry on the next system transform. If the bank query succeeds but no memories
are returned, the recall marker is consumed and no memory block is injected.

## Automatic Retention

Automatic retention runs on `session.status` events where
`status.type === "idle"`. The plugin also accepts the deprecated `session.idle`
event for compatibility with older event producers.

Auto-retain only runs for root sessions with `autoRetain: true` and a configured
`bankId`. Child sessions are skipped for automatic retention.

### `retainMode: "full-session"`

The plugin fetches all session messages, formats user and assistant
conversational text as a transcript, strips any previously injected Hindsight
memory blocks, tool/reasoning parts, thinking-style tags, synthetic text, and
ignored text, and retains the transcript to `bankId` using the session ID as the
document ID. Repeated retains overwrite the same session document.

Set `retainConversationExtras: true` to keep text-bearing extras in retained
transcripts and preserve the older, more verbose retention behavior.

### `retainMode: "last-turn"`

The plugin extracts the last `retainEveryNTurns` user turns and their assistant
responses, formats that window as a transcript, and retains it as a new unique
document.

### Compaction

Before compaction, the plugin attempts to retain the full transcript to `bankId`
using the session ID as the document ID. This bypasses normal turn throttling and
`retainMode`. It then attempts compaction recall and appends any recalled memory
block to the compaction context.

### Async retain, strategies, and tags

Retention uses Hindsight async processing by default (`async: true`). Set
`async: false` when retain calls must wait for Hindsight to finish processing
before the plugin treats the retain as successful. The plugin submits async
retain operations but does not poll them or report later async failures.

`retainStrategy` applies to retain calls. Strategy names must already exist in
Hindsight bank configuration; this plugin only passes the configured strategy
name through to Hindsight.

Configured `tags` are attached to retain calls only. Recall and reflect tag
filtering is out of scope for this plugin.

## Manual Tools

Configured agents receive these tools:

### `hindsight_retain`

Stores information in the agent's configured `bankId`.

Parameters:

- `content` — required; cannot be empty.
- `context` — optional first-class Hindsight retain context.

`retainStrategy`, `tags`, and async behavior are controlled by user
configuration, not by tool arguments.

Example request:

```json
{
  "content": "The project uses Bun and tsup for building the plugin.",
  "context": "Repository setup decision"
}
```

### `hindsight_recall`

Searches the agent's configured `bankId` and returns matching memories.

Parameters:

- `query` — required; cannot be empty.

### `hindsight_reflect`

Synthesizes an answer from the agent's configured `bankId`.

Parameters:

- `query` — required; cannot be empty.

Manual tools can be used in child sessions if the child agent has resolved
Hindsight configuration. There is no child-session restriction on manual tools.

## Development

Install dependencies:

```bash
bun install
```

Build the ESM bundle and declarations:

```bash
bun run build
```

Run tests:

```bash
bun run test
```

Watch build output during development:

```bash
bun run dev
```

## Issue Tracking

This project uses `bd` for issue tracking. After cloning the repository or
creating a new worktree, run this from the worktree root:

```bash
bd bootstrap
```

## Inspiration

This project uses the official Hindsight opencode plugin as a reference point
for the integration pattern while focusing this package's configuration on one
Hindsight bank per opencode agent.
