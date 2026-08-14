# opencode-bg-control

`opencode-bg-control` adds safe, bounded visibility and cancellation controls for OpenCode background Task subagents. It is designed for root orchestrators that need occasional status reconciliation, terminal output, failure diagnostics, or deliberate cancellation without replacing OpenCode's built-in completion and failure notifications.

Plugin is server-only and memory-only. It does not add TUI code, persistence, a polling service, direct HTTP fetches, a reconstructed client, or private SDK imports.

- **npm:** <https://www.npmjs.com/package/opencode-bg-control>
- **GitHub:** <https://github.com/DKotsyuba/opencode-bg-control>

## Install with npm (recommended)

Add the package name to your OpenCode configuration:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-bg-control"]
}
```

**Do not run `npm install` for normal use.** OpenCode automatically installs the package with Bun into its cache when it starts a new process or restarts.

## Enable background subagents

The feature flag must exist before the OpenCode process starts:

```sh
export OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS=1
opencode
```

`OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS` accepts `true`, `false`, `1`, or `0` (case-insensitive, with surrounding whitespace ignored). Explicit `false` or `0` disables tools. Restart an existing OpenCode TUI or process after setting or changing the flag; changing the environment of an already-running process does not enable it.

OpenCode's broader `OPENCODE_EXPERIMENTAL` flag is recognized only when the specific flag is absent, but explicit `OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS=1` is recommended and removes ambiguity. Invalid values produce unknown capability and tools refuse action. Exact background Task markers observed during the current process can upgrade capability to enabled.

## Quick verification

1. Start a new OpenCode session after completing the installation and feature-flag steps above.
2. Ask the agent to call `bg_list` once.
3. Expect an envelope containing `ok: true` and `feature: "enabled"`.

## Local development install (secondary)

This section is only for developing, testing, or packaging this repository; it is not required for normal users. Clone the repository, run `npm install`, and configure an absolute path to `index.ts` instead:

```json
{"plugin":["/absolute/path/to/opencode-bg-control/index.ts"]}
```

Do not use a repository-relative path or directory URL. Restart the TUI after configuration or environment changes.

## Prerequisites and compatibility

- OpenCode with experimental background subagents enabled.
- Bun and npm only for local development, testing, and packaging.

Runtime dependency and type contract target `@opencode-ai/plugin@1.18.5`. Live smoke testing passed with OpenCode binary `1.18.6`, including all five tools and cancellation. OpenCode supplies the injected legacy `client`; the package installs the public plugin helper used by its tools. Compatibility with future upstream API or event-shape changes is not guaranteed.

## Tools

All tools return bounded JSON envelopes using schema `opencode-bg-control/v1`.

| Tool | Purpose | Usage rule |
| --- | --- | --- |
| `bg_list` | Return one bounded snapshot of jobs observed in caller's session tree. | Use at planning boundary, after ambiguous notification, on explicit request, or before cancellation. Never loop or poll. |
| `bg_status` | Perform one SDK-backed reconciliation for one already-tracked job. | Use for cancellation decision, explicit request, failure investigation, or notification ambiguity. Never use as wait primitive. |
| `bg_result` | Return bounded final output/error for already-terminal job. | Call only after terminal notification or terminal `bg_status`. Never probe running job. |
| `bg_transcript` | Return latest bounded transcript page for failure debugging or cancellation decision. | Do not repeatedly watch progress. Older-page pagination is unavailable. |
| `bg_cancel` | Idempotently cancel one exactly identified running job. | Use only after user request or deliberate decision from one snapshot. Never call speculatively or in loop. |

Built-in Task completion/failure notifications remain authoritative. Launch background work, continue only non-overlapping work, then wait for push notification naturally. Do not sleep and repeatedly invoke control tools.

## Status accuracy and process epochs

Every job reports `accuracy: "exact" | "inferred"`:

- **Exact** evidence includes background Task metadata, synthetic terminal notifications, confirmed legacy abort responses, and `MessageAbortedError`.
- **Inferred** evidence may come from assistant completion/error or idle state when exact terminal evidence is unavailable.

State is scoped to one plugin process epoch and held only in memory. Coverage reports `scope: "process_epoch"` and `durable: false`. Restart creates an empty epoch. IDs from previous process epochs are refused until newly observed. Reused IDs are generation-tracked to prevent stale evidence from changing current generation.

Transcript endpoint exposes latest page only through supported legacy client shape. Older-page cursor retrieval is unavailable.

## Cancellation and ownership safety

Only root-session caller may use tools. Plugin refuses:

- unknown IDs;
- synchronous or unclassified Task IDs;
- child-session callers;
- jobs outside caller's session tree;
- IDs known only to earlier plugin process;
- cancellation when descendant ownership cannot be safely verified.

OpenCode cancellation is recursive. Plugin preflights target and all known descendants, sends exactly one abort for target, then relies on OpenCode's native cascade. Response reports bounded set of descendants known in current process epoch. Terminal completion wins races against pending cancellation, and repeated cancellation is idempotent.

## Verification

Run required checks and build:

```sh
npm test
npm run test:performance
npm run typecheck
npm run build
npm pack --dry-run --json
```

Published package contains compiled ESM JavaScript and declarations under `dist/`; TypeScript source and tests are excluded. Current release baseline: 129 tests pass. Event-path performance tests verify bounded O(1) reducer paths over 10,000 irrelevant events without SDK access.

## Security and privacy

- Public outputs, errors, transcript content, titles, and details are size-bounded.
- Secret-like keys, assignments, auth schemes, and private-key material are redacted.
- Tool details and reasoning are omitted unless explicitly requested where supported.
- No persistent job database, telemetry store, direct transport reconstruction, or credential handling.
- Runtime directory is passed only to host client requests required for session ownership and data access.

Redaction is defense in depth, not guarantee that arbitrary model output contains no sensitive information. Review output before sharing it.

## Limitations

- Depends on OpenCode experimental background Task metadata, event shapes, and injected legacy client API.
- No durable history across restarts.
- No older transcript-page retrieval.
- Observes only jobs seen during current process epoch.
- Does not suppress, mutate, or replace built-in Task notifications.
- Upstream OpenCode API changes can require adapter updates even when package types still compile.

## License and status

Project is experimental and not an official OpenCode component. The current source is licensed under the [MIT License](LICENSE).

v0.1.0 remains available under GPL-3.0-only as published. MIT applies to v0.1.1 and later source/releases unless changed in a future release.
