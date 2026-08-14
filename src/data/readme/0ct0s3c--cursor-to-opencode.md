# Cursor-to-OpenCode: Cursor Rules for OpenCode

[![npm version](https://img.shields.io/npm/v/@0ct0s3c/cursor-to-opencode.svg)](https://www.npmjs.com/package/@0ct0s3c/cursor-to-opencode)
[![npm package](https://img.shields.io/npm/dm/@0ct0s3c/cursor-to-opencode.svg)](https://www.npmjs.com/package/@0ct0s3c/cursor-to-opencode)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Use Cursor `.cursor/rules` in OpenCode. This OpenCode plugin discovers Cursor rule files, validates frontmatter, dynamically injects matching rules into chat context, and provides `/cursor-to-opencode` diagnostics for loaded, inactive, skipped, and rejected rules.

## Features

- Loads Cursor rules from `.cursor/rules/**/*.md` and `.cursor/rules/**/*.mdc`.
- Supports `alwaysApply`, `globs`, `description`, manual rule mentions, `@file` references, optional `.cursorrules`, and `AGENTS.md` detection.
- Dynamically injects only the relevant Cursor rules for the current OpenCode session.
- Reports invalid or unsupported Cursor rules with clear diagnostics.
- Provides `/cursor-to-opencode` and `/cursor-to-opencode stats` commands.
- Stores stats outside the project by default so your repo does not get noisy changed files.

## Keywords

OpenCode plugin, Cursor rules, `.cursor/rules`, `.cursorrules`, Cursor-to-OpenCode, AI coding rules, system prompt injection, OpenCode AI, Cursor AI, developer tools.

## Install

Add the npm package to `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@0ct0s3c/cursor-to-opencode@latest"]
}
```

Pin a release if you want reproducible behavior:

```json
{
  "plugin": ["@0ct0s3c/cursor-to-opencode@1.0.6"]
}
```

## Test Locally Before Publishing

You do not need to publish to npm to test this plugin on your computer. OpenCode supports local path plugins.

Build the package:

```powershell
npm install
npm run build
```

Then add the local package directory to the OpenCode config for the project you want to test:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    "C:/path/to/Cursor-to-OpenCode"
  ]
}
```

You can also point directly at the built server file:

```json
{
  "plugin": [
    "file:///C:/path/to/Cursor-to-OpenCode/dist/index.js"
  ]
}
```

Restart OpenCode after changing `opencode.json`. Create a test rule such as `.cursor/rules/test.mdc` in the project being tested:

```md
---
alwaysApply: true
---

Reply with "Cursor rule plugin is active" when asked to verify rules.
```

Then ask OpenCode to verify the rule. To inspect diagnostics, ask it to call the `cursor_to_opencode`, `cursor_to_opencode_status`, or `cursor_to_opencode_stats` tool.

The plugin intercepts `/cursor-to-opencode` through OpenCode's `command.execute.before` hook, the same pattern used by plugins like DCP. Restart OpenCode after changing plugin config, then run:

```text
/cursor-to-opencode
```

Project injection stats are available with:

```text
/cursor-to-opencode stats
```

Stats are stored outside the project by default under OpenCode's config directory, so `/cursor-to-opencode stats` does not create changed files in your repo. Set `statsPath` only if you explicitly want project-local stats.

If your OpenCode build does not dispatch unknown slash commands to plugin hooks, create `.opencode/commands/cursor-to-opencode.md` in the project where you are testing:

```md
---
description: Show Cursor rules loaded in this OpenCode session
---

Call the `cursor_to_opencode` tool. Show which Cursor rules were loaded, matched, skipped, or rejected for this session. Include validation warnings and rejection reasons.
```

Alternatively, define `/cursor-to-opencode` directly in `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    "file:///C:/path/to/Cursor-to-OpenCode/dist/index.js"
  ],
  "command": {
    "cursor-to-opencode": {
      "description": "Show Cursor rules loaded in this OpenCode session",
      "template": "If the first argument is `stats`, call the `cursor_to_opencode_stats` tool. Otherwise call the `cursor_to_opencode` tool. Show Cursor rule diagnostics clearly."
    }
  }
}
```

With this config, `/cursor-to-opencode` is an OpenCode custom command even if hook-dispatched unknown commands are disabled. The plugin still provides the underlying tools.

To debug plugin loading, start OpenCode with:

```powershell
opencode --print-logs --log-level DEBUG
```

On Windows, log files are normally under `%USERPROFILE%\.local\share\opencode\log`.

For release-like testing, run:

```powershell
npm run ci
npm pack
```

`npm pack` verifies the exact tarball that would be published. OpenCode's easiest pre-release path is still the local directory or `file:///.../dist/index.js` plugin config; use the tarball mainly to inspect package contents.

## Supported Cursor Rule Formats

- `.cursor/rules/**/*.md`
- `.cursor/rules/**/*.mdc`
- nested `.cursor/rules` folders
- `.cursor/rules/imported/**`
- `alwaysApply`
- `description`
- `globs`
- manual `@rule` mentions
- `@file` references for diagnostics
- optional legacy `.cursorrules`
- `AGENTS.md` detection for status parity

Cursor User Rules and Team Rules are settings/dashboard data, not normal repo files. The plugin reports those as unsupported external surfaces unless a future option provides an explicit import path.

## Dynamic Rule Matching

- `alwaysApply: true` rules are injected every turn.
- `globs` rules are injected when a tracked active file matches.
- `description`-only rules use lightweight prompt/file relevance scoring.
- manual-only rules inject only when mentioned.
- invalid rules are rejected with reason-coded diagnostics.

## Commands And Tools

The plugin exposes these OpenCode tools:

- `cursor_to_opencode`
- `cursor_to_opencode_status`
- `cursor_to_opencode_stats`

The plugin also intercepts these slash commands directly through `command.execute.before`:

- `/cursor-to-opencode`
- `/cursor-to-opencode stats`

If your OpenCode build does not dispatch unknown slash commands to plugins, add a command file:

```md
---
description: Show Cursor rules loaded in this OpenCode session
---

Call the `cursor_to_opencode` tool and summarize which Cursor rules loaded, matched, skipped, or failed validation.
```

Save that as `.opencode/commands/cursor-to-opencode.md`, then run `/cursor-to-opencode`.

## Options

```json
{
  "plugin": [
    ["@0ct0s3c/cursor-to-opencode@latest", {
      "legacyCursorrules": true,
      "strict": false,
      "maxRulesPerTurn": 20,
      "maxRuleBytes": 120000,
      "intelligentMatching": true,
      "statusCommand": true,
      "includeAgentsMd": false,
      "allowExternalRulePaths": false,
      "statsEnabled": true,
      "statsPath": ""
    }]
  ]
}
```

By default, `statsPath: ""` stores stats globally per workspace. If you want the old repo-local behavior, set `statsPath` to `.opencode/cursor-to-opencode-stats.json`.

## Validation

Known Cursor frontmatter fields are `alwaysApply`, `description`, and `globs`.

The validator rejects invalid YAML, invalid known-field types, empty rule bodies, unreadable rules, and unsafe paths. It warns for unknown fields, ignored fields under `alwaysApply: true`, oversized rules, unresolved `@file` references, and YAML-array `globs` in non-strict mode.

## Development

```powershell
npm install
npm run typecheck
npm run test
npm run build
npm run pack:dry
```
