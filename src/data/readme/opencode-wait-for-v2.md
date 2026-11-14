# opencode-wait-for-v2

An OpenCode **V2** plugin that gives the agent a `wait_for` tool for **blocking until a log line appears, a process exits, or a file/port/HTTP condition holds**, replacing foreground `sleep N; tail ...` polling.

```ts
wait_for({ path: "/tmp/build.log", pattern: "BUILD (SUCCESS|FAILURE)", timeout_ms: 600_000 })
```

## What problem does it solve?

OpenCode's built-in shell tool returns only when a command finishes. That costs long-running tasks twice:

1. **The whole conversation blocks while the command runs**, with no progress in the UI, so it looks stuck.
2. **There is no "wait for new output" primitive**, so the model has to build polling loops itself:

```bash
sleep 60; tail -c 800 build.log | tr '\r' '\n' | tail -12
ps -Ao pid,user,etime,command | grep -E '[m]vnd' | head -3
```

A 10-minute build often needs a dozen of these polls. Each one waits a guessed number of seconds and then spends another reasoning turn after it wakes up. In local measurements, the pause between a tool ending and the next assistant message had a P50 of **13.7 seconds**, so ten polls waste roughly 2-3 minutes, not counting the sleep itself.

`wait_for` compresses those polls into **one call**.

## Comparison

| | `sleep` polling | `wait_for` |
| --- | --- | --- |
| Conversation cost | N tool calls | **1 call** |
| When it returns | Fixed delay; too early or too late | **Immediately** when the condition holds |
| Timeout behavior | No bound; can poll forever | Returns explicitly with process state |
| UI feedback | Blank wait | Reports `waiting` progress every second |
| Interruption | Waits for sleep to finish | Stops immediately on ESC |
| Large logs | Repeatedly `tail` the whole file | Reads only the last 64 KB |

Measured: on an 11 MB build log, match detection took **3 ms**.

## Install

```bash
opencode plugin add opencode-wait-for-v2
```

Or add it to the global plugin directory manually (hot reload applies changes without a restart):

```bash
git clone https://github.com/lcssos/opencode-wait-for-v2 \
  ~/.config/opencode/plugins/opencode-wait-for-v2
```

Confirm it is loaded:

```bash
opencode plugin list
```

## Usage

### 1. Wait for a build or test run to finish

```bash
# Step 1: run the long task in the background with output redirected
mvnd -o clean install > /tmp/build.log 2>&1    # background: true
```

```ts
// Step 2: wait for the end marker in one call
wait_for({ path: "/tmp/build.log", pattern: "BUILD (SUCCESS|FAILURE)", timeout_ms: 600_000 })
```

The result includes the log tail, so **you do not need a separate `tail`**:

```text
[wait_for] condition met after 42.318s | path: /tmp/build.log

--- log tail ---
[INFO] BUILD SUCCESS
[INFO] Total time:  41.902 s
```

### 2. Wait for a port to come up

```ts
wait_for({ path: "/tmp/dev.log", pattern: "listening on|Started .* in .* seconds", timeout_ms: 120_000 })
```

### 3. Wait for a background process to exit

```ts
wait_for({ pid: 12345, timeout_ms: 300_000 })
// You can also provide path; both conditions must hold, and the log is returned
wait_for({ pid: 12345, path: "/tmp/build.log", pattern: "BUILD SUCCESS" })
```

### 4. The log already contains an old match

Use `must_be_new: true` to consider only content written **after the call starts**:

```ts
wait_for({ path: "/tmp/app.log", pattern: "ERROR", must_be_new: true })
```

### 5. Wait for a file, port, or HTTP condition

Pass a single `condition` object for anything beyond a log tail or process exit. It is checked immediately, then polled every `poll_ms`.

`condition` **takes precedence**: when it is set, `path`, `pattern`, `pid`, and `must_be_new` are ignored.

| `condition.type` | Required fields | Optional fields | Holds when |
| --- | --- | --- | --- |
| `file_exists` | `path` | `stableForMs` | The file exists (and has not changed for `stableForMs`). |
| `file_absent` | `path` | — | The file does not exist. |
| `file_changed` | `path` | `since`, `stableForMs` | Size or mtime differs from the first check (`since` is an epoch-ms cutoff), and is stable for `stableForMs`. |
| `file_contains` | `path`, `pattern` | `regex`, `mustBeNew` | The file tail contains `pattern`. With `mustBeNew`, only content written after the call is searched (latest 256 KB). |
| `process_exited` | `pid` | — | The process is gone. |
| `process_running` | `pid` | — | The process is alive. |
| `port_open` | `host`, `port` | — | A TCP connection succeeds. |
| `port_closed` | `host`, `port` | — | A TCP connection is refused or times out. |
| `http_status` | `url` | `status`, `headers` | The response status matches `status` (number or array; default any 2xx). |
| `http_json` | `url`, `jsonPath`, `equals` | `headers` | The JSON value at `jsonPath` equals `equals` (dot/bracket path). |
| `http_body_contains` | `url`, `pattern` | `regex`, `headers` | The response body contains `pattern`. |

Notes:

- Relative paths resolve against the session directory; absolute paths are used as-is.
- File content is read from the tail (64 KB, or up to 256 KB of new bytes with `mustBeNew`). HTTP bodies are capped at 256 KB.
- `regex: true` treats `pattern` as a regular expression; the default is a literal substring match.
- HTTP requests follow redirects. Each attempt times out after 2-10 seconds, derived from `poll_ms`.
- `http_json` paths support dots and brackets, e.g. `status` or `jobs[0].state`.
- Defaults are the same as the basic modes: `timeout_ms` 240000 (cap 600000), `poll_ms` 500.

```ts
// CI run finished
wait_for({
  condition: {
    type: "http_json",
    url: "https://api.github.com/repos/org/repo/actions/runs/123",
    jsonPath: "status",
    equals: "completed",
  },
  timeout_ms: 300_000,
  poll_ms: 5_000,
})

// package is available on the registry
wait_for({
  condition: { type: "http_status", url: "https://registry.npmjs.org/pkg/1.2.3", status: 200 },
  timeout_ms: 120_000,
})

// local service is listening
wait_for({
  condition: { type: "port_open", host: "127.0.0.1", port: 3000 },
  timeout_ms: 30_000,
})

// wait for a line written after the call starts
wait_for({
  condition: { type: "file_contains", path: "/tmp/deploy.log", pattern: "pod/ready", mustBeNew: true },
})
```

A condition timeout is still a normal result: the text starts with `[wait_for] timed out`, and `metadata` carries `hit: false`, `reason: "timeout"`, `attempts`, and the last `observed` state.

```text
[wait_for] timed out after 120.0s
condition: HTTP status 200: https://registry.npmjs.org/pkg/1.2.3
attempts: 61
last error: fetch failed
Next step: inspect the observed state; do not call wait_for again immediately.
observed: {"url":"https://registry.npmjs.org/pkg/1.2.3"}
```

## Parameters

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `path` | string | — | File to watch (absolute path). |
| `pattern` | string | — | Regular expression; requires `path`. Matches only the last 64 KB. |
| `pid` | number | — | Wait for this process to exit. Can be combined with `path`. |
| `timeout_ms` | number | `240000` | Maximum wait; capped at `600000`. |
| `poll_ms` | number | `500` | Poll interval; minimum `100`. Usually not needed. |
| `tail_lines` | number | `60` | Number of log lines returned. |
| `must_be_new` | boolean | `false` | Only consider content written after the call starts. |
| `condition` | object | — | Advanced file/process/port/HTTP condition. When set, `path`, `pattern`, `pid`, and `must_be_new` are ignored. See [Advanced conditions](#5-wait-for-a-file-port-or-http-condition). |

At least one of `path`, `pid`, or `condition` is required.

## A timeout is not a failure

A timeout **returns normally** instead of throwing, because "did not arrive" is information:

```text
[wait_for] timed out after 120.0s
Reason: pid 12345 is still running; log did not match /BUILD SUCCESS/
Last change: 118.3s ago
pid 12345 is still running - the task may simply be slow, not stuck
Next step: use ps / lsof to check the process; do not call wait_for again immediately.
```

The result deliberately separates two signals:

- `idle_ms` (time since the last change) - distinguishes "slow task" from "stuck task".
- `pidAlive` - if the process is alive, waiting longer may be worthwhile; if it is gone, the task really failed.

## Design trade-offs

**Why polling instead of inotify/fs.watch?** Log files are usually written through shell redirection, and `fs.watch` behaves inconsistently across platforms, NFS, and container mounts (missed events, duplicate events, broken `rename` handling). At build-log scale the cost of `stat` is negligible - polling an 11 MB file for three seconds was not measurable. Stability wins.

**Why read only the last 64 KB?** Maven/Gradle logs are often tens of megabytes. The plugin uses `open` plus an offset read instead of `readFile`, so it never pulls the whole file into memory. The same `must_be_new` check reads only the new range.

**Why not throw on timeout?** Throwing makes the model likely to retry, while the correct action is to inspect the process state. Putting diagnostics in the result lets the model make the right call.

**Why report progress only once per second?** Calling `context.progress` too often floods the UI, but reporting nothing gives a blank-screen experience. One second is an upper bound that does not interfere with reading.

## How it differs from other OpenCode plugins

`wait_for` does one thing: **wait**. It does not start processes and does not take over built-in tools. Start work with the shell's `background: true`; wait for it with `wait_for`.

The most easily confused projects (data from 2026-11):

| Project | ★ | Purpose | Relationship |
| --- | --- | --- | --- |
| **shekohex/opencode-pty** | 607 | Interactive PTY management (spawn/write/read/kill) | Overlapping features, different goal; see below |
| A8Cl233395/opencode-background-jobs | 1 | Replaces built-in `shell`; timeouts become background jobs | Closest idea, but takes over the `shell` tool |
| zeigarnick/opencode-background-task | 3 | Runs **agent tasks** in the background | Unrelated; manages subagents, not processes |
| PrismKitty/opencode-background-tasks | 1 | Sidebar display for running shells/subagents | Unrelated; UI only |

### vs opencode-pty

It is the most mature project in this space, but it solves a **different layer**:

| Dimension | opencode-wait-for-v2 | opencode-pty |
| --- | --- | --- |
| Core model | Block until a condition holds | Run in background and read on demand |
| Tools | 1 (`wait_for`) | 5 (`pty_spawn` / `pty_write` / `pty_read` / `pty_list` / `pty_kill`) |
| Start a process | No; use built-in `shell` | Yes, native `pty_spawn` |
| Send input | No | Yes, including Ctrl+C and arrow keys |
| Wait for completion | `wait_for(path, pattern)` in one call | `pty_spawn(notifyOnExit: true)` and wait for notification |
| Timeout | Normal return + process state + log tail | `timeoutSeconds` **kills the process** |
| Interrupt (ESC) | Yes, `AbortSignal` | Depends on the SDK |
| Progress | Yes, `context.progress` | No |
| Large logs | Reads last 64 KB; 3 ms on 11 MB | Full ring buffer (50k-line cap) |
| Resident memory | Nearly zero (no buffer) | 50k-line buffer per session |
| Dependencies | Zero (Node built-in `fs`) | `bun-pty` native module |
| Extra components | None | Web UI + TUI sidebar + REST API + WebSocket |
| Permission limits | None | An `ask` rule is treated as `deny` |
| Size | 12.5 KB, one file | Full frontend/backend project |

**Which one to use:**

| Need | Recommendation |
| --- | --- |
| Wait for `mvnd install` to finish | **wait_for** |
| Wait for a service port to be ready | **wait_for** |
| Start `npm run dev` and keep the dev server alive | opencode-pty |
| Interactive REPL / database CLI | opencode-pty |
| Let the agent send Ctrl+C to a process | opencode-pty |

They **can be installed together** without conflict: let pty own the dev server and wait_for own builds.

### vs opencode-background-jobs

Conceptually it is the closest project - both agree that a conversation should not block on a long command. The differences:

- It **replaces the built-in `shell` tool** (`timeout: 0` moves work to the background; a timeout becomes a job instead of killing the process), which is more invasive.
- It needs `job_list` / `job_read` / `job_kill` together, so the call chain is longer.
- `wait_for` does not modify any built-in tool; it only **adds** one tool that can be removed at any time.

If you already use its `job_read({ timeout })` blocking wait, that overlaps with `wait_for`; pick one.

## Compatibility

Developed and verified on OpenCode **v2.2.5**. It relies on `@opencode/plugin`'s `ctx.tool.transform` and the `ctx.tool` `execute(input, context)` contract, where `context.signal` is used for interruption and `context.progress` for progress reporting.

The tool declares `options: { codemode: true }`, so it is also available in Code Mode as `tools.wait_for(...)`.

## Development

```bash
bun test          # 30 cases
bun build index.ts --target=node --outfile=/tmp/check.js   # build check
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the project layout, coding conventions, and the release flow.

## Contributors

Thanks to the people who made this project better:

- [@masterjg](https://github.com/masterjg) (Marius Guščius) — the unified `condition` API for `wait_for` ([#1](https://github.com/lcssos/opencode-wait-for-v2/pull/1)) and the English translation of the project ([#2](https://github.com/lcssos/opencode-wait-for-v2/pull/2)).

Contributions of any size are welcome — bug reports, condition types, docs, and translations included.

## License

MIT
