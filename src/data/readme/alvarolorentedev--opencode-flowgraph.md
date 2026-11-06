# opencode-flowgraph

[![npm](https://img.shields.io/npm/v/@alvarolorentedev/opencode-flowgraph)](https://www.npmjs.com/package/@alvarolorentedev/opencode-flowgraph)
[![license](https://img.shields.io/badge/license-Apache--2.0-blue)](LICENSE)

**Turn your multi-agent process into a workflow you can run again.**

Define your development loop once — plan, build, review, secure, ship — as a YAML graph. Run it with the OpenCode agents you already have. Every run is durable, inspectable, and steerable from the TUI or Desktop.

<img width="400" height="500" alt="Screenshot 2026-11-05 at 12 32 50" src="https://github.com/user-attachments/assets/c94a1795-a283-432c-ae3a-8f51c38f621e" />
<img width="300" height="500" alt="Screenshot 2026-11-05 at 12 33 17" src="https://github.com/user-attachments/assets/464fbb78-3d71-4853-a4d7-2c4a439233b6" />

## What you get

- **Your process, not ad-hoc prompts.** Write the review loop once and run it against every change. Same agents, same gates, same outcomes.
- **Your agents, not a new runtime.** Workflow nodes use native OpenCode agents from `.opencode/agents`. No hosted backend, no custom LLM client, no second tool to learn.
- **Real quality loops.** Agents report structured outcomes; the graph routes on them. `changes_requested` sends work back; `approved` moves it forward; `blocked` pauses for a human.
- **Runs that survive interruptions.** Checkpoints are persisted after every transition. Restart the server and completed work is not redone; ambiguous work is blocked, never silently re-run.
- **Visibility and control.** Watch the active node in a TUI diagram or a Desktop Mermaid graph, open any node's session, and pause, resume, or cancel the run.
- **Local-first by default.** Workflows and runtime state stay on your machine. Nothing is sent to a third-party service.
- **Guardrails that respect you.** Native permissions still apply. The plugin never auto-approves, never edits your agents, and blocks workflow edits to your OpenCode configuration.

## How it works

You bring two things:

1. **Agents** — native Markdown agents in `.opencode/agents/*.md`, owned by OpenCode.
2. **A workflow** — a YAML graph in `.opencode/workflows/*.yaml`, owned by this plugin.

The plugin validates the graph, then runs one agent at a time in a fresh OpenCode session. Each agent does its job and reports an outcome. The validated graph — not the agent — decides where the run goes next. State is checkpointed after every step, so runs can pause and recover without losing completed work.

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
  "plugins": ["@alvarolorentedev/opencode-flowgraph@0.8.1"]
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

Create `.opencode/workflows/development.yaml`:

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
      approved: complete
      changes_requested: developer
      blocked: pause
```

The file stem must match `name`. Every node must be reachable from `entry`, and each node defines either `next` or `routes`. See the [workflow guide](docs/guide.md) for the full schema and limits.

### 4. Run it

In the TUI:

```text
/flowgraph run development "Add retry handling to the API client"
```

Or open the palette and choose **Flowgraph** to browse runs and workflows. In OpenCode Desktop, use the **Flowgraph** command to pick a run; the experimental GUI panel renders its graph.

### 5. Watch and steer

- **TUI** — `/flowgraph` opens the live graph; `enter` opens the active node's session, `p` pauses, `c` cancels.
- **Desktop** — the **Workflow** command opens a run picker; click nodes to inspect their sessions.
- **RPC** — `getRun`, `getRunGraph`, `pauseRun`, `resumeRun`, `cancelRun`, and the `runUpdated` event.

## Before you start

- OpenCode V2 with `@opencode/plugin` versions `>=2.0.32 <3`.
- Agents must be visible, `mode: primary` or `mode: all`, have a model, and be able to use tools.
- `mode: subagent` agents are not supported directly. Change them to `mode: all` if you want them in a workflow.
- The plugin registers `flowgraph_report`, the typed tool agents use to report outcomes. You do not add it yourself.

## Honest limits

- Sequential execution only: no parallel branches, graph joins, or nested workflows yet.
- One active workflow per canonical project tree. Multi-host HA is not supported.
- No hosted execution, marketplace, visual editor, or browser UI.
- Exactly-once external side effects are not promised. Cost is reported, not capped.
- The Desktop GUI is experimental; the TUI and RPC are the stable surfaces.

## Ready-made examples

[`examples/.opencode`](examples/.opencode) contains agents and three workflows — `development`, `review`, and `product-delivery` — you can copy into a project and adapt.

## Documentation

| Read this | For |
|---|---|
| [Workflow guide](docs/guide.md) | Agents, YAML schema, routing, outcomes, limits, examples |
| [Operations](docs/operations.md) | Execution, recovery, storage, concurrency, permissions, guardrails |
| [Interfaces](docs/interfaces.md) | RPC, `/flowgraph` command, TUI, Desktop GUI, Mermaid |
| [Development](docs/development.md) | Architecture, local development, migration, releasing |

## License

Apache-2.0. See [`LICENSE`](LICENSE).
