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

Review sessions from a time range:

```text
Call session_reflection with action=collect and period="thisWeek".
```

`period` accepts `today`, `yesterday`, `last3days`, `last7days`, `last30days`, `thisWeek`, `lastWeek`, `thisMonth`, or `lastMonth`. `today`/`yesterday`/`this*`/`last*` are calendar-anchored in the local timezone; `lastNd` covers the last N calendar days including today; weeks start on Monday. Pass `since` with an ISO date or datetime (for example `"2026-08-10"`) instead of `period` for an arbitrary start. `period` and `since` are mutually exclusive and both only apply when neither `sessionID` nor `sessionName` is given.

Save a generated report:

```text
Call session_reflection with action=save, runID=<run-id>, and analysis=<final report markdown>.
```

Saving requires the run ID returned by the corresponding collect action. Every save creates an immutable Markdown report and a same-base-name JSON sidecar. Their globally unique names include the run ID, a timestamp, and random entropy, so concurrent processes never share a report path. Both files are written under:

```text
${XDG_CONFIG_HOME}/opencode/session-reflections/reports/
```

`XDG_CONFIG_HOME` is honored only when it is an absolute path. If it is unset, empty, or relative, storage falls back to `~/.config/opencode/session-reflections/`.

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

The report header records the run ID, the active OpenCode agent, and the actual number of sessions in the validated manifest snapshot. A shortened, illustrative result might look like:

```text
1. Missing success criteria repeatedly caused verification ambiguity. [session_id: example-1]
2. A reusable pre-completion checklist is feasible and high-value. [session_id: example-2]
```

## Privacy And Local Data

The plugin does not upload session content to a separate service on its own. It returns selected transcript evidence to the current OpenCode session, where it may be sent to the model provider configured for that session. The generated analysis prompt also asks the agent to perform external prior-art research when tools and network access are available.

Session metadata and transcripts are read through OpenCode APIs. Implicit discovery uses `/experimental/session` cursor pagination across projects; the plugin does not read OpenCode's SQLite storage.

Audit logs are metadata-only by default. They are written locally under:

```text
~/.config/opencode/session-reflections/
├── reports/
├── runs/
└── events.jsonl
```

Audit directories are created with mode `0700`, and manifests, events, reports, and report sidecars with mode `0600`. Run manifests contain redacted collect metadata such as session IDs, counts, hashed directory paths, prompt hashes, and skip reasons. They omit session titles, raw transcripts, tool output, and the generated prompt, but metadata should still be treated as private and is not guaranteed to be secret-free.

Collect manifests are immutable after creation and are never updated when a report is saved. Each report sidecar self-associates its report with the run by recording the run ID, report path, save time, reviewed-session count, and a hash of the exact manifest snapshot used to build the report.

The plugin rejects symbolic links at the `runs`, `reports`, manifest-target, and event-log boundaries, and rejects non-regular or hard-linked event logs. Files are fully written and permissioned as private temporary files before exclusive publication that cannot overwrite an existing target. A crash can leave a dot-prefixed temporary file, but a published report is complete and identifies its run without requiring a manifest update. Cross-process saves use distinct immutable report/sidecar pairs and no process-local lock.

Saved Markdown reports contain the supplied analysis and may include sensitive excerpts copied by the model. You are responsible for retention and deletion of both reports and audit metadata.

## Release And Update History

### v0.3.0

- Replaced SQLite lookup and offset listing with OpenCode `1.17.11+` experimental cursor pagination.
- Added nested/flattened timestamp compatibility, current-session exclusion, deduplication, and bounded evidence collection.
- Required validated collect run IDs for report saving, immutable report sidecars, and hardened local audit permissions and redaction.
- Added `period` (`today`, `yesterday`, `last3days`, `last7days`, `last30days`, `thisWeek`, `lastWeek`, `thisMonth`, `lastMonth`) and `since` (ISO date) time-range filters for session collection.
- Migrated to the V1 plugin module format (`id` + `server`) so the plugin loads correctly on OpenCode `1.18.x`, where the legacy loader treated every exported function as a plugin.

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

Use OpenCode `1.17.11` or later. Name lookup uses the cross-project `/experimental/session` endpoint and forwards the title query through its `search` parameter.

### Saving says the run ID is invalid or unknown

Run `action=collect` first, then pass the exact returned `runID` to `action=save`. Reports cannot be saved without a matching local run manifest.

### The report is empty or too small

Try increasing `limit`, selecting a specific `sessionID`, or searching by `sessionName`. Empty sessions and sessions without reviewable transcript content are skipped.

The collected evidence is capped at 48,000 characters by default. Pass `evidenceBudget` to `collect` to override it per call, or set the `SESSION_REFLECTION_EVIDENCE_BUDGET` environment variable as a persistent default. When content does not fit, each selected session remains represented and explicit omission markers identify excluded transcript items.

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
