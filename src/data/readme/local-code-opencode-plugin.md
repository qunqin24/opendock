# local-code-opencode-plugin

An OpenCode plugin that injects git-based handoff context when you switch models in the OpenCode TUI.

The core idea is simple: when a model handoff happens, the next model should inherit the current repository state, not rely only on the chat transcript.

## What It Does

```text
OpenCode TUI
  |-- Normal work: OpenCode behaves as usual
  |-- Model switch: native /models picker
  |-- Direct input: /model provider/model is handled as a handoff trigger fallback
  `-- On switch:
        1. Collect current workspace/repo git state
        2. Render a local-code style handoff prompt
        3. Inject it into the current OpenCode session as a noReply context message
        4. Let the next model continue with git status/diff/log as context
```

## Current Features

- `lc-opencode-context` CLI
  - Detects a single git repository or a multi-repo workspace
  - Treats two or more immediate child git repositories as a workspace
  - Detects one child repository when the root itself is not a git repository
  - Collects `git status --short`, `git diff --stat`, and `git log -10 --oneline`
  - Renders a handoff prompt
- OpenCode native plugin (`src/plugin.js`)
  - Tracks `session.created`, `session.updated`, `session.next.model.switched`, `session.next.agent.switched`, `message.part.updated`, `message.updated`, and `session.idle`
  - Automatically injects context on native `/models` picker switches
  - Treats direct `/model provider/model` text input as a handoff trigger fallback
  - Filters injected handoff messages and direct `/model` commands out of the turn log
  - Guards against stale model events after direct command fallback handling
  - Captures per-turn git diff snapshots at user-turn start and session idle
  - Persists bounded turn history to `.opencode/local-code/turns.json`
  - Uses a sliding turn-log window: first 3 turns plus latest 7 turns
  - Skips injection when no repository is found or every repository is clean

## Installation

Add the npm package to your OpenCode config.

Global install is recommended if you want model handoff context in every repository:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["local-code-opencode-plugin"]
}
```

Put that in:

```text
~/.config/opencode/opencode.json
```

Project-level install is better when you only want this behavior in one workspace:

```text
opencode.json
```

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["local-code-opencode-plugin"]
}
```

OpenCode installs npm plugins automatically on startup and caches them under its cache directory.

### Updating From an Older Cached Version

OpenCode caches npm plugins under a path like:

```text
~/.cache/opencode/packages/local-code-opencode-plugin@latest
```

On a fresh machine, `"local-code-opencode-plugin"` installs the current npm `latest` version automatically. If OpenCode has already cached an older version, it may keep using that cached package. To force a refresh, remove the cached package directory and restart OpenCode:

```bash
rm -rf ~/.cache/opencode/packages/local-code-opencode-plugin@latest
```

Alternatively, pin the version in your OpenCode config:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["local-code-opencode-plugin@1.0.2"]
}
```

## Usage

1. Start OpenCode in a git repository.
2. Work normally inside the OpenCode TUI.
3. Switch models with the native `/models` picker.
4. The plugin injects git handoff context into the active session.

Direct chat input such as `/model provider/model` is also detected as a handoff trigger fallback. As of OpenCode 1.15.10, this text path is not a native model switch command; it arrives as a normal user message. The plugin detects that shape through text events, injects context, and prevents the command from being stored as a normal work turn. For actual model selection, the native `/models` picker remains the preferred path.

## CLI

```bash
lc-opencode-context --cwd . --previous-model openai/gpt-5.3-codex --next-model opencode-go/deepseek-v4-pro
```

Example output:

```text
[Local-code model handoff]

Previous model: openai/gpt-5.3-codex
Next model: opencode-go/deepseek-v4-pro

Use the current git state and work units only when they are relevant.
Do not push, merge, deploy, publish, or release without explicit user approval.
...
```

## Design Principles

- Git state is the durable source of truth.
- Chat transcript and turn history are supporting context, not durable state.
- The plugin only intervenes at model handoff boundaries.
- Normal OpenCode TUI behavior should remain intact.
- The handoff prompt always includes a safety reminder against unapproved push, merge, deploy, publish, or release operations.
- Multi-repo workspace detection is intentionally conservative: it only treats immediate child git repositories as workspace members.

## Development

```bash
npm test
npm run check
```

The test suite is split across `test/context.test.js`, `test/handoff.test.js`, `test/plugin.test.js`, and `test/profiles.test.js`.

## Documentation

- `docs/IMPLEMENTATION_STATUS.md` - current implementation scope, test status, and release readiness notes
- `docs/ARCHITECTURE.md` - plugin architecture and event-driven design
- `docs/SPIKES.md` - OpenCode event and integration spikes
