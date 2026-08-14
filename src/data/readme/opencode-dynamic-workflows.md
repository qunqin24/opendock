# opencode-dynamic-workflows

Dynamic multi-agent workflows for [OpenCode](https://opencode.ai), implemented as a shareable OpenCode plugin.

This plugin brings a Claude Code-style dynamic workflow pattern to OpenCode: a main agent can design a workflow, then the plugin runs bounded worker sessions in parallel or sequential phases, collects their outputs, optionally synthesizes each phase, and returns a concise report.

The implementation intentionally uses a safe JSON DSL instead of executing arbitrary model-generated JavaScript.

## Features

- `workflow_run` tool for running JSON-defined multi-agent workflows
- `workflow_list`, `workflow_show`, and `workflow_run_saved` tools for saved workflows
- `workflow_resume` tool for resuming partial/failed runs without re-running completed tasks
- Automatic `/workflow` command injection
- Automatic `/deep-research` command injection
- Parallel and sequential workflow phases
- Optional phase synthesis workers
- Per-task `retries` and `timeoutMs` failure handling
- ASCII timeline (Gantt-style) in the final report showing task parallelism
- Live per-task status tree with elapsed times in tool metadata
- Worker recursion protection by disabling workflow tools inside child sessions
- Concurrency and total-agent limits
- Context accumulation limits to protect worker context windows
- Run history persisted to `.opencode/workflows/runs/`
- Saved workflow specs persisted to `.opencode/workflows/`
- Optional workflow `budget` with runtime `maxCostUsd` / `maxTokens` overrides on `workflow_run`
- Shell tasks (`kind: "shell"`) for deterministic commands without LLM cost
- Optional `outputSchema` on agent tasks for validated JSON results
- Optional `isolation: "worktree"` for ephemeral git worktree task sandboxes

## Requirements

- OpenCode 1.15 or newer
- Bun or npm for local development
- At least one configured OpenCode model provider

## Install with OpenCode Plugin

Published on npm as [`opencode-dynamic-workflows`](https://www.npmjs.com/package/opencode-dynamic-workflows). Install with OpenCode's plugin installer:

```bash
opencode plugin opencode-dynamic-workflows --global
```

Use `--force` when upgrading an existing install:

```bash
opencode plugin opencode-dynamic-workflows --global --force
```

Restart OpenCode after installation. The installer downloads the npm package and updates your global OpenCode config.

Equivalent manual config:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-dynamic-workflows"]
}
```

> Note: `opencode plugin` installs npm modules. For local development or unpublished commits, use the local path setup below.

## Install From GitHub

Clone the repository somewhere stable:

```bash
git clone https://github.com/vogtsw/opencode-dynamic-workflows.git
cd opencode-dynamic-workflows
bun install
bun run build
```

Then reference the local path in `opencode.json` for development before publishing changes:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["/absolute/path/to/opencode-dynamic-workflows"]
}
```

On Windows, use an escaped absolute path:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["D:\\test\\mygithub\\opencode-dynamic-workflows"]
}
```

## Share As A Tarball

Build and pack the plugin:

```bash
bun install
bun run build
npm pack
```

This creates a file like:

```text
opencode-dynamic-workflows-1.2.0.tgz
```

Send that `.tgz` file to another user. They can unpack it or install it into a stable directory, then reference that directory from `opencode.json`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["/absolute/path/to/opencode-dynamic-workflows"]
}
```

## Publish To npm

This repository includes a GitHub Actions workflow at `.github/workflows/publish-npm.yml`.

To make every release installable through `opencode plugin`:

1. Create an npm automation token with publish access.
2. Add it to the GitHub repository secrets as `NPM_TOKEN`.
3. Bump `package.json`'s `version`.
4. Merge the release commit.
5. Create and publish a GitHub Release for the matching tag.

When the GitHub Release is published, the workflow runs:

```text
bun install --frozen-lockfile
bun test
bun run build
npm pack --dry-run
npm publish --access public
```

After npm publish completes, users can install the release with:

```bash
opencode plugin opencode-dynamic-workflows --global --force
```

Manual publish flow:

```bash
bun install
bun run build
bun test
npm pack --dry-run
npm publish
```

After publishing, other users can also install it by adding this to their OpenCode config:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-dynamic-workflows"]
}
```

## Verify Installation

Check that OpenCode loaded the plugin:

```bash
opencode debug config
```

You should see:

```jsonc
{
  "command": {
    "workflow": {},
    "deep-research": {}
  }
}
```

Check that the workflow tools are available to an agent:

```bash
opencode debug agent build
```

You should see these tools:

```text
workflow_run
workflow_list
workflow_run_saved
workflow_show
workflow_resume
```

Run a dry-run smoke test:

```bash
opencode run --model provider/model "Call the workflow_run tool once with dryRun=true and a one-task workflow spec."
```

If the plugin is working, the tool output includes:

```text
# Dry Run:
```

## Commands

### `/workflow <task>`

Asks the active model to design a workflow spec and call `workflow_run`.

Example:

```text
/workflow audit this repository for risky file writes and missing tests
```

### `/deep-research <question>`

Asks the active model to split a research question into multiple investigation angles, run them as a workflow, and synthesize the findings.

Example:

```text
/deep-research what is the best migration path from library A to library B in this codebase?
```

## Tools

### `workflow_run`

Runs a workflow from a JSON spec.

| Argument | Type | Description |
| --- | --- | --- |
| `goal` | string | Workflow goal |
| `spec` | string | JSON workflow spec. If omitted, a default workflow is generated from `goal`. |
| `concurrency` | number | Max concurrent worker sessions. Default `4`, max `16`. |
| `maxAgents` | number | Max total worker and synthesis sessions. Default `100`, max `1000`. |
| `saveAs` | string | Save the spec for later reuse under this name. |
| `dryRun` | boolean | Validate and print the plan without running workers. |
| `maxCostUsd` | number | Runtime budget cap in USD. Overrides `spec.budget.usd` when set. |
| `maxTokens` | number | Runtime token cap. Overrides `spec.budget.tokens` when set. |
| `agent` | string | Default OpenCode agent for worker sessions. |
| `model` | string | Default model in `provider/model` format. |

### `workflow_list`

Lists saved workflow specs and recent run records.

### `workflow_show`

Shows a saved workflow spec.

### `workflow_run_saved`

Loads a saved workflow by name and runs it.

### `workflow_resume`

Resumes a previous run by `runId`. Completed tasks are skipped and their saved outputs are reused; failed and skipped tasks are re-executed. The resumed run keeps the original `runId` and updates the same run record.

| Argument | Type | Description |
| --- | --- | --- |
| `runId` | string | Run ID to resume (see `workflow_list`). |
| `concurrency` | number | Max concurrent worker sessions. Default `4`, max `16`. |
| `maxAgents` | number | Max total worker and synthesis sessions. |
| `agent` | string | Default OpenCode agent for worker sessions. |
| `model` | string | Default model in `provider/model` format. |

## Workflow Spec DSL

```json
{
  "name": "audit-security",
  "goal": "Audit the project for security vulnerabilities",
  "phases": [
    {
      "id": "scan",
      "title": "Parallel Scan",
      "strategy": "parallel",
      "tasks": [
        {
          "id": "secrets",
          "description": "Scan for leaked secrets",
          "prompt": "Scan all files for hardcoded API keys and credentials."
        },
        {
          "id": "deps",
          "description": "Audit dependencies",
          "prompt": "Check dependencies for known security concerns."
        }
      ],
      "synthesisPrompt": "Combine the findings, rank them by severity, and note conflicts."
    },
    {
      "id": "remediate",
      "title": "Sequential Remediation",
      "strategy": "sequential",
      "tasks": [
        {
          "id": "plan",
          "description": "Create fix plan",
          "prompt": "Based on the scan results, create a prioritized remediation plan."
        },
        {
          "id": "apply",
          "description": "Apply fixes",
          "prompt": "Implement the remediation plan from the previous step."
        }
      ]
    }
  ]
}
```

### Top-Level Fields

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | string | Yes | Workflow name. Also used when saving specs. |
| `goal` | string | Yes | Human-readable workflow goal. |
| `budget` | object | No | Optional caps: `{ "usd": number, "tokens": number }`. Overridable at runtime via `workflow_run`. |
| `phases` | array | Yes | Ordered list of workflow phases. |

### Phase Fields

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | string | Yes | Unique phase ID. |
| `title` | string | No | Human-readable phase title. Defaults to `id`. |
| `strategy` | `parallel` or `sequential` | No | Execution strategy. Defaults to `parallel`. |
| `tasks` | array | Yes | Tasks in this phase. |
| `synthesisPrompt` | string | No | Optional prompt for an extra synthesis worker after phase tasks finish. |

### Task Fields

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | string | Yes | Unique task ID. |
| `description` | string | No | Short task description. Defaults to `id`. |
| `kind` | `agent` or `shell` | No | Task type. Defaults to `agent`. |
| `prompt` | string | For agent tasks | Worker prompt. Make this self-contained. |
| `command` | string | For shell tasks | Shell command run via `session.shell` (no LLM cost). |
| `isolation` | `worktree` | No | Run the task in an ephemeral git worktree under `.opencode/workflows/worktrees/`. Requires a git repo. |
| `outputSchema` | object | No | JSON Schema for agent task output. Parsed into `TaskResult.data`. |
| `agent` | string | No | OpenCode agent override for this task. |
| `model` | string | No | Model override in `provider/model` format. |
| `retries` | number | No | Extra attempts after the first failure. Clamped to `0..3`. |
| `timeoutMs` | number | No | Per-attempt timeout in milliseconds. Clamped to `5s..30min`. |

## Persistence

Saved workflow specs:

```text
.opencode/workflows/<name>.json
```

Run records:

```text
.opencode/workflows/runs/<run-id>.json
```

The path is relative to the OpenCode worktree used by the current session.

## Safety Model

- The plugin does not execute arbitrary model-generated JavaScript.
- The workflow language is JSON only.
- Worker sessions get workflow tools disabled to reduce accidental recursion.
- `concurrency` is clamped to `1..16`.
- `maxAgents` is clamped to `1..1000`.
- Saved workflow names are sanitized before writing files.
- Task failures are captured in the report instead of crashing the whole run when possible.
- Task `retries` are clamped to `0..3` and `timeoutMs` to `5s..30min`.
- Timed-out or aborted prompts are never re-sent within the same attempt, to avoid duplicating side effects.
- Accumulated phase context is clipped before being passed to workers.

## Development

Install dependencies:

```bash
bun install
```

Build:

```bash
bun run build
```

Test:

```bash
bun test
```

Package dry run:

```bash
npm pack --dry-run
```

## Project Layout

```text
src/
  commands.ts      Injects /workflow and /deep-research commands
  index.ts         OpenCode plugin entrypoint
  persistence.ts   Saved specs and run records
  report.ts        Markdown report rendering
  runner.ts        Worker-session orchestration
  spec-parser.ts   JSON DSL validation and normalization
  worktree.ts      Ephemeral git worktree isolation for tasks
  tools.ts         OpenCode tool definitions
  types.ts         Shared TypeScript types
tests/
  *.test.ts        Unit tests
dist/
  *.js             Built plugin JavaScript used by OpenCode
```

## License

MIT
