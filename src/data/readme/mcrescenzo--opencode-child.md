# opencode-child

Test another opencode plugin, command, agent, or config change in an isolated
child session — without restarting your parent opencode TUI.

`opencode-child` is a local opencode plugin that starts, inspects, prompts,
and stops disposable child `opencode serve` processes from a parent opencode
session. Point a child at a scratch project (or the checkout of the plugin
you're changing), prompt it, inspect the result, and tear it down — all
without touching the session you're actually working in.

## Quick Start

Start a disposable child, prompt it, inspect the result, then stop it:

```text
oc_child_start({ "trustMode": "safe", "cleanupPolicy": "delete-on-stop" })
// -> { id: "child_...", port, ... } - use the returned id as childId below

oc_prompt({
  "childId": "child_...",
  "model": "openai/gpt-5.5",
  "text": "Say ok",
  "timeoutMs": 30000
})
// oc_prompt creates a session automatically when sessionId is omitted

oc_inspect({ "childId": "child_...", "sessionId": "ses_..." })

oc_child_stop({ "childId": "child_..." })
```

`safe` mode binds to loopback, forces `--pure`, and generates HTTP Basic auth
so the child stays isolated by default; use `trustMode: "inherit"` for a
child that behaves like your normal opencode config. See
[docs/usage.md](docs/usage.md) for the full walkthrough, including explicit
session creation, model selection, and notification options.

## Install

For a local clone or copied checkout, register `opencode-child.js` in your
`opencode.json` under the singular `"plugin"` key by an absolute path or a
path relative to the `opencode.json` file that declares it:

```json
{
  "plugin": ["/path/to/opencode-child/opencode-child.js"]
}
```

For the published npm package, install it where opencode resolves plugins
and register the package name instead:

```json
{
  "plugin": ["@mcrescenzo/opencode-child"]
}
```

Restart opencode after changing plugin config. Running sessions keep the already-loaded plugin set.

## Prerequisites

- The `opencode` binary must be on `PATH` — this plugin spawns `opencode serve` child processes. `OPENCODE_BIN` is supported as a custom-binary override, but safe mode treats it like `opencodeBin` and rejects it unless explicitly unsafe-approved.
- Node.js `>=20.11.0` (the plugin's package `engines.node` floor; use a runtime compatible with opencode as well).
- Supported opencode route contract: verified against opencode `1.17.13`; startup fails closed if a child server lacks required startup routes. Optional inspection routes degrade into capability flags.

## Package Manager

npm is canonical for this package. Use the tracked `package-lock.json` with `npm install`, `npm ci`, `npm test`, `npm run smoke`, and `npm pack --dry-run --json`.

One transitive optional dependency, `msgpackr-extract`, declares an install script through `node-gyp-build-optional-packages`. It is optional native acceleration from the opencode dependency graph; release and CI dependency checks should use npm's lockfile and may use `--ignore-scripts` when only dependency resolution is being verified.

## Tools

- `oc_child_start`: start a child server on `127.0.0.1` with a random port and generated HTTP Basic auth by default.
- `oc_child_status`: inspect health, process state, sessions, registries, trust posture, and logs.
- `oc_child_stop`: stop by advisory `/instance/dispose`, then PID/process-group verification and termination for live plugin-managed children. `childId: "all"` requires `confirmAll: true`.
- `oc_child_restart`: restart using the saved child spec and refreshed startup inspection.
- `oc_session_create`: create a child session.
- `oc_prompt`: send a prompt with bounded async polling; returns partial inspection on timeout and watches the child session for best-effort parent notifications.
- `oc_inspect`: aggregate child/session messages, diffs, todos, registries, and logs.
- `oc_events`: return bounded best-effort SSE event history.
- `oc_command`, `oc_shell`, `oc_permission`: bounded wrappers for verified server endpoints.
- `oc_plugin_smoke_test`: start, inspect, create a session, stop, and return evidence.

## Hooks

The plugin registers `tool` (the `oc_*` tools above), `event` (forwards
parent session events for child notifications), and `dispose` (stops live
children on unload) hooks. See [docs/hooks.md](docs/hooks.md) for detail.

## Safety at a glance

- **Trust modes**: `inherit` (default) may reuse your normal opencode config/env/MCP behavior but isolates child data/cache/state by default; `safe` is best-effort local isolation (loopback, `--pure`, generated Basic auth, stripped env) and is **not** a security sandbox; `full-trust` is explicit and parent-approved, and is required for `dangerouslySkipPermissions`.
- **Defaults**: binds to loopback by default — non-loopback needs `allowNonLoopback: true` and is still refused over plaintext HTTP until a TLS-backed connection path exists — plus generated and redacted child passwords, bounded/truncated tool output, and rejection of caller-supplied external directories unless explicitly approved.
- **Configuration**: environment knobs (`OPENCODE_CHILD_MAX_LIVE`, `OPENCODE_CHILD_STATE_DIR`, `OPENCODE_BIN`, `OPENCODE_PLUGIN_DIAGNOSTICS_DIR`/`OPENCODE_PLUGIN_DIAGNOSTICS_DISABLED`) tune the concurrency cap, registry location, spawned binary, and diagnostics logging.
- **Model selection**: `oc_prompt`, `oc_shell`, and `oc_command` accept a model as a combined `"provider/model-id"` string or `{ providerID, modelID }`; bare model IDs without a provider are rejected.
- **Notifications**: `oc_prompt` can queue a best-effort parent-session notification when the watched child session goes idle, errors, hits a permission wall, or exits unexpectedly — idle-gated, so it never interrupts an active parent turn.

Full detail on every mode, default, and knob: [docs/safety.md](docs/safety.md).

## Skills

This package ships four agent skills under `skills/` for coding agents that
read `SKILL.md` files from a project. They are documentation only — opencode
does not load them, and they are not part of the published npm tarball. See
[docs/agents.md](docs/agents.md) for the full list.

**For AI agents**: start with
[`skills/opencode-child-orchestration/SKILL.md`](skills/opencode-child-orchestration/SKILL.md)
before using this plugin's tools — it's the standard start/inspect/prompt/stop
workflow. Three companion skills cover sandbox safety, permission triage, and
server debugging.

## Verification

```sh
npm test
npm run smoke
```

`npm test` runs the deterministic suite; `npm run smoke` runs a live local
lifecycle check against a real `opencode` binary before release. See
[CONTRIBUTING.md](CONTRIBUTING.md) for the CI gate, dependency policy, and
hard invariants for contributors.
