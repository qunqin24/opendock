# Background Tasks

`background-tasks` is an experimental Bun workspace for local background task orchestration in agent workflows. It provides a JSON-first CLI, reusable task lifecycle primitives, and opencode integrations for long-running local commands.

## Status

- Maturity: experimental
- Maintainer model: solo-maintained
- Repository visibility: private until explicitly approved for public access
- Package channel: npm is the intended first channel, but packages are not published yet

Use this project when an agent needs to start, inspect, stop, restart, or stream logs from local background processes through machine-stable JSON. Do not use it as a hosted job runner, remote execution service, credential vault, or multi-tenant scheduler.

## Packages

The root workspace package is private. The publishable package set is:

- `@skastr0/background-tasks-core`: task lifecycle, log, and control-plane primitives
- `@skastr0/background-tasks`: npm runner package for the `background-tasks` CLI
- `@skastr0/background-tasks-darwin-arm64`: macOS arm64 standalone CLI binary
- `@skastr0/background-tasks-darwin-x64`: macOS x64 standalone CLI binary
- `@skastr0/background-tasks-linux-arm64`: Linux arm64 standalone CLI binary
- `@skastr0/background-tasks-linux-x64`: Linux x64 standalone CLI binary
- `@skastr0/background-tasks-opencode`: OpenCode server plugin and TUI integration

`apps/cli` is a private source workspace. The public CLI package uses a Node launcher that delegates to one of the platform binary packages.

The first public release should publish npm packages only after repository visibility, npm trusted publishing or registry credential setup, package dry-runs, and maintainer approval are complete. GitHub Releases and Homebrew distribution are deferred.

See `PUBLISHING.md` for the release authority model, package order, OpenCode plugin install shape, and CLI binary topology.

## Install

Until packages are published, install from source:

```sh
bun install
bun run build:binary
bun run install:local
```

Requirements:

- Bun 1.3 or newer
- macOS or Linux for the current local-process workflow

After publication, the intended npm runner entrypoints are:

```sh
npx @skastr0/background-tasks --version
bunx @skastr0/background-tasks --version
pnpm dlx @skastr0/background-tasks --version
```

## CLI Shape

The CLI is JSON-first. Domain data is passed as a single JSON payload, while flags only control execution behavior.

Payload input modes:

```sh
background-tasks start '{"id":"bg_demo","command":"sleep","args":["60"]}'
background-tasks start @payload.json
cat payload.json | background-tasks start -
```

Execution flags:

- `--output auto|inline|artifact`
- `--wait`
- `--stream`
- `--timeout <seconds>`
- `--concurrency <n>`

Success is written to stdout:

```json
{
  "ok": true,
  "command": "status",
  "data": {}
}
```

Expected failures are written to stderr with exit code `1`:

```json
{
  "ok": false,
  "command": "status",
  "error": {
    "type": "TaskNotFound",
    "message": "task not found: bg_missing",
    "details": {
      "id": "bg_missing",
      "hint": "Run list to discover known task ids.",
      "retryable": false
    }
  }
}
```

## Lifecycle

Core commands:

- `start` submits and starts one task, or a batch of tasks.
- `status` inspects one task.
- `list` lists tasks with optional `ids`, `status`, `tag`, or `tags` filters.
- `wait` blocks until a task reaches `exited`, `killed`, or `failed`.
- `stop` cancels one task, or a batch of tasks.
- `restart` restarts one task, or a batch of tasks.
- `logs` reads bounded task logs.
- `events` emits status/log event frames.

Example:

```sh
background-tasks start '{"id":"bg_demo","command":"sh","args":["-c","printf ready\\\\n; sleep 60"],"tags":["demo"]}'
background-tasks status '{"id":"bg_demo"}'
background-tasks logs --output auto '{"id":"bg_demo","lines":50}'
background-tasks stop '{"id":"bg_demo"}'
```

Batch example:

```sh
background-tasks start --concurrency 2 '[
  {"id":"bg_one","command":"sleep","args":["30"]},
  {"id":"bg_two","command":"sleep","args":["30"]}
]'
```

## Logs And Artifacts

`logs` defaults to a bounded inline preview. When more log lines exist than the requested preview, `--output auto` returns a compact summary plus an artifact record pointing at the full log file.

```json
{
  "kind": "summary+artifact",
  "summary": "Showing 50 of 412 log lines for bg_demo.",
  "artifact": {
    "key": "task.bg_demo.logs",
    "kind": "text",
    "absolute_path": "/abs/path/bg_demo.log",
    "relative_path": "logs/bg_demo.log",
    "size_bytes": 18320
  }
}
```

Use `--stream` with `logs` or `events` for NDJSON event frames, one JSON object per line.

## Discovery

Agents should prefer discovery commands over README scraping:

```sh
background-tasks doctor
background-tasks capabilities
background-tasks schema list
background-tasks schema show start
background-tasks examples list
background-tasks examples show start
```

`schema show` returns JSON Schema generated from the same Effect Schema boundary used to decode payloads.

## Configuration

| Name | Required | Default | Description |
| --- | --- | --- | --- |
| `BACKGROUND_TASKS_HOME` | no | `$HOME/.local/state/background-tasks` | Local state root for task metadata, logs, and artifacts. |

Task payloads may include environment variables for spawned commands. Treat those values as local secrets: do not commit payloads, logs, artifacts, or scan output containing credentials, private endpoints, customer data, or personal data.

## Development

```sh
bun install
bun run typecheck
bun test
bun run build
bun run smoke:npm-cli
bun run pack:dry-run
```

The full local verification command is:

```sh
bun run verify
```

Package and release preparation details live in `PUBLISHING.md`.

## CI

GitHub Actions runs on pushes to `main` and on pull requests. The workflow installs with Bun, runs `bun run verify`, and inspects npm package contents with `bun run pack:dry-run`. Workflow permissions are read-only.

## Security

This project starts local processes and captures local logs by design. Review payloads before running them, and do not treat the CLI as a sandbox. The opencode control-plane session code is local coordination data, not a long-lived credential.

Please report security issues privately. See `SECURITY.md`.

## Contributing And Support

Issues are welcome when they include enough context to reproduce or evaluate the request. See `CONTRIBUTING.md` and `SUPPORT.md` for project boundaries.

## License

MIT. See `LICENSE`.
