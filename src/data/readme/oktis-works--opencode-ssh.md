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

Requires **OpenCode v2** and `@opencode/plugin` `^2.0.18`.

### Option 1: Via OpenCode CLI (recommended)

```bash
opencode plugin add @oktis-works/opencode-ssh
```

This installs the plugin automatically in your OpenCode.

### Option 2: Via npm

```bash
npm install -g @oktis-works/opencode-ssh
```

Then add to your `opencode.json`:

```json
{
  "plugins": ["@oktis-works/opencode-ssh"]
}
```

Or with configuration:

```json
{
  "plugins": [
    {
      "package": "@oktis-works/opencode-ssh",
      "options": {
        "mode": "full",
        "max_sessions": 5,
        "default_timeout": 30,
        "audit_enabled": true
      }
    }
  ]
}
```

> **Migrating from v1 of this plugin?** The v2 major version changes the
> entrypoint shape and the permission model. See
> [Migrating to v2.0.0](#migrating-to-v200).

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `mode` | `"full"` \| `"restricted"` \| `"read_only"` | `"full"` | Security mode for command execution |
| `max_sessions` | number | `5` | Maximum concurrent SSH sessions |
| `default_timeout` | number | `30` | Default command timeout in seconds |
| `audit_enabled` | boolean | `true` | Enable audit logging |
| `blocklist_extra` | string[] | `[]` | Additional regex patterns to block |
| `allowlist` | string[] | `[]` | Additional allowed patterns (restricted/read_only mode) — merged with the per-project allowlist from `ssh_security_policy` |
| `ssh_config_path` | string | `~/.ssh/config` | Path to the SSH config file used to resolve host aliases, defaults, proxies, and auto-connect targets |
| `auto_connect` | boolean | `false` | Connect automatically at startup to every `Host` entry in the ssh config that has a `HostName` (with retry/backoff) |
| `auto_reconnect` | boolean | `true` | Reconnect a dropped session automatically before the next `ssh_exec`/`ssh_upload`/`ssh_download` (key-authenticated sessions) |
| `strict_host_key` | boolean | `false` | Reject connections whose host key is not an exact match in `~/.ssh/known_hosts` (MITM protection) |
| `rate_limit_per_minute` | number | `120` | Max commands allowed per host per minute |
| `cooldown_seconds` | number | `0` | Minimum delay (seconds) between commands on the same host |

## SSH Config Integration

The plugin can reuse your existing `~/.ssh/config` (or a custom path via `ssh_config_path`):

- **Host resolution** — `ssh_connect(host="myalias")` resolves the alias to its `HostName`, and automatically applies the `User`, `Port` and `IdentityFile` from the config. `username`, `port` and `auth_method`/`key_path` become optional when configured.
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

With `ssh_connect(host="prod-web")` the plugin connects to `deploy@10.0.0.10:2222` using `~/.ssh/prod_key`. `prod-db` is reached tunneled through `bastion`.

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
   ["@oktis-works/opencode-ssh", {
     "mode": "restricted",
     "allowlist": ["docker stop .*", "docker rm .*"]
   }]
   ```

2. **Per-project policy** — at runtime via `ssh_security_policy_modify`:

   ```
   ssh_security_policy_modify(action="add_allowlist", pattern="docker stop .*")
   ```

   Patterns persist in `<project>/.opencode-ssh/policy.json` and are merged with the config patterns on every execution. Either source alone is enough to permit a matching command in restricted/read_only mode. The destructive blocklist always wins over any allowlist entry.

## Tool Names (Namespace Normalization)

The plugin registers all tools through the official OpenCode v2 namespace
mechanism: `editor.namespace({ name: "ssh", … })` plus a short leaf name per
tool. The host derives each tool's **effective id** by joining the namespace
and the leaf with `_` — dots in namespaces and provider-unsupported characters
normalize to `_` automatically (see the
[plugin docs](https://opencode.ai/v2/docs/build/plugins/), Tools section).

The effective ids are therefore:

`ssh_connect`, `ssh_disconnect`, `ssh_list_sessions`, `ssh_exec`,
`ssh_exec_batch`, `ssh_upload`, `ssh_download`, `ssh_check_command`,
`ssh_security_policy`, `ssh_security_policy_modify`, `ssh_audit_log`

These are the names every provider sees (tool names are always
provider-safe — no `.`), the ids the permission hook evaluates, and the
spellings used throughout this README. Every hook, permission decision, and
public string in the plugin **automatically accepts both spellings** — the
effective id (`ssh_exec`) and the dotted canonical form (`ssh.exec`) decide
identically — so either form can be used interchangeably.

## Commands (Tools)

### `ssh_connect`
Establish an SSH connection to a remote server.

```
ssh_connect(host="192.168.1.100", username="admin", auth_method="key")
```

### `ssh_disconnect`
Close an SSH session.

```
ssh_disconnect(session_id="ssh-abc123")
```

### `ssh_list_sessions`
List all active SSH sessions.

```
ssh_list_sessions()
```

### `ssh_exec`
Execute a command on a remote server.

```
ssh_exec(session_id="prod-server", command="docker ps -a")
```

### `ssh_exec_batch`
Execute multiple commands in sequence.

```
ssh_exec_batch(session_id="prod-server", commands="cd /app\nls -la\ndocker ps")
```

### `ssh_upload`
Upload a file via SCP.

```
ssh_upload(session_id="prod-server", local_path="./config.yml", remote_path="/app/config.yml")
```

### `ssh_download`
Download a file via SCP.

```
ssh_download(session_id="prod-server", remote_path="/var/log/app.log", local_path="./app.log")
```

### `ssh_check_command`
Check if a command is safe (dry-run).

```
ssh_check_command(command="rm -rf /tmp/cache")
```

### `ssh_security_policy`
View the active security policy (read-only).

```
ssh_security_policy()
```

### `ssh_security_policy_modify`
Modify the security policy at runtime.

```
ssh_security_policy_modify(action="add_blocklist", pattern="custom-dangerous-.*")
ssh_security_policy_modify(action="remove_blocklist", pattern="custom-dangerous-.*")
ssh_security_policy_modify(action="add_allowlist", pattern="docker stop .*")
ssh_security_policy_modify(action="remove_allowlist", pattern="docker stop .*")
```

> **User confirmation required:** `ssh_security_policy` is read-only and does
> not prompt. Every call to `ssh_security_policy_modify` triggers opencode's
> permission prompt and is re-confirmed by the user **every single time** — the
> LLM can never self-grant an allowlist entry without explicit user approval.
> That is why policy mutation lives in its own tool rather than being an
> `action` on the read tool.

### `ssh_audit_log`
View the command audit trail.

```
ssh_audit_log(limit=20)
ssh_audit_log(session_id="prod-server", command_filter="docker")
```

## Migrating to v2.0.0

v2.0.0 migrates the plugin to the OpenCode v2 plugin SDK (`@opencode/plugin`).
Three things changed that affect existing setups.

### 1. Entry point and configuration

The v1 SDK exported a `server` function and took its config from the second
element of a tuple in the `plugin` array. v2 uses `Plugin.define({ setup })`
and the `plugins` array with an object.

```diff
- { "plugin": [["@oktis-works/opencode-ssh", { "mode": "full" }]] }
+ { "plugins": [{ "package": "@oktis-works/opencode-ssh", "options": { "mode": "full" } }] }
```

The `./server` export was removed, and the peer dependency is now
`@opencode/plugin@^2.0.18`.

### 2. Tool names are effective ids (`ssh_*`)

The OpenAI-compatible `tool-names` mode (`OPENCODE_SAFE_TOOL_NAMES`,
`/sdd tool-names`, `.opencode/tool-names.json`) has been **removed** from this
plugin — it is no longer needed: the v2 host normalizes namespace-qualified
names automatically. Tools are registered under the `ssh` namespace with short
leaf names, and the effective ids (`ssh.exec` → `ssh_exec`, `ssh.exec_batch` →
`ssh_exec_batch`, …) are provider-safe by construction. There is no dotted
tool name at the provider boundary.

### 3. `ssh.security_policy` is split in two

`ssh.security_policy` no longer takes an `action`. Reading the policy and
mutating it are separate tools:

| Operation | v1 | v2 |
|---|---|---|
| View policy | `ssh.security_policy(action="view")` | `ssh_security_policy()` |
| Mutate policy | `ssh.security_policy(action="add_allowlist", pattern=…)` | `ssh_security_policy_modify(action="add_allowlist", pattern=…)` |

The same `action` values are otherwise unchanged, and persisted patterns still
live in `<project>/.opencode-ssh/policy.json`.

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
- For this reason password-authenticated sessions do **not** auto-reconnect (re-issue `ssh_connect`); key-authenticated sessions reconnect automatically from the on-disk key
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

View the audit log with `ssh_audit_log`.

## Development

### Versioning

`package.json` is the single source of truth for the plugin version. It is
propagated automatically by `scripts/sync-version.cjs` to:

- `src/version.ts` — `PLUGIN_VERSION` (between `GENERATED` markers)
- `marketplace.json` — `version`

Bump the version in `package.json`, then run `bun run version:sync` (or just
`bun run build`, which runs the sync first).

## License

MIT
