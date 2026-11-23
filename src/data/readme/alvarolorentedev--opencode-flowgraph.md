# opencode-flowgraph

[![npm](https://img.shields.io/npm/v/@alvarolorentedev/opencode-flowgraph)](https://www.npmjs.com/package/@alvarolorentedev/opencode-flowgraph)
[![license](https://img.shields.io/badge/license-Apache--2.0-blue)](LICENSE)

**Turn your multi-agent process into a workflow you can run again.**

Define your development loop once — plan, build, review, secure, ship — as a YAML graph. Run it with the OpenCode agents you already have. Every run is durable, inspectable, and steerable from the TUI or Desktop.

Flowgraph is a portable workflow engine with harness adapters. OpenCode is the reference adapter and the only execution adapter today. The same engine also ships a standalone `flowgraph` CLI for inspecting and validating workflows; executing from the CLI needs an explicitly configured native adapter module.

<img width="400" height="500" alt="Screenshot 2026-11-05 at 12 32 50" src="https://github.com/user-attachments/assets/c94a1795-a283-432c-ae3a-8f51c38f621e" />
<img width="300" height="500" alt="Screenshot 2026-11-05 at 12 33 17" src="https://github.com/user-attachments/assets/464fbb78-3d71-4853-a4d7-2c4a439233b6" />

## What you get

- **Your process, not ad-hoc prompts.** Write the review loop once and run it against every change. Same agents, same gates, same outcomes.
- **Your agents, not a new runtime.** Agent nodes use native OpenCode agents from `.opencode/agents`; human nodes wait for you. No hosted backend, no custom LLM client, no second tool to learn.
- **Real quality loops.** Agents report structured outcomes; the graph routes on them. `changes_requested` sends work back; `approved` moves it forward; `blocked` pauses for a human.
- **Human gates.** Mark a node `human: true` to wait for an approval or decision. The chosen outcome and feedback route into the graph like any agent result.
- **Runs that survive interruptions.** Checkpoints are persisted after every transition. Restart the server and completed work is not redone; ambiguous work is blocked, never silently re-run.
- **Parallel and reusable workflows.** Fork into concurrent branches, join their results, and call another workflow by name. Start multiple runs in the same checkout.
- **Visibility and control.** Follow active steps in the TUI or Desktop graph, open their sessions, and pause, resume, or cancel a run.
- **Local-first by default.** Workflows and runtime state stay on your machine. Nothing is sent to a third-party service.
- **Guardrails that respect you.** Native permissions still apply. The plugin never auto-approves, never edits your agents, and blocks workflow edits to your OpenCode and flowgraph configuration.

## How it works

You bring two things:

1. **Agents** — native Markdown agents in `.opencode/agents/*.md`, owned by OpenCode.
2. **A workflow** — a YAML graph in `.flowgraph/workflows/*.yaml`, owned by this plugin. Existing `.opencode/workflows/*.yaml` files keep working.

The plugin validates the graph, then runs one node at a time. Agent nodes use a fresh OpenCode session; human nodes wait for a decision. Each node reports an outcome. The validated graph — not the agent — decides where the run goes next. State is checkpointed after every step, so runs can pause and recover without losing completed work.

Flowgraph is split into a portable workflow core and a harness adapter. The core owns graphs, scheduling, checkpoints, recovery, and structured outcomes. The adapter owns native agents, sessions, models, permissions, and tools. OpenCode is the reference adapter and the only adapter implemented today. The core exposes the active adapter's capabilities and keeps runs written by another harness visible but read-only. A run's first valid structured report is canonical, so duplicate or conflicting reports cannot overwrite it. See [`docs/architecture.md`](docs/architecture.md) and [`docs/adapters.md`](docs/adapters.md); other harnesses are not supported yet.

### Workflow directory

One resolver is shared by the plugin and the CLI:

1. an explicit workflow directory (`--workflow-dir`);
2. an existing `.flowgraph/workflows/`;
3. a legacy `.opencode/workflows/` when the neutral directory does not exist;
4. otherwise `.flowgraph/workflows/` for new installations.

If both directories exist, `.flowgraph/workflows/` wins and the legacy directory is ignored. Files are never merged or moved automatically; a warning tells you how to move them. See [migration](docs/operations.md#migrating-workflows-to-flowgraphworkflows).

## Onboarding

### 1. Install the plugin

Add it to `opencode.jsonc`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["@alvarolorentedev/opencode-flowgraph"]
}
```

Pin a version when reproducibility matters:

```jsonc
{
  "plugins": ["@alvarolorentedev/opencode-flowgraph@1.0.1"]
}
```

OpenCode loads the published package directly. No clone or build required.

### 2. Define an agent

Create `.opencode/agents/reviewer.md`. It must be a primary (or `all`) agent with a model and tool access:

```md
---
description: Reviews changes for correctness and missing tests
mode: primary
model: opencode-go/deepseek-v4.1-flash
---

Review the change. Report findings in severity order.
```

### 3. Define a workflow

Create `.flowgraph/workflows/development.yaml` (existing `.opencode/workflows/` files still work):

```yaml
version: 1
name: development
description: Development with iterative quality checks

entry: developer

limits:
  max_steps: 12
  timeout_seconds: 3600

nodes:
  developer:
    agent: developer
    next: reviewer

  reviewer:
    agent: reviewer
    routes:
      approved: signoff
      changes_requested: developer
      blocked: pause

  signoff:
    human: true
    label: Approve the release
    routes:
      approved: complete
      rejected: developer
```

The file stem must match `name`. Every node must be reachable from `entry`. An agent node defines exactly one of `next` or `routes`; a human node defines `routes`. See the [workflow guide](docs/guide.md) for the full schema and limits.

### 4. Run it

In the TUI:

```text
/flowgraph run development "Add retry handling to the API client"
```

Or open the palette and choose **Flowgraph** to browse runs and workflows. In OpenCode Desktop, use the **Workflow** command to pick a run; the experimental GUI panel renders its graph. A run owned by another harness, or an unadopted legacy run, opens read-only in the current session's Workflow panel.

### 5. Watch and steer

- **TUI** — `/flowgraph` opens the live graph. Use `enter` for the primary active session, `s` to pick a session, and `p` to pause, resume, or answer a human step.
- **Desktop** — the **Workflow** command opens a run picker; click nodes to inspect their sessions, or use **Respond** for a human step.
- **RPC** — `harnessCapabilities`, `getRun`, `getRunGraph`, `pauseRun`, `resumeRun`, `respondRun`, `cancelRun`, and the `runUpdated` event.

The TUI and Desktop show the active harness, its capability summary, and any
honest security warning. OpenCode reports protected paths as `best_effort`:
known file tools are intercepted and shell commands are inspected
heuristically, while native permissions remain the security boundary. A run
owned by another harness is labeled and read-only in this client.

## Standalone CLI

The npm package also installs a `flowgraph` executable. It does not load the
OpenCode plugin or an OpenCode server.

```bash
npm install -g @alvarolorentedev/opencode-flowgraph
flowgraph --help
flowgraph list
flowgraph validate development
flowgraph show development
flowgraph runs
flowgraph graph <run-id>
```

Workflow inspection, validation, and CLI-state inspection need no adapter.
`validate` reports structural validity separately from agent resolution and
never claims a workflow is fully valid without a native agent check.

Execution and run control need an explicitly configured, trusted local adapter
module:

```bash
flowgraph run development "Add retry handling" --adapter-module ./my-adapter.mjs
flowgraph resume <run-id> --adapter-module ./my-adapter.mjs --confirm-retry
flowgraph respond <run-id> --outcome approved --adapter-module ./my-adapter.mjs
flowgraph pause <run-id> --adapter-module ./my-adapter.mjs
flowgraph cancel <run-id> --adapter-module ./my-adapter.mjs
```

The module must export `createHarnessAdapter(context)` returning a
`HarnessAdapter`. Adapter modules are trusted code and run in the CLI process.
Remote modules are rejected. OpenCode remains the only shipped execution
adapter, so the CLI cannot run a workflow until a native adapter module exists.
See [`docs/adapters.md`](docs/adapters.md#standalone-cli-adapter-provider).

`pause` drains active nodes before it reports `paused`, including a run whose
previous CLI process exited. A run with any branch blocked on a native permission
or human decision must be resolved or answered instead of paused. If a native
permission appears only after the pause starts, the CLI stops waiting with exit
`1`, keeps the run `pausing`, and prints the resume command; resolve the
permission first. A pause drain is not restart reconciliation, so interrupted or
retried pauses never consume the run's recovery budget. While a pause waits for
active nodes, press Ctrl-C to stop waiting; the run stays `pausing` with its
checkpoint and can be resumed.

Useful flags: `--project <dir>`, `--workflow-dir <dir>`, `--state-dir <dir>`,
`--adapter-module <path>`, `--json`. Human-readable output is the default;
`--json` prints machine-readable JSON, or NDJSON for `run`. Exit codes are `0`
for success, blocked, or cancelled; `1` for invalid or rejected operations; `2`
for usage or unsafe directories; and `3` when an adapter is missing or rejected.

CLI state lives in `.flowgraph/state/` and is separate from OpenCode's plugin
storage. It holds run records, objectives, and native session references; add
`.flowgraph/state/` to `.gitignore` and do not commit it. Runs started in
OpenCode are managed by the plugin and are not visible to the CLI's
`runs`/`graph` commands, so the CLI cannot control them. Workflow and state
directories must resolve inside the real project path; a symlink that points
outside is rejected with exit code `2` rather than followed.

### Package exports

```text
@alvarolorentedev/opencode-flowgraph             OpenCode plugin entry
@alvarolorentedev/opencode-flowgraph/rpc         OpenCode RPC contract
@alvarolorentedev/opencode-flowgraph/contract    Shared RPC/Zod schemas
@alvarolorentedev/opencode-flowgraph/workflow    Workflow schema and loader
@alvarolorentedev/opencode-flowgraph/server      OpenCode server entry
@alvarolorentedev/opencode-flowgraph/tui         TUI entry
@alvarolorentedev/opencode-flowgraph/gui-experimental  Experimental Desktop GUI bundle
@alvarolorentedev/opencode-flowgraph/core        Portable schemas, loader, validator, harness contract
@alvarolorentedev/opencode-flowgraph/runtime     Portable runtime factory
@alvarolorentedev/opencode-flowgraph/storage     StoragePort and FileSystemStoragePort
```

## Before you start

- OpenCode V2 with `@opencode/plugin` versions `>=2.0.32 <3`.
- Agents must be visible, `mode: primary` or `mode: all`, have a model, and be able to use tools.
- `mode: subagent` agents are not supported directly. Change them to `mode: all` if you want them in a workflow.
- The plugin registers `flowgraph_report`, the typed tool agents use to report outcomes. You do not add it yourself.

## Honest limits

- OpenCode is the only execution adapter. Codex, Claude Code, and ACP adapters do not exist yet.
- The CLI can inspect and validate workflows without an adapter; it cannot run one until a trusted local adapter module is supplied.
- CLI state (`.flowgraph/state/`) is separate from OpenCode plugin storage. The CLI cannot see or control runs started by OpenCode.
- Parallel branches and concurrent runs share the checkout. Overlapping file writes can conflict.
- Execution supports one OpenCode server per project database.
- Report persistence is canonical per step on one server; distributed exactly-once is not promised.
- Runs written by another harness are visible and read-only until a second adapter ships.
- No hosted execution, marketplace, visual editor, or browser UI.
- Exactly-once external side effects are not promised. Cost is reported, not capped.
- The Desktop GUI is experimental; the TUI and RPC are the stable surfaces.

## Ready-made examples

[`examples/.opencode`](examples/.opencode) contains agents and four workflows you can copy and adapt, including `parallel-review` for forks, joins, and calls.

## Documentation

| Read this | For |
|---|---|
| [Workflow guide](docs/guide.md) | Agents, human steps, YAML schema, routing, outcomes, limits, examples |
| [Operations](docs/operations.md) | Execution, recovery, storage, concurrency, permissions, guardrails |
| [Interfaces](docs/interfaces.md) | RPC, `/flowgraph` command, TUI, Desktop GUI, Mermaid |
| [Architecture](docs/architecture.md) | Core/adapter boundary, runtime contract, storage, recovery, security |
| [Adapters](docs/adapters.md) | Implementing a harness adapter, result transports, compatibility notes |
| [Roadmap](docs/roadmap.md) | Harness parity status, contract, capabilities, and second-harness gates |
| [Development](docs/development.md) | Module map, local development, migration, releasing |

## License

Apache-2.0. See [`LICENSE`](LICENSE).
