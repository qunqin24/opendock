# opencode-keep-awake

Server plugin for [opencode](https://opencode.ai) that prevents your Linux PC
from going to sleep while a prompt is running.

While any session is generating (including subagent sessions), the plugin
holds a `systemd-inhibit` lock (`idle:sleep`, block mode). When all sessions
go idle, the lock is released after a short grace period.

## Install

Add to `~/.config/opencode/opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-keep-awake"]
}
```

## Options

Pass a `[name, options]` tuple:

```json
[
  "opencode-keep-awake",
  { "what": "idle:sleep", "graceMs": 15000, "holdCapMs": 2700000 }
]
```

| Option | Default | Description |
| --- | --- | --- |
| `what` | `"idle:sleep"` | What to inhibit — `sleep` also blocks manual suspend |
| `graceMs` | `15000` | Keep the lock this long after the last busy session goes idle |
| `holdCapMs` | `2700000` (45 min) | Hard cap on a single inhibitor process |

## Crash safety

- The inhibitor is a `systemd-inhibit … sleep <cap>` child, so even if
  opencode crashes, suspend is blocked for at most `holdCapMs`.
- While sessions stay busy, the inhibitor is renewed before the cap expires.
- On startup, inhibitors left by dead opencode processes (matched by PID) are
  cleaned up; inhibitors of *other live* opencode instances are untouched.

## Requirements

- Linux with systemd/logind (`/run/systemd/system` present); the plugin
  disables itself with a warning otherwise.
- Verify at runtime with `systemd-inhibit --list` while a prompt is running.

## License

MIT
