# opencode-ssh

SSH access plugin for OpenCode — secure remote command execution with command blocking and audit.

## Features

- 🔐 **SSH Session Management** — Connect to multiple remote servers simultaneously
- ⚡ **Real-time Command Execution** — Execute commands with live output streaming
- 🛡️ **Security-First Design** — Destructive commands blocked 100%, risky commands require approval every time
- 📋 **Full Audit Trail** — Every command is logged with timestamps, results, and details
- 🔒 **Three Security Modes** — Full, Restricted, or Read-Only
- 📤 **File Transfer** — Upload and download files via SCP/SFTP
- 🎯 **Command Safety Checker** — Preview command safety before execution
- ⚙️ **Configurable Policies** — Add custom blocklist/allowlist patterns
- 🛤️ **Proxy Support** — `ProxyJump` and `ProxyCommand` from your ssh config
- 🛡️ **Host Key Verification** — optional `strict_host_key` MITM protection via `known_hosts`
- ⏳ **Rate Limiting** — per-host command rate limit and cooldown
- 🔁 **Auto-Reconnect** — dropped sessions reconnect automatically on the next command
- 🔐 **Credential Hygiene** — passwords are cleared from memory after a successful handshake

## Installation

Add to your `opencode.json`:

```json
{
  "plugin": ["@judaharagao/opencode-ssh"]
}
```

Or with configuration:

```json
{
  "plugin": [
    ["@judaharagao/opencode-ssh", {
      "mode": "full",
      "max_sessions": 5,
      "default_timeout": 30,
      "audit_enabled": true
    }]
  ]
}
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `mode` | `"full"` \| `"restricted"` \| `"read_only"` | `"full"` | Security mode for command execution |
| `max_sessions` | number | `5` | Maximum concurrent SSH sessions |
| `default_timeout` | number | `30` | Default command timeout in seconds |
| `audit_enabled` | boolean | `true` | Enable audit logging |
| `blocklist_extra` | string[] | `[]` | Additional regex patterns to block |
| `allowlist` | string[] | `[]` | Additional allowed patterns (restricted/read_only mode) — merged with the per-project allowlist from `ssh.security_policy` |
| `ssh_config_path` | string | `~/.ssh/config` | Path to the SSH config file used to resolve host aliases, defaults, proxies, and auto-connect targets |
| `auto_connect` | boolean | `false` | Connect automatically at startup to every `Host` entry in the ssh config that has a `HostName` (with retry/backoff) |
| `auto_reconnect` | boolean | `true` | Reconnect a dropped session automatically before the next `ssh.exec`/`ssh.upload`/`ssh.download` (key-authenticated sessions) |
| `strict_host_key` | boolean | `false` | Reject connections whose host key is not an exact match in `~/.ssh/known_hosts` (MITM protection) |
| `rate_limit_per_minute` | number | `120` | Max commands allowed per host per minute |
| `cooldown_seconds` | number | `0` | Minimum delay (seconds) between commands on the same host |

## SSH Config Integration

The plugin can reuse your existing `~/.ssh/config` (or a custom path via `ssh_config_path`):

- **Host resolution** — `ssh.connect(host="myalias")` resolves the alias to its `HostName`, and automatically applies the `User`, `Port` and `IdentityFile` from the config. `username`, `port` and `auth_method`/`key_path` become optional when configured.
- **ProxyJump / ProxyCommand** — `ProxyJump` and `ProxyCommand` directives in the ssh config are honored, so connections route through bastion/jump hosts transparently.
- **Auto-connect** — with `"auto_connect": true`, the plugin connects at startup to every `Host` entry that has a `HostName`, using the configured key (or `~/.ssh/id_rsa`). Unreachable hosts are retried with backoff and skipped without blocking startup.
- **Missing file alert** — if `ssh_config_path` points to a file that does not exist, the plugin warns on connect instead of silently ignoring the setting.

Example ssh config:

```
Host prod-web
    HostName 10.0.0.10
    User deploy
    Port 2222
    IdentityFile ~/.ssh/prod_key

Host prod-db
    HostName 10.0.0.50
    ProxyJump jumpuser@bastion:2200
```

With `ssh.connect(host="prod-web")` the plugin connects to `deploy@10.0.0.10:2222` using `~/.ssh/prod_key`. `prod-db` is reached tunneled through `bastion`.

## Security Modes

### Full Mode
All commands are allowed except those in the blocklist. Destructive commands are always blocked. Risky commands require approval.

### Restricted Mode
Only commands in the allowlist + read-only commands are allowed. Risky and destructive commands are blocked.

### Read-Only Mode
Only read-only commands (ls, cat, grep, docker ps, etc.) are allowed. No write operations.

## Custom Allowlist

Restricted and read-only modes respect allowlist patterns from **both** sources (merged, deduped):

1. **Plugin config** — in your `opencode.json`:

   ```json
   ["@judaharagao/opencode-ssh", {
     "mode": "restricted",
     "allowlist": ["docker stop .*", "docker rm .*"]
   }]
   ```

2. **Per-project policy** — at runtime via `ssh.security_policy`:

   ```
   ssh.security_policy(action="add_allowlist", pattern="docker stop .*")
   ```

   Patterns persist in `<project>/.opencode-ssh/policy.json` and are merged with the config patterns on every execution. Either source alone is enough to permit a matching command in restricted/read_only mode. The destructive blocklist always wins over any allowlist entry.

## Commands (Tools)

### `ssh.connect`
Establish an SSH connection to a remote server.

```
ssh.connect(host="192.168.1.100", username="admin", auth_method="key")
```

### `ssh.disconnect`
Close an SSH session.

```
ssh.disconnect(session_id="ssh-abc123")
```

### `ssh.list_sessions`
List all active SSH sessions.

```
ssh.list_sessions()
```

### `ssh.exec`
Execute a command on a remote server.

```
ssh.exec(session_id="prod-server", command="docker ps -a")
```

### `ssh.exec_batch`
Execute multiple commands in sequence.

```
ssh.exec_batch(session_id="prod-server", commands="cd /app\nls -la\ndocker ps")
```

### `ssh.upload`
Upload a file via SCP.

```
ssh.upload(session_id="prod-server", local_path="./config.yml", remote_path="/app/config.yml")
```

### `ssh.download`
Download a file via SCP.

```
ssh.download(session_id="prod-server", remote_path="/var/log/app.log", local_path="./app.log")
```

### `ssh.check_command`
Check if a command is safe (dry-run).

```
ssh.check_command(command="rm -rf /tmp/cache")
```

### `ssh.security_policy`
View or modify the security policy.

```
ssh.security_policy(action="view")
ssh.security_policy(action="add_blocklist", pattern="custom-dangerous-.*")
ssh.security_policy(action="add_allowlist", pattern="docker stop .*")
ssh.security_policy(action="remove_allowlist", pattern="docker stop .*")
```

### `ssh.audit_log`
View the command audit trail.

```
ssh.audit_log(limit=20)
ssh.audit_log(session_id="prod-server", command_filter="docker")
```

## Security

### Host Key Verification
With `"strict_host_key": true` the plugin verifies the remote server's host key against `~/.ssh/known_hosts` before completing the handshake:
- a **matching** key → connection allowed;
- a **changed** key (possible MITM) → connection refused;
- an **unknown** host → connection refused (add the host key to `known_hosts` first, e.g. via `ssh-keyscan host >> ~/.ssh/known_hosts`).

### Destructive Commands (100% Blocked)
These commands are **permanently blocked** with no exceptions:

- `rm -rf /`, `rm -rf ~`, `rm -rf .*`
- `mkfs`, `dd if=/dev/zero`
- Fork bombs (`:(){:|:&};:`)
- `chmod -R 777 /`, `chmod -R 000 /`
- `shutdown`, `reboot`, `init 0/6`
- `kill -9 1`, `killall`
- `iptables -F`, `ufw disable`
- `wget/curl | sh|bash`

### Risky Commands (Approval Required Every Time)
These commands require your explicit approval each time:

- `DROP TABLE`, `DELETE FROM`, `TRUNCATE`
- `sudo su`, `sudo -i`
- `systemctl stop/disable`
- `kill -9`, `kill -15`
- `npm uninstall -g`, `apt remove/purge`
- `userdel`, `groupdel`
- `iptables -A/-D`

### Credential Safety
- Passwords and SSH keys are **never** stored in logs or output
- Session info only contains host, username, and port
- Passwords are cleared from memory right after a successful handshake
- For this reason password-authenticated sessions do **not** auto-reconnect (re-issue `ssh.connect`); key-authenticated sessions reconnect automatically from the on-disk key
- All sessions are destroyed when the plugin is disposed

## Audit Log

All commands are logged in `.opencode-ssh/audit.jsonl` with:

- Timestamp
- Session ID (host@user)
- Command executed
- Result (success/blocked/approved/error)
- Exit code
- Duration
- Matched security rule (if any)

View the audit log with `ssh.audit_log`.

## License

MIT
