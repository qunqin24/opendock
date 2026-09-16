# OpenCode Goal

[![CI](https://github.com/beremaran/opencode-goal/actions/workflows/ci.yml/badge.svg)](https://github.com/beremaran/opencode-goal/actions/workflows/ci.yml)
[![license](https://img.shields.io/github/license/beremaran/opencode-goal)](LICENSE)

A persistent `/goal` workflow for [OpenCode](https://opencode.ai): define a
completion condition once, let OpenCode work across turns, and stop only when
an independent evaluator finds enough evidence that the condition is
satisfied.

The plugin combines:

- Claude Code-style completion evaluation after every turn.
- Codex-style session persistence, token accounting, pause/resume controls,
  model tools, and idle continuation.

Requires OpenCode 2.0.0 or newer. The package root is the OpenCode 2
`{ id, setup }` plugin.

## Install

Install the package directly from GitHub with the current OpenCode CLI:

```bash
opencode plugin add github:beremaran/opencode-goal
```

For project-local configuration or plugin options, add the package to
`opencode.json`:

```json
{
    "$schema": "https://opencode.ai/config.json",
    "plugins": [
        {
            "package": "github:beremaran/opencode-goal",
            "options": {
                "evaluatorModel": "anthropic/claude-haiku-4-5"
            }
        }
    ]
}
```

The package also exports `./tui`. OpenCode's CLI loads that export automatically
when the package is configured in `opencode.json`, so the sidebar and `/goal`
command do not need a separate CLI package entry.

For a local checkout, replace the GitHub spec with its absolute path:

```json
{
    "$schema": "https://opencode.ai/config.json",
    "plugins": ["/absolute/path/to/opencode-goal"]
}
```

OpenCode installs missing package plugins in the background. Configuration
changes under watched directories reload automatically; restart if a local
source change is not picked up.

## Usage

```text
/goal all authentication tests pass and lint is clean
/goal migrate every call site and make the build pass
```

Control the current session goal with:

```text
/goal          Show status, elapsed time, turns, tokens, and the last evaluation
/goal pause    Pause automatic continuation
/goal resume   Resume work immediately
/goal clear    Remove the session goal
/goal cancel   Alias for clear
/goal help     Show command syntax
```

The goal remains active until it completes, is paused, is cleared, or is marked
blocked.

When a user asks for persistent goal tracking in ordinary language, an agent can
start it through the `create_goal` model tool without requiring a `/goal`
command, but it cannot replace an unfinished goal. The user must explicitly
clear or replace unfinished work.

## TUI sidebar

When the TUI entrypoint is enabled, the current session's goal appears in a
collapsible **Goal** section beside OpenCode's Todo and Files sections. It shows:

- Status and objective.
- Elapsed time, turns, and tokens used.
- The latest independent evaluator reason.

The section disappears when the session has no goal.

## How it works

1. The V2 server plugin registers the model tools and session context hook.
2. The `./tui` export registers the sidebar and `/goal` keymap command. The
   command stores a per-session goal and starts the first work prompt.
3. When the parent session becomes idle, the plugin reconstructs the goal-period
   transcript and accounts for input, output, and reasoning tokens. Cache tokens
   are excluded.
4. A temporary child session evaluates the completion condition from transcript
   evidence. The evaluator model is selected from `evaluatorModel`, then the
   parent session model.
5. A negative decision and its reason are sent through `session.prompt()`,
   starting the next turn.
6. A positive decision marks the durable goal complete and stops continuation.

The plugin also exposes three model tools:

- `create_goal` starts a persistent goal when the user explicitly requests one.
  It refuses to overwrite any unfinished goal in the session.
- `get_goal` returns the current state and usage.
- `update_goal` records a completion claim for independent evaluation, or marks
  a genuinely repeated blocker after at least three goal turns.

Active goal context is injected through the V2 session context hook. Interrupting
an OpenCode response pauses the goal so pressing Escape does not immediately
restart it.

## Configuration

Plugin options can be supplied in an OpenCode 2 plugin entry:

```json
{
    "plugins": [
        {
            "package": "github:beremaran/opencode-goal",
            "options": {
                "evaluatorModel": "anthropic/claude-haiku-4-5",
                "evaluatorAgent": "build",
                "maxTranscriptChars": 48000,
                "continuationDelayMs": 250,
                "deleteEvaluatorSessions": true,
                "stateDirectory": "/custom/state/root"
            }
        }
    ]
}
```

All options are optional. `maxTranscriptChars` defaults to `48000`,
`continuationDelayMs` to `0`, and `deleteEvaluatorSessions` to `true`.
`evaluatorModel` accepts a `provider/model` reference; when omitted, the parent
session's model is used. `evaluatorAgent` selects the evaluator agent when set.

State is stored outside the repository under:

```text
$XDG_STATE_HOME/opencode-goal/<project-id>/<session-id>.json
```

When `XDG_STATE_HOME` is unset, the root is
`~/.local/state/opencode-goal`.

## Runtime and limitations

- The slash command and sidebar are available in OpenCode's terminal CLI. Other
  OpenCode clients can use the model tools directly.
- Evaluators can judge only transcript evidence. If work happened but the
  agent did not surface it, the evaluator should ask for stronger evidence and
  continue.
- This plugin cannot bypass provider rate, usage, trust, or permission limits.
- A provider or model failure pauses the goal instead of risking an unverified
  runaway loop. The goal remains persisted and can be resumed.
- The V2 API does not expose evaluator-session deletion, so evaluator sessions
  may remain in the session list even when `deleteEvaluatorSessions` is enabled.

## Local development

```bash
git clone https://github.com/beremaran/opencode-goal.git
cd opencode-goal
bun install
bun run check
```

To load the checkout directly in OpenCode 2, add its absolute path to
`opencode.json`:

```json
{
    "$schema": "https://opencode.ai/config.json",
    "plugins": ["/absolute/path/to/opencode-goal"]
}
```

OpenCode loads the TypeScript source through the package exports. Restart it if
a local source change is not picked up.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the contribution workflow.

## License

[MIT](LICENSE)

The design follows OpenCode's documented
[plugin configuration](https://opencode.ai/v2/docs/plugins/),
[server plugin API](https://opencode.ai/v2/docs/build/plugins/), and
[CLI plugin API](https://opencode.ai/v2/docs/build/plugins/cli). Completion
behavior is modeled on Claude Code's documented
[`/goal` loop](https://code.claude.com/docs/en/goal), while persistence follows
Codex's goal lifecycle.
