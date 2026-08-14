# opencode-sleep-inhibit

Prevent suspend and hibernation while OpenCode agents are working on Linux.

Long-running agents should not be interrupted because your laptop suspends. This plugin prevents sleep while OpenCode is busy, then restores normal power management when the work finishes.

It also covers subagents, retries, tool approvals, permissions, and questions waiting for your response.

## Install

You need Linux with systemd and OpenCode 1.18.5 or a newer 1.x release. Add the npm package to your project or global OpenCode configuration:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    [
      "opencode-sleep-inhibit",
      { "mode": "sleep", "cooldownMinutes": 0 }
    ]
  ]
}
```

OpenCode installs and caches the package automatically. No separate `npm install` is required.

## Choose a Mode

### Allow locking (recommended)

`"sleep"` prevents suspend and hibernation while still allowing your screen to turn off and lock normally.

```json
{ "mode": "sleep" }
```

### Keep the screen awake

`"sleep-and-idle"` also asks your desktop to keep the screen on and unlocked. Only use this when leaving the computer unlocked is acceptable.

```json
{ "mode": "sleep-and-idle" }
```

Support for idle inhibition depends on your desktop environment.

## Keep It Awake After Work

By default, the inhibitor is released as soon as all agent work becomes idle. Set `cooldownMinutes` to keep the laptop awake for a follow-up window:

```json
{ "mode": "sleep", "cooldownMinutes": 60 }
```

New work during the cooldown cancels the pending release. The cooldown starts again when all work becomes idle. Keep the default value of `0` to release the inhibitor immediately.

## Check It

While OpenCode is working, run:

```sh
systemd-inhibit --list
```

An `OpenCode` entry should appear while work is active and disappear when it finishes.

## Development

```sh
bun install --frozen-lockfile
bun run check
bun run test
npm pack --dry-run
```

## License

MIT
