# @zademy/opencode-error-explainer

[![npm](https://img.shields.io/npm/v/@zademy/opencode-error-explainer.svg)](https://www.npmjs.com/package/@zademy/opencode-error-explainer)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![tests](https://github.com/zademy/opencode-error-explainer/actions/workflows/ci.yml/badge.svg)](https://github.com/zademy/opencode-error-explainer/actions/workflows/ci.yml)

> An [OpenCode](https://opencode.ai) plugin that detects failed terminal commands, **explains them to the AI in real time**, and writes a **private, Sentry-style event** for every error — stack frames with source preview, OS/runtime/git context, breadcrumbs, and grouping frequency. **100% local. Nothing is ever transmitted.**

## Table of contents

- [Why](#why)
- [What you get](#what-you-get)
- [How it works](#how-it-works)
- [Requirements](#requirements)
- [Install](#install)
- [Quickstart](#quickstart)
- [Configuration](#configuration)
- [Custom patterns](#custom-patterns)
- [The `explain_error` tool](#the-explain_error-tool)
- [Optional: a `/explain` command](#optional-a-explain-command)
- [Sentry-grade events (private, local)](#sentry-grade-events-private-local)
- [Privacy & security](#privacy--security)
- [Development](#development)
- [Supported signatures](#supported-signatures)
- [Contributing](#contributing)
- [License](#license)

## Why

When a command fails, the model usually has to read the whole output and guess
the cause. This plugin does that reasoning the instant a tool returns: it matches
the output against a multi-stack signature library, hands the model a concise
diagnosis, and writes a **redacted, machine-readable event** so the diagnosis is
never lost.

The result: the model fixes errors faster with fewer follow-up questions, and
your debugging history is auditable — without a single byte leaving your
machine.

## What you get

- 🔎 **Content-based detection** — works even though OpenCode exposes no exit
  code to plugins; never pollutes successful commands.
- 🧠 **Concise diagnosis inline** — the model sees the cause + fix immediately.
- 🧩 **Data-driven patterns** — add signatures in code or via a project-local
  `.error-patterns.json`; no rebuild needed for team-specific errors.
- 🛰️ **Sentry-style events** — structured stacktraces, source preview, OS / runtime
  / git context, breadcrumbs, and grouping frequency.
- 🔒 **Private by design** — no telemetry, no network, secrets redacted on disk.
- 🧪 **Robust** — TypeScript strict, 77 unit/integration tests, every side effect
  isolated so a failure can never break your session.

## How it works

1. **Detects** failures by content. OpenCode does not expose exit codes to
   plugins, so the plugin reads the merged `output` string and applies a pattern
   + signal-density heuristic — it never pollutes successful commands.
2. **Classifies** against a data-driven registry covering Node, TypeScript,
   Python, Java/Maven/Gradle, Rust, Go, Docker, Kubernetes, Git, SQL, shell,
   network, and OS errors.
3. **Enriches** two channels:
   - appends a short explanation to the tool `output` the model reads, and
   - injects a structured classification into `output.metadata`.
4. **Persists** a **private, Sentry-style event** to `last-error.{md,json}` (and
   a rotating history), with secrets redacted before anything is written to disk.

## Requirements

- **OpenCode** (the plugin uses the `tool.execute.after` hook + custom tools)
- **Node.js >= 20** (declared in `package.json#engines`)
- No other runtime dependencies — `@opencode-ai/plugin` and `zod` are provided by
  the OpenCode host at runtime (declared as peer dependencies).

## Install

Add the plugin to your `opencode.json` (global or project):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [["@zademy/opencode-error-explainer", { "verbosity": "concise" }]]
}
```

Then **restart OpenCode** — config is loaded once at startup and is not
hot-reloaded.

> **Heads-up after upgrades:** OpenCode caches plugins under
> `~/.cache/opencode/packages/@zademy/...`. After publishing or bumping a
> version, clear that cache and restart so the new code is fetched.

## Quickstart

1. Install and restart OpenCode (above).
2. Make a command fail, e.g. tell the agent:
   > run `node -e "require('does-not-exist')"`
3. The tool result the model receives now ends with a one-line diagnosis:
   ```
   > [Error Explainer] Missing dependency: A required module is not installed. Install it or fix the import path.
   ```
4. Read the full report any time:
   ```bash
   cat .opencode/error-explainer/last-error.md
   ```
   …or ask the model: *"use the explain_error tool to recall the last error."*

## Configuration

All options are optional and passed via the tuple form shown in [Install](#install).
Defaults are safe; invalid values silently fall back so a bad config never breaks
your session.

| Option                 | Type                           | Default                                       | Description                                                                 |
| ---------------------- | ------------------------------ | --------------------------------------------- | --------------------------------------------------------------------------- |
| `enabled`              | `boolean`                      | `true`                                        | Master switch.                                                              |
| `outputDir`            | `string`                       | `<worktree>/.opencode/error-explainer`        | Where artifacts are written (relative to worktree, or absolute).            |
| `historyLimit`         | `number`                       | `10`                                          | How many recent errors to keep. `0` disables history.                       |
| `stacks`               | `Stack[]`                      | all                                           | Restrict activation to these stacks (e.g. `["java","typescript"]`).         |
| `verbosity`            | `"concise" \| "detailed"`      | `"concise"`                                   | Detail of the full report (artifact + `explain_error`).                     |
| `redact`               | `boolean`                      | `true`                                        | Strip likely secrets from persisted output and source previews.             |
| `appendMode`           | `"minimal" \| "full" \| "off"` | `"minimal"`                                   | What to append inline to the tool output the AI sees. The full report always lives in the artifact + `explain_error`. |
| `sourcePreview`        | `boolean`                      | `true`                                        | Read `±sourceContextLines` around each in-app frame from the worktree.      |
| `sourceContextLines`   | `number`                       | `5`                                           | Lines of source captured on each side of the error line.                    |
| `breadcrumbs`          | `boolean`                      | `true`                                        | Gather prior tool calls of the session as breadcrumbs.                      |
| `breadcrumbLimit`      | `number`                       | `15`                                          | How many breadcrumbs to retain.                                             |
| `gitContext`           | `boolean`                      | `true`                                        | Capture git branch/commit/dirty.                                            |
| `runtimeContext`       | `boolean`                      | `true`                                        | Capture OS + runtime versions.                                              |
| `fingerprint`          | `boolean`                      | `true`                                        | Compute a grouping fingerprint + per-fingerprint frequency.                 |
| `skipReadOnlyCommands` | `boolean`                      | `true`                                        | Skip read-only commands (cat/grep/less…) so inspecting a log isn't flagged. |
| `readOnlyCommands`     | `string[]`                     | built-in list                                 | Override the set of read-only command prefixes.                             |
| `customPatternsPath`   | `string`                       | `.error-patterns.json`                        | Path (relative to worktree) to your custom patterns file. `null` disables.  |

**`Stack` values** (`stacks` / a pattern's `stack`): `node`, `typescript`,
`python`, `java`, `go`, `rust`, `docker`, `kubernetes`, `git`, `sql`, `shell`,
`network`, `os`, `generic`.

> **Why `appendMode: "minimal"` by default?** The OpenCode TUI renders the
> command's live output; an appended block is not always re-rendered on screen.
> The full, reliable report lives in the artifact and in the `explain_error`
> tool response (both shown in the TUI). The inline append is kept to one line
> so the model still gets the diagnosis immediately.

## Custom patterns

Drop a `.error-patterns.json` in your worktree root to add team-specific
signatures or override built-ins (by `id`):

```json
{
  "patterns": [
    {
      "id": "my_service_503",
      "stack": "network",
      "type": "Internal service unavailable",
      "severity": "error",
      "pattern": "SERVICE_X returned 503",
      "flags": "i",
      "suggestion": "Service X is down. Check its health endpoint and retry.",
      "nextSteps": ["Run `make svc-x-logs`.", "Page the on-call if it persists."]
    }
  ]
}
```

| Field        | Required | Notes                                                                                |
| ------------ | -------- | ------------------------------------------------------------------------------------ |
| `id`         | yes      | Unique; matching a built-in `id` overrides it.                                       |
| `type`       | yes      | Human-readable category.                                                             |
| `suggestion` | yes      | One actionable English sentence.                                                     |
| `pattern`    | yes      | String (with optional `flags`) **or** a regex object. Malformed entries are dropped. |
| `stack`      | no       | Defaults to `generic`. One of the `Stack` values above.                              |
| `severity`   | no       | `critical \| error \| warning \| info` (default `error`).                            |
| `nextSteps`  | no       | Array of strings; shown in `detailed` verbosity.                                     |
| `extractors` | no       | `{ "file": <regex>, "line": <regex> }` — capture group 1 becomes the location.       |

## The `explain_error` tool

The plugin registers an `explain_error` tool the model can call on demand:

- **`explain_error({ text: "..." })`** — classify arbitrary error text right now.
- **`explain_error()`** — recall the most recently captured error (renders the
  full report).

This is how the model recovers an explanation even after the inline enrichment
has scrolled out of context.

## Optional: a `/explain` command

OpenCode commands are file-based and ship with the **user's** project (a plugin
cannot register one), so copy this snippet into `.opencode/command/explain.md`
if you want a one-keystroke `/explain`:

```markdown
---
description: Explain the most recent terminal error.
agent: build
---

Use the `explain_error` tool with no arguments to recall the last captured
error, then give me a one-paragraph root-cause analysis and a concrete fix.
If there is no recent error, tell me so.
```

## Sentry-grade events (private, local)

Every captured error becomes an event that mirrors Sentry's ingest shape — but
**on your machine only**:

- **Structured stacktrace** — language-aware frames (`filename`, `function`,
  `lineno`, `colno`, `in_app`, `module`) for JavaScript/TypeScript, Python, Java,
  Rust, and Go.
- **Source preview** — `±N` lines read from the worktree around each in-app
  frame (binary/minified/external files skipped), with the error line marked.
- **Contexts** — OS (name/version/arch), runtime (node/python/go…), and
  application (worktree, cwd, git branch, git commit SHA, dirty flag).
- **Breadcrumbs** — the prior tool calls of the session (command + status +
  timing), gathered defensively from the opencode client.
- **Fingerprint & frequency** — a normalized signature is SHA-1 hashed for
  grouping; `index.json` tracks `first_seen`, `last_seen`, and `times_seen` per
  fingerprint.

Inspect the last event any time:

```bash
cat .opencode/error-explainer/last-error.md   # sectioned report
cat .opencode/error-explainer/last-error.json # full Sentry-shaped event
```

## Privacy & security

- **No telemetry, no network.** The plugin performs no outbound requests;
  events and breadcrumbs are written only to your worktree.
- **Secrets redacted on disk.** Before any artifact is written, output and
  source-preview lines are passed through a redaction layer (AWS keys, PEM
  blocks, JWTs, GitHub tokens, labeled `password=`/`token=`/`api_key=` values,
  and more) that replaces likely secrets with `[REDACTED]`.
- **Live output is not redacted.** The in-session output the model reads stays
  intact so it can reason about the real command; redaction is a write-to-disk
  concern only.

See [SECURITY.md](./SECURITY.md) for the full policy and how to report a
vulnerability.

## Development

```bash
npm ci            # reproducible install
npm run typecheck # tsc --noEmit
npm test          # Vitest suite (77 tests)
npm run build     # tsup → dist/
npm pack --dry-run # inspect the published tarball
```

Before a PR, ensure all three pass: `npm run typecheck && npm test && npm run build`.

Project layout (pure functions isolated from side effects so everything is
trivially unit-testable):

```
src/
  index.ts        Plugin entry — wires hooks + the custom tool
  config.ts       Typed options + validation (never throws)
  version.ts      Single source of truth for the version
  classify/       types, built-in patterns, pure engine, custom-pattern loader, read-only skip
  enrich/         explanation builder + secret redaction (both pure)
  trace/          language-aware stacktrace parser (pure)
  context/        source preview, git context, runtime/OS context (side-effects isolated)
  breadcrumbs/    session breadcrumb gathering (defensive client access)
  event/          Sentry-grade event types, assembler, renderer, fingerprint (pure)
  persist/        crash-safe artifact writer, rotating history, frequency index
  hooks/          thin tool.execute.after orchestrator
  tools/          explain_error custom tool
  util/           path resolution + JSON serialization
test/             Vitest suite (one file per module)
```

## Supported signatures

Node `Cannot find module`, `EADDRINUSE`, `EACCES`, `ECONNREFUSED`, `ENOENT`, npm
`ERESOLVE`; TypeScript `TS####`; Python `Traceback`, `ModuleNotFoundError`,
`SyntaxError`; Maven `BUILD FAILURE`, Gradle `BUILD FAILED`, Java exceptions;
Rust `E####` + panics; Go panics + compile errors; Docker image-not-found /
non-zero exit / daemon unreachable; Kubernetes `NotFound`, `CrashLoopBackOff`,
`ImagePullBackOff`; Git merge conflicts, rejected pushes, auth failures; SQL
syntax + missing-relation; shell `command not found`; disk-full; and a generic
fallback for unrecognised errors carrying two or more signals.

## Contributing

Contributions are welcome! Read [CONTRIBUTING.md](./CONTRIBUTING.md) for setup,
conventions, and how to add patterns. This project follows the
[Contributor Covenant Code of Conduct](./CODE_OF_CONDUCT.md).

## License

[MIT](./LICENSE) © Zademy
