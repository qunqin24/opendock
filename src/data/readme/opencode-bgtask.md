# opencode-bgtask

Run shell commands in the background without blocking your OpenCode AI session. Full job lifecycle management: start, list, view output, stop.

> [中文文档](README.zh.md)

## Install

### Via npm (Recommended)

Add to your `opencode.json`:

```json
{
  "plugin": ["opencode-bgtask"]
}
```

Restart OpenCode. The npm package is installed automatically.

### Local Install

Place `index.ts` in the `.opencode/plugins/` directory and restart OpenCode.

## Tools

### bg_start

Start a background command.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `command` | string | Yes | The shell command to execute |
| `shell` | string | No | Shell to use: pwsh, powershell, cmd, bash, sh, zsh. Auto-detected if not specified |
| `cwd` | string | No | Working directory, defaults to project root |
| `timeout` | number | No | Timeout in seconds after which the job is killed |

### bg_list

List all background jobs with their status (running / completed / failed / killed / timeout).

### bg_output

View a job's output.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | The job ID |
| `lines` | number | No | Number of recent lines to return, default 50, max 500 |

### bg_stop

Stop a running job.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | The job ID to stop |

## Supported Shells

| Shell | Windows | Linux/macOS |
|-------|---------|-------------|
| pwsh (PowerShell 7+) | ✅ Default | — |
| powershell (Windows PowerShell 5.1) | ✅ Fallback | — |
| cmd | ✅ Fallback | — |
| bash | ✅ (Git Bash) | ✅ Default |
| sh | — | ✅ Fallback |
| zsh | — | ✅ |

## Limits

- Max concurrent jobs: 20
- Log file max size: 50MB (truncated from head)
- History retention: 100 most recent records
- Output stored in `~/opencode/bg/` (outside project directory)

## License

MIT
