# OpenCode Session Reflection

Your OpenCode sessions are not just chat history. They are engineering evidence.

`opencode-session-reflection` is an OpenCode plugin that helps you review recent coding-agent sessions and turn repeated workflow failures into better rules, skills, commands, and tools.

It is useful when you want to answer questions like:

- Why did the agent stop too early?
- Did my instruction miss acceptance criteria?
- Did the agent verify the wrong thing?
- Is this failure repeating across sessions?
- Should this repeated shell workaround become a real OpenCode tool?

Part of the [OpenCode Reliability Toolkit](https://jczhu.com/opencode-tools/): small tools for making AI coding agents more reliable in real engineering workflows.

## What It Does

The plugin collects selected OpenCode sessions and produces a structured reflection prompt for the current model. The report focuses on:

- Communication gaps between you and the agent.
- Recurring agent mistakes such as missing verification, editing before reading context, or failing to grep similar patterns.
- Opportunities to create reusable rules, skills, commands, or plugins instead of repeating manual fixes.
- Prior-art checks so the recommendation prefers reuse, configuration, extension, or forking before rebuilding.

The goal is not to judge one bad answer. The goal is to find patterns in how your human-agent workflow fails.

## Install

Add the plugin to your OpenCode config:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-session-reflection"]
}
```

Restart OpenCode after changing the config.

If your OpenCode setup does not automatically install npm plugins by name, install the package first:

```sh
npm install -g opencode-session-reflection
```

## Quick Start

After restarting OpenCode, ask the agent to call the `session_reflection` tool.

Review recent sessions:

```text
Call session_reflection with action=collect and limit=5.
```

Review one known session:

```text
Call session_reflection with action=collect and sessionID=<session-id>.
```

Review by session title:

```text
Call session_reflection with action=collect and sessionName="npm whoami ENEEDAUTH".
```

Save a generated report:

```text
Call session_reflection with action=save, runID=<run-id>, and analysis=<final report markdown>.
```

Saved reports are written under:

```text
~/.config/opencode/session-reflections/reports/
```

## Optional Slash Command

This repository includes a `/session-review` command file, but OpenCode does not automatically install slash commands from an npm plugin package.

If you use the local development deploy helper, the slash command is copied into your OpenCode command directory and you can run:

```text
/session-review
/session-review 12
/session-review <session-id>
/session-review npm whoami ENEEDAUTH
```

For normal npm users, the registered tool is the stable interface. Ask the agent to call `session_reflection` directly.

## What The Report Looks For

The generated prompt asks the current model to review session evidence across several categories.

| Category | Examples |
|---|---|
| Communication gaps | unclear goals, missing acceptance criteria, scope ambiguity, unclear discuss-vs-implement intent |
| Agent mistakes | premature stopping, weak verification, missing global search, overbuilding, ignoring project rules |
| Workflow opportunities | repeated prompts, recurring checklists, missing slash commands, missing custom tools |
| Reuse check | whether OpenCode, community plugins, npm, GitHub, or existing skills already solve the problem |

## Privacy And Local Data

The plugin does not upload session content to any external service on its own. It returns the collected reflection prompt inside the current OpenCode session. Whether that prompt is sent to a model depends on the provider configured in your OpenCode session.

Session transcripts are read through the OpenCode SDK.

In v0.2.0, session title search can also query the local OpenCode SQLite database at `~/.local/share/opencode/opencode.db` through the `sqlite3` CLI when available. This is used only to find matching session metadata across projects. If the database or `sqlite3` is unavailable, the plugin falls back to API-based session listing.

Audit logs are metadata-only by default. They are written locally under:

```text
~/.config/opencode/session-reflections/
├── reports/
├── runs/
└── events.jsonl
```

The default logs do not store raw user prompts, assistant responses, tool outputs, full transcripts, full directory paths, secrets, or the full generated prompt. Directory paths and prompts are represented by SHA-256 hashes.

## Release And Update History

### v0.2.0

- Added cross-project session title search via the local OpenCode SQLite database when `sqlite3` is available.
- Kept API-based session search as the fallback path when SQLite access is unavailable.
- Bumped the npm package to `0.2.0`.

### v0.1.1

- Added npm installation guidance and cross-tool links.
- Improved session name search through client-side filtering.

### v0.1.0

- Initial public plugin release.
- Added the `session_reflection` OpenCode tool.
- Added local report saving and metadata-only audit logs.

## Troubleshooting

### The slash command is not available

This is expected for normal npm plugin installation. Use the `session_reflection` tool directly, or copy `commands/session-review.md` into your OpenCode command directory.

### Search by session name misses sessions from other projects

Install `sqlite3` so v0.2.0 can search the local OpenCode database across projects. If `sqlite3` is not available, the plugin falls back to OpenCode API listing.

### The report is empty or too small

Try increasing `limit`, selecting a specific `sessionID`, or searching by `sessionName`. Empty sessions and sessions without reviewable transcript content are skipped.

## Development

Install dependencies:

```sh
npm install
```

Run tests:

```sh
npm test
```

Verify the plugin entrypoint imports correctly:

```sh
npm run check:import
```

Deploy local development files into your OpenCode config directory:

```sh
npm run deploy
```

Remove local development deployment:

```sh
npm run undeploy
```

Before publishing, inspect the package and run the standard checks:

```sh
npm test
npm run check:import
npm pack --dry-run
```

Do not publish from an automated agent run without explicit human confirmation.

## OpenCode Reliability Toolkit

| Tool | Description |
|------|-------------|
| [opencode-waitfor](https://github.com/chncaesar/opencode-waitfor) | `wait_for` for HTTP/TCP/command readiness checks |
| [opencode-db-clean](https://github.com/chncaesar/opencode-db-clean) | Reclaim disk space from bloated SQLite databases |
| [opencode-session-reflection](https://github.com/chncaesar/opencode-session-reflection) | Qualitative review of past coding sessions |
| [opencode-fleet](https://github.com/chncaesar/opencode-fleet) | Multi-node remote OpenCode orchestration |

## License

MIT
