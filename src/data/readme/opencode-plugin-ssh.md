# opencode-plugin-ssh

OpenCode plugin for persistent SSH connections, interactive PTY shells, SFTP file operations, and remote background job management.

## Features

- **Persistent SSH Sessions**: Reuses open connections in memory without repeating handshakes.
- **PTY Shell & Multiplexed Exec**: Run single discrete commands or maintain state across commands in a persistent shell.
- **SFTP File Management**: Read, write, and perform targeted search-and-replace edits on remote files.
- **Pager Guard**: Automatically sets `TERM=dumb`, `PAGER=cat`, and `CI=1` to prevent interactive hangs.
- **Key & Passphrase Support**: Reads private keys from disk or options, supporting passphrases and environment variables.
- **Detached Background Jobs**: Spawn, inspect, fetch logs, and terminate long-running remote processes.
- **Cluster Broadcast**: Execute commands across multiple active sessions concurrently.
- **System Diagnostics**: Single-call probe gathering OS, hardware, runtime, and network info.

## Installation

Add to your OpenCode configuration (`opencode.json` or `~/.config/opencode/opencode.jsonc`):

```jsonc
{
  "plugin": [
    "opencode-plugin-ssh"
  ]
}
```

Or install as a dependency:

```bash
npm install -D opencode-plugin-ssh
```

You can also install directly from GitHub:

```jsonc
{
  "plugin": [
    "git+https://github.com/maik205/opencode-ssh.git"
  ]
}
```

## Tools

All tools are registered under the `ssh` namespace:

### Sessions & Connections
- `ssh_list_profiles`: List profiles from `~/.ssh/config` and saved configurations.
- `ssh_save_profile`: Store host connection parameters for quick reuse.
- `ssh_connect`: Open or verify an active SSH session.
- `ssh_list_sessions`: List connected sessions and their active status.
- `ssh_switch_session`: Change the default active session.
- `ssh_close`: Disconnect and clean up a session.
- `ssh_broadcast`: Run a command across multiple connected sessions.

### Execution & PTY
- `ssh_exec`: Run a non-interactive command and return stdout, stderr, exit code, and `executedAs`.
- `ssh_interactive_cmd`: Execute commands inside a persistent PTY shell (returns output and `executedAs`).
- `ssh_switch_user`: Switch user (e.g. to `root`) in the persistent shell via `sudo`/`su` with automatic password handling.
- `ssh_pty_send`: Send raw text or control characters (e.g. `\x03`) to the PTY.
- `ssh_pty_read`: Retrieve recent buffer output from the PTY shell.

### Filesystem (SFTP)
- `ssh_read_file`: Read remote files with pagination and line numbering.
- `ssh_write_file`: Write or overwrite remote files over SFTP.
- `ssh_edit_file`: Find and replace exact substrings within remote files.

### Background Jobs & Health
- `ssh_system_inspect`: Inspect system metrics, listening ports, and installed runtimes.
- `ssh_job_spawn`: Start a supervised background job.
- `ssh_job_status`: Check status and exit code of a spawned job.
- `ssh_job_logs`: Fetch stdout and stderr output from a background job.
- `ssh_job_kill`: Terminate a background job with a specified signal.

## License

[MIT](LICENSE)
