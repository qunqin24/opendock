# opencode-plugin-ssh

Persistent interactive SSH sessions, profiles, PTY shells, SFTP/SCP file transfers, and remote background job supervision for **Claude Code**, **OpenCode**, and **MCP clients**.

Dual-compatible as an **OpenCode Plugin** and a standalone **Model Context Protocol (MCP) Server**.

---

## Features

- **Persistent SSH Sessions**: Reuses open connections in memory without repeating handshakes.
- **PTY Shell & Multiplexed Exec**: Run single discrete commands or maintain state across commands in a persistent shell.
- **SFTP & High-Speed SCP**: Read, write, targeted find-and-replace, and chunked recursive local-remote or remote-to-remote file transfers.
- **Claude Code & MCP Native**: Works out-of-the-box with Claude Code (`claude mcp add`), Cursor, Claude Desktop, and OpenCode.
- **Pager Guard**: Automatically sets `TERM=dumb`, `PAGER=cat`, and `CI=1` to prevent interactive hangs.
- **Key & Passphrase Support**: Reads private keys from disk or options, supporting passphrases and environment variables.
- **Detached Background Jobs**: Spawn, inspect, fetch logs, and terminate long-running remote processes.
- **Cluster Broadcast**: Execute commands across multiple active sessions concurrently.
- **System Diagnostics**: Single-call probe gathering OS, hardware, runtime, and network info.

---

## Usage with Claude Code

### Option 1: Quick Add via CLI (Recommended)

Run directly in your terminal:

```bash
claude mcp add ssh -- npx -y opencode-plugin-ssh
```

### Option 2: Project `.mcp.json`

Add a `.mcp.json` file in your repository root:

```json
{
  "mcpServers": {
    "ssh": {
      "command": "npx",
      "args": ["-y", "opencode-plugin-ssh"]
    }
  }
}
```

### Option 3: Claude Code Plugin & Mod (Slash Commands + Live Spinner)

Install directly into Claude Code:

```bash
claude plugin add opencode-ssh
```

Or load locally during development:

```bash
claude --plugin-dir /path/to/opencode-ssh
```

When loaded as a Claude Code plugin/mod, it automatically adds:
- **`/ssh-profiles`**: Browse configured hosts and connection parameters from `~/.ssh/config`.
- **`/ssh-status`**: View real-time active SSH tool operations and history.
- **`/ssh-help`**: Instant cheatsheet of available SSH commands and MCP tools.
- **Live Spinner Feedback**: Shows `· SSH: <operation>` on the Claude Code spinner whenever a remote SSH or SCP task is running.

---

## Usage with OpenCode

Add to your OpenCode configuration (`opencode.json` or `~/.config/opencode/opencode.jsonc`):

```jsonc
{
  "plugin": [
    "opencode-plugin-ssh"
  ]
}
```

Or install as a local dependency:

```bash
npm install -D opencode-plugin-ssh
```

---

## Usage with Claude Desktop / Cursor / Other MCP Clients

Add to your `claude_desktop_config.json` or Cursor MCP configuration:

```json
{
  "mcpServers": {
    "ssh": {
      "command": "npx",
      "args": ["-y", "opencode-plugin-ssh"]
    }
  }
}
```

---

## Tools

All tools are available across both OpenCode and MCP clients:

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

### Filesystem (SFTP & SCP)
- `ssh_scp`: Securely copy files or directories between local machine and remote host (`upload` / `download`), or stream directly between two remote sessions (`remote_to_remote`) with recursive and chunked transfer support.
- `ssh_read_file`: Read remote files with pagination and line numbering.
- `ssh_write_file`: Write or overwrite remote files over SFTP.
- `ssh_edit_file`: Find and replace exact substrings within remote files.
- `ssh_list_dir`: Structured directory listing (name, size, mode, permissions, isDirectory, isSymlink, mtime).
- `ssh_stat`: Inspect file/directory metadata or test for existence (size, permissions, timestamps, link targets).
- `ssh_mkdir`: Create remote directory with optional recursive creation of parent directories (`-p`).
- `ssh_rm`: Delete a remote file or folder with optional recursive directory removal.
- `ssh_rename`: Move or rename remote files and directories over SFTP.
- `ssh_chmod`: Change remote file/directory permissions via octal mode (e.g. `'0755'`, `'0644'`, `'0600'`).

### Background Jobs & Health
- `ssh_system_inspect`: Inspect system metrics, listening ports, and installed runtimes.
- `ssh_job_spawn`: Start a supervised background job.
- `ssh_job_status`: Check status and exit code of a spawned job.
- `ssh_job_logs`: Fetch stdout and stderr output from a background job.
- `ssh_job_kill`: Terminate a background job with a specified signal.

---

## License

[MIT](LICENSE)
