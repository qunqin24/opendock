# opencode-awaitshell

OpenCode v2 plugin that adds `await_shell`. It waits on a background `shell` command, or sleeps for a bounded time, in the same role as Cursor's AwaitShell.

Background `shell` calls return a shell id such as `sh_...`. `await_shell` polls that command until it finishes, a regular expression matches its output, or the deadline elapses. Omit the id to sleep without starting a shell.

## Install

```bash
opencode plugin add opencode-awaitshell
```

Or add the package to `plugins` in `opencode.jsonc`:

```jsonc
{
  "plugins": ["opencode-awaitshell"]
}
```

The plugin talks to the local OpenCode server recorded in the server state file (`~/.local/state/opencode/service.json`, or `$XDG_STATE_HOME/opencode/service.json`). It only connects to a loopback URL.

## Tool: `await_shell`

| Arg | Default | Description |
|---|---|---|
| `shell_id` | omitted | Background shell id (`sh_...`). Omit to sleep. |
| `block_until_ms` | `30000` | Maximum wait in milliseconds, from 0 through 7140000. `0` checks a shell once. |
| `pattern` | omitted | JavaScript regular expression. Multiline, so `^` and `$` match lines. A match ends the wait. |

A finished call reports status, exit code, pid, elapsed time, and the tail of the combined output.
