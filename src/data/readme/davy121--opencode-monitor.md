# @davy121/opencode-monitor

Monitor tool for OpenCode v2: watch a background command and wake the agent with a notification on each matching line.

The command runs in a cheap shell process and costs no turns or tokens while nothing happens. When it prints a line that
matters, the agent receives a synthetic notice — not a user message — that wakes an idle session or arrives before the
next model call. The design is in [docs/especificacao.md](docs/especificacao.md); the architecture in
[docs/architecture.md](docs/architecture.md) and the project rules in [AGENTS.md](AGENTS.md).

Requires OpenCode v2.4.1 or later, on macOS, Linux or Windows.

## Install

```sh
opencode plugin add @davy121/opencode-monitor
```

## Tools

| Tool | What it does |
| --- | --- |
| `monitor_start` | Starts a command in the background and returns its summary at once. Each stdout line is an event. |
| `monitor_list` | Lists the running monitors of the session and the last 20 finished ones. |
| `monitor_fetch` | Returns the pending lines (and, with `stderr_lines`, the end of the stderr file) as the tool result, without a notice. |
| `monitor_stop` | Stops a monitor: SIGTERM to its process group, SIGKILL after 3 seconds. Sends no notice. |

### `monitor_start`

| Field | Default | Meaning |
| --- | --- | --- |
| `command` | required | Shell command; each stdout line is an event. |
| `description` | required | Short label shown on each notice, as `monitor: <description>`. |
| `pattern` | every line | JavaScript regular expression; only matching lines wake the agent. |
| `delivery` | `wake` | `wake`: before the next model call, waking an idle session. `queue`: after the current work. `silent`: waits in the inbox until the session runs. `manual`: no notices, read with `monitor_fetch`. |
| `timeout_ms` | 300000 | Lifetime; the monitor then stops with a final notice. |
| `persistent` | `false` | Lasts until `monitor_stop` or the end of the session; `timeout_ms` is ignored. |
| `capture_stderr` | `false` | Also turns stderr lines into events, prefixed `stderr: `. |
| `cwd` | session directory | Working directory, absolute or relative to the session directory. |
| `env` | — | Extra environment variables. |

Lines arriving within 200 ms are grouped into one notice, and a notice never waits more than 1 second. Every monitor
ends with one final notice (`exited`, `expired` or `flooded`), except when stopped with `monitor_stop`.

```js
monitor_start({
  command: "tail -f app.log | grep --line-buffered -E 'READY|ERROR|Traceback'",
  description: "errors in app.log",
  pattern: "READY|ERROR|Traceback",
})
```

On Windows the command runs in PowerShell 7 (`pwsh.exe`), or Windows PowerShell when PowerShell 7 is missing:

```js
monitor_start({
  command: "Get-Content -Wait app.log | Select-String -Pattern 'READY|ERROR'",
  description: "errors in app.log",
})
```

Use `grep --line-buffered` in pipes, otherwise lines are delayed or never arrive, and match both the success and the
failure states, otherwise a failure passes silently.

## Safety

- `monitor_start` asks for the `shell` permission before running anything, so your `allow`, `ask` and `deny` rules and
  saved approvals apply. Compound commands are split, and every subcommand is checked: a deny rule for `rm *` also
  blocks `echo ok; rm -rf x` and `echo "$(rm -rf x)"`. Commands that cannot be analyzed (heredocs, `eval`, `sh -c`;
  on Windows also script blocks, `Invoke-Expression`, `Start-Process` and `pwsh -Command`) also need
  `external_directory` for `*`. A `cwd` outside the project asks for `external_directory`.
- Output is untrusted: notices escape XML, strip terminal codes and control characters, redact obvious secrets
  (`sk-…`, `ghp_…`, `AKIA…`, `Bearer …`) and are marked `untrusted="true"`.
- Processes run in their own process group (on Windows, their process tree) and are stopped as a group. Before signalling, the plugin checks that the
  group leader is still the process it started. Nothing is left running after `monitor_stop`, the end of the monitor,
  the deletion of the session or the unloading of the plugin.
- stderr goes to `<tmp>/opencode-monitor/<session>/<monitor>.stderr.log`, rotated at 5 MB, removed with the session and
  pruned after 7 days.

## Options

Every limit can be changed in the plugin entry of `opencode.json(c)`:

```jsonc
{
  "plugins": [
    {
      "package": "@davy121/opencode-monitor",
      "options": { "maxMonitorsPerSession": 5, "debug": true },
    },
  ],
}
```

| Option | Default |
| --- | --- |
| `maxMonitorsPerSession` | 10 |
| `lineMaxBytes` | 4096 (minimum 16) |
| `batchMaxLines` | 50 |
| `pendingMaxLines` | 1000 |
| `floodLinesPerSecond` / `floodSeconds` | 100 lines per second for 5 seconds |
| `stderrMaxBytes` | 5242880 |
| `retentionDays` | 7 |
| `debug` | `false`; also enabled by `OPENCODE_MONITOR_DEBUG=1`. Writes `<tmp>/opencode-monitor/debug.log`. |

Invalid values and unknown keys stop the plugin from loading, with a message naming the key.

## Development

```sh
npm ci
npm run validate
```

`validate` runs Biome, the type checker and the Vitest suite, which starts real processes.

## Releases

Every push to `main` runs the checks, then the release workflow computes the next version from the
[Conventional Commits](https://www.conventionalcommits.org/) since the last tag with
[git-cliff](https://git-cliff.org), updates `package.json` and `CHANGELOG.md`, publishes to npm, pushes the tag and
creates the GitHub release. `feat` bumps the minor and `fix`/`perf` bump the patch; other types do not release.
