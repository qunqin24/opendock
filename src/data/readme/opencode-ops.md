# opencode-ops

All-in-one [OpenCode](https://opencode.ai) operations plugin — SSH sessions, local terminals, GitHub Actions, and a web dashboard in a single plugin.

## Overview

`opencode-ops` is an OpenCode operations plugin combining SSH session management, local terminal emulation, GitHub Actions/secrets management, and a web dashboard. Inspired by [opencode-ssh-session](https://github.com/PedroKlein/opencode-ssh-session).

## Features

### SSH Sessions
- **Multiple concurrent sessions** — connect to several hosts simultaneously
- **`.ssh/config` integration** — list and use hosts from your SSH config; session IDs prefer config aliases over raw IPs
- **Auto-reconnect** — dead sessions for the same host are auto-flushed before connecting, preventing `_1`, `_2`, `_3` ID proliferation
- **Session flush & reconnect** — manually flush dead sessions or reconnect a dead session while keeping its ID
- **Heartbeat monitoring** — automatic health checks with reconnection logic
- **File transfer** — upload/download files via base64 over existing connections
- **Remote file editing** — read, write, append, and edit files on remote hosts (chunked reads for large files)
- **Interactive input** — send passwords and confirmations to SSH prompts
- **Password authentication** — hosts without a key are prompted via an interactive ASKPASS flow in the web dashboard
- **Smart session resolution** — auto-selects session when only one exists

### Local Terminals
- **Local command execution** — spawn bash sessions on the host machine
- **Pattern watching** — auto-detect errors, ready states, warnings
- **Ring buffer** — capped output buffer (50k lines default) to prevent memory growth
- **Background sessions** — long-running processes with notifications on exit
- **Interactive stdin** — send input directly to running processes

### GitHub Integration
- **Repository info** — visibility, default branch, language, topics
- **File browsing** — read files with pagination, search, and line-level context; list directories
- **Environments** — list repository environments (production, staging, etc.)
- **Variables** — CRUD for repo and environment-level Actions variables
- **Secrets** — list, set, delete repo/environment secrets (libsodium sealed box encryption)
- **Org-level** — list organization variables and secrets
- **Workflows** — list workflows, runs, jobs, steps with status icons
- **Logs** — download and read workflow run/job logs (auto-unzipped, plain-text fallback)
- **Control** — dispatch, cancel, and rerun workflows
- **Artifacts** — list and get download URLs for build artifacts
- **Per-tool tokens** — pass a GitHub PAT to any `github_*` tool; supports `$ENV_VAR` references

### Dashboard & Integration
- **Web dashboard** — `/ops-dashboard` slash command opens browser UI
- **Multi-instance dashboard** — view SSH & terminal sessions from multiple opencode instances in one dashboard
- **Session compacting** — active sessions preserved in context across conversations
- **System prompt injection** — agent always knows which sessions are active
- **Bash guard** — reminds the AI to use SSH/terminal tools instead of raw commands
- **Slash commands** — `/ops-dashboard`

## Installation

Add the plugin to your OpenCode configuration (`opencode.json`):

```json
{
  "plugin": ["opencode-ops"]
}
```

Requires `bun >= 1.1.0` and OpenCode with plugin support (`@opencode-ai/plugin >= 1.4.0`).

For GitHub tools, set the `GITHUB_TOKEN` environment variable with a valid GitHub personal access token.

## SSH Tools

| Tool | Description |
|------|-------------|
| `ssh_connect` | Open a new persistent SSH session (auto-flushes dead sessions for same host) |
| `ssh_exec` | Execute a command on an SSH session (output truncated at 500 lines / 40KB) |
| `ssh_disconnect` | Close an SSH session |
| `ssh_flush` | Remove all dead/disconnected sessions (optionally for a specific host) |
| `ssh_reconnect` | Reconnect a dead session, reusing its session ID |
| `ssh_list` | List all active SSH sessions with status |
| `ssh_info` | Get detailed info for a specific session |
| `ssh_hosts` | List hosts from `~/.ssh/config` |
| `ssh_upload` | Upload a local file to a remote host |
| `ssh_download` | Download a file from a remote host |
| `ssh_input` | Send raw input to an SSH session |
| `ssh_write_file` | Create or overwrite a file on a remote host |
| `ssh_append` | Append content to a file on a remote host |
| `ssh_read` | Read a file from a remote host (with line numbers) |
| `ssh_edit` | Edit a file on a remote host (find & replace, chunked reads for large files) |
| `ssh_dashboard` | Open the web dashboard |

### `ssh_connect`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `host` | string | yes | SSH host — prefer an alias from `~/.ssh/config` (e.g. `prod-web`). Use `ssh_hosts` to discover aliases. Only use `user@IP` if no alias exists. |
| `options` | string | no | Extra SSH flags (`-p 2222`, `-i ~/.ssh/mykey`) |
| `password` | string | no | SSH password for hosts without a key. Warning: goes through the chat context — prefer the dashboard's interactive prompt for sensitive passwords. |

Dead sessions for the same host are automatically flushed before connecting, so the base session ID is reused instead of creating `_2`, `_3`, etc. Session IDs are derived from SSH config aliases when available (e.g. `prod-web` instead of `10-0-0-5`).

### Password Authentication

Authentication is routed per host:

- **Explicit key** — the host has `IdentityFile` in `~/.ssh/config` (or `-i` in `options`): key-only auth with `BatchMode=yes`, never prompts.
- **No explicit key** — password-capable mode via an `SSH_ASKPASS` helper (OpenSSH ≥ 8.4 required on the client). Default keys (`~/.ssh/id_rsa`, etc.) and ssh-agent are still tried silently first; if they fail, ssh falls back to a password:
  - if a `password` was passed to `ssh_connect` (or entered in the dashboard's Connect dialog), it is used directly;
  - otherwise the **web dashboard opens automatically** with an interactive password prompt — type the password there and the pending `ssh_connect` call completes;
  - if no password arrives within ~2 minutes, the connection fails with a hint.

The password is kept in memory only (never written to logs, API responses, or the system prompt) so `ssh_reconnect` works without re-typing; it is cleared on disconnect and after a failed login. During the handshake it travels through a transient `0600` file inside a private `0700` directory (`~/.cache/opencode-ops/`) that is deleted immediately after connecting.

Limitation: password auth is not supported through `ProxyJump` — jump hosts still require keys/agent.

### `ssh_exec`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `command` | string | yes | Shell command to execute |
| `session_id` | string | no | Session ID (auto-resolved if only one exists) |
| `timeout` | number | no | Timeout in ms (default: 120000) |

Output is truncated at 500 lines / 40KB. For reading files, prefer `ssh_read` (supports pagination). For file transfers, use `ssh_download`/`ssh_upload`.

### `ssh_flush`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `host` | string | no | Only flush dead sessions for this host. Omit to flush all dead sessions. |

### `ssh_reconnect`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `session_id` | string | no | Session ID to reconnect. Omit if only one dead session exists. |

Shell state is lost — this creates a fresh connection, but reuses the same session ID.

### `ssh_upload` / `ssh_download`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `localPath` | string | yes | Local file path |
| `remotePath` | string | yes | Remote destination path |
| `session_id` | string | no | Session ID |

### `ssh_input`

Sends raw input directly to the SSH stdin — use `\n` for Enter key:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `input` | string | yes | Input string (add `\n` for Enter) |
| `session_id` | string | no | Session ID |

### `ssh_write_file`

Create or overwrite a file on the remote host. Content is base64-encoded before transfer. Creates parent directories automatically.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filePath` | string | yes | Absolute path on the remote host |
| `content` | string | yes | File content to write |
| `session_id` | string | no | Session ID |

### `ssh_append`

Append content to a file on the remote host. Creates the file if it doesn't exist.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filePath` | string | yes | Absolute path to the file on the remote host |
| `content` | string | yes | Content to append |
| `session_id` | string | no | Session ID |

### `ssh_read`

Read a file from the remote host with line numbers. Supports offset/limit for large files. Detects binary files and directories.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filePath` | string | yes | Absolute path to the file on the remote host |
| `offset` | number | no | Line number to start from (1-indexed, default: 1) |
| `limit` | number | no | Max lines to read (default: 2000) |
| `session_id` | string | no | Session ID |

### `ssh_edit`

Edit a file on the remote host by replacing an exact string match. The `oldString` must be unique unless `replaceAll` is true.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filePath` | string | yes | Absolute path to the file on the remote host |
| `oldString` | string | yes | The exact text to find and replace |
| `newString` | string | yes | The text to replace it with |
| `replaceAll` | boolean | no | Replace all occurrences (default: false) |
| `session_id` | string | no | Session ID |

## Terminal Tools

| Tool | Description |
|------|-------------|
| `terminal_exec` | Spawn a local bash session |
| `terminal_write` | Send input to a terminal session |
| `terminal_read` | Read output from a terminal |
| `terminal_list` | List all terminal sessions |
| `terminal_kill` | Kill a terminal session |
| `terminal_watch` | Add/configure pattern watchers |

### `terminal_exec`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `command` | string | yes | Bash command to run |
| `background` | boolean | no | Run in background (default: false) |
| `cwd` | string | no | Working directory |
| `env` | object | no | Environment variables |
| `description` | string | no | Human-readable label |
| `watchers` | array | no | Pattern watcher configs |

### Pattern Watchers

For background terminal sessions, you can configure watchers to detect specific patterns:

| Field | Type | Description |
|-------|------|-------------|
| `pattern` | string | Regex pattern to match |
| `label` | string | Watcher label (e.g. `error`, `ready`) |
| `priority` | string | `low`, `medium`, `high` |
| `cooldown` | number | Minimum ms between triggers |

Default watchers for background sessions: `error`, `ready`, `warning`, `test`.

## GitHub Tools

All GitHub tools require the `GITHUB_TOKEN` environment variable to be set.

### Repository & Files

| Tool | Description |
|------|-------------|
| `github_repo_info` | Get repository metadata (visibility, branch, language, etc.) |
| `github_file_read` | Read a file or list a directory from a GitHub repo |

### Environments

| Tool | Description |
|------|-------------|
| `github_environment_list` | List repository environments (production, staging, etc.) |

### Variables & Secrets (Repo/Environment level)

| Tool | Description |
|------|-------------|
| `github_var_list` | List repo or environment variables |
| `github_var_get` | Get a specific variable by name |
| `github_var_set` | Create or update a variable |
| `github_var_delete` | Delete a variable |
| `github_secret_list` | List secrets (names only — values are never exposed) |
| `github_secret_set` | Create or update a secret (encrypted with libsodium sealed box) |
| `github_secret_delete` | Delete a secret |

### Variables & Secrets (Organization level)

| Tool | Description |
|------|-------------|
| `github_org_var_list` | List organization-level variables |
| `github_org_secret_list` | List organization-level secrets (names only) |

### GitHub Actions / Workflows

| Tool | Description |
|------|-------------|
| `github_workflow_list` | List workflows in a repository |
| `github_workflow_runs` | List workflow runs with filters (branch, status, conclusion, event) |
| `github_workflow_run_get` | Get detailed info for a specific run |
| `github_workflow_jobs` | List jobs and steps for a workflow run |
| `github_workflow_run_logs` | Download and read logs for a workflow run |
| `github_workflow_job_logs` | Download and read logs for a specific job |
| `github_workflow_dispatch` | Trigger a `workflow_dispatch` event |
| `github_workflow_cancel` | Cancel a running workflow run |
| `github_workflow_rerun` | Re-run a workflow (all jobs or failed only) |
| `github_artifact_list` | List artifacts for a workflow run |
| `github_artifact_download` | Get a temporary download URL for an artifact |

### Common Parameters

Most GitHub tools share these parameters:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `owner` | string | yes | Repository owner (user or organization) |
| `repo` | string | yes | Repository name |
| `environment` | string | no | Environment name (for env-scoped variables/secrets) |

Workflow-specific tools also accept:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `run_id` | number | yes* | Workflow run ID |
| `job_id` | number | yes* | Job ID (from `github_workflow_jobs`) |
| `workflow_id` | string/number | yes* | Workflow ID or filename (e.g. `deploy.yml`) |
| `artifact_id` | number | yes* | Artifact ID (from `github_artifact_list`) |

\* Required for the respective tool only.

### `github_workflow_runs` Filters

| Parameter | Type | Description |
|-----------|------|-------------|
| `workflow_id` | number | Filter by workflow ID |
| `branch` | string | Filter by branch name |
| `status` | string | `queued`, `in_progress`, `completed` |
| `conclusion` | string | `success`, `failure`, `cancelled`, `skipped`, `timed_out` |
| `event` | string | `push`, `pull_request`, `workflow_dispatch`, `schedule` |
| `per_page` | number | Results per page (1-100, default 20) |
| `page` | number | Page number |

### `github_workflow_dispatch`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `owner` | string | yes | Repository owner |
| `repo` | string | yes | Repository name |
| `workflow_id` | string | yes | Workflow ID or filename |
| `ref` | string | yes | Git ref (branch, tag, or SHA) |
| `inputs` | object | no | Workflow inputs as key-value pairs |

### `github_workflow_rerun`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `owner` | string | yes | Repository owner |
| `repo` | string | yes | Repository name |
| `run_id` | number | yes | Workflow run ID to rerun |
| `failed_only` | boolean | no | Rerun only failed jobs (default: false) |

## Slash Commands

| Command | Description |
|---------|-------------|
| `/ops-dashboard` | Open web dashboard in browser |

## How It Works

### Architecture

The plugin uses three core components plus a GitHub client:

- **`SessionManager`** — manages multiple SSH child processes. Each session spawns `ssh -T` with stdin/stdout piped, uses unique markers to delimit command output, has its own mutex for sequential execution, and runs periodic heartbeat checks (echo + marker).
- **`TerminalManager`** — manages local bash processes with a ring buffer for output. Streams stdout/stderr, supports SIGINT/Ctrl+C, and auto-detects patterns via watchers.
- **`GitHubClient`** — wraps the GitHub REST API (v2022-11-28) with pagination support, log unzip, and libsodium sealed box encryption for secrets.
- **`Dashboard`** — HTTP server serving a web UI showing real-time status of all SSH and terminal sessions. Supports multi-instance aggregation — multiple opencode processes register with the primary dashboard and their sessions appear in a unified view.

### Session Output Delimiting

SSH commands use unique markers (`<<__OC_SSH_DONE__<id>>`) to delimit output, allowing the reader to isolate command results from any background output (e.g. SSH Motd, cron jobs).

### Auto-Flush & Session ID Resolution

When `ssh_connect` is called, dead sessions for the same host are automatically flushed so the base session ID is reused (no more `servername_2`, `servername_3`). Session IDs are derived from `~/.ssh/config` aliases when possible — connecting to `root@10.0.0.5` will produce session ID `prod-web` if that alias exists in your SSH config.

### Heartbeat Monitoring

Every 30 seconds, each SSH session receives an echo probe. After 3 consecutive failures, the session is marked as errored. This detects disconnected sessions without relying on process exit. Dead sessions can be flushed with `ssh_flush` or reconnected with `ssh_reconnect`.

### Secret Encryption

GitHub secrets are encrypted client-side using libsodium's sealed box via `tweetnacl` (NaCl `crypto_box`) and `@noble/hashes` (Blake2b for nonce derivation). The secret value is never sent in plaintext to the API.

### System Prompt Injection

The plugin appends active session info to the system prompt, so the AI always knows which sessions exist and how to interact with them. Session context is also preserved during conversation compaction.

### Bash Guard

A `tool.execute.before` hook detects when the AI tries to use the built-in `bash` tool for SSH-like operations (`ssh`, `scp`, `sftp`, `rsync`) and prepends a reminder to use the plugin's SSH tools instead.

## Development

```bash
bun install
bun run build       # Build to dist/
bun run typecheck   # Type-check without emitting
```

## License

MIT
