# opencode-keep-awake

An [OpenCode](https://opencode.ai) plugin that keeps your Mac awake while an agent session is working, and lets it sleep again once everything is idle.

## The problem

Long-running agent tasks can take many minutes. If macOS decides the machine is idle and goes to sleep, network connections drop and the running session is interrupted. Manually running `caffeinate` or changing Energy settings is easy to forget and keeps the Mac awake longer than needed.

## How it works

- The plugin subscribes to OpenCode session events and tracks which sessions are busy (including sub-agent / child sessions).
- A session is counted as busy on `session.execution.started` and removed on `session.execution.succeeded`, `session.execution.failed`, or `session.execution.interrupted` (OpenCode 2.1.x). Older servers that emit `session.status` (`busy`/`retry` → busy, `idle` → idle), `session.idle`, or `session.deleted` are still handled.
- While at least one session is busy, a single `/usr/bin/caffeinate -i -w <pid>` process runs, where `<pid>` is the OpenCode process. `-i` prevents idle system sleep.
- When all sessions are idle, `caffeinate` is terminated and normal sleep behaviour resumes.
- Because of `-w <pid>`, `caffeinate` also exits on its own if OpenCode quits or crashes, so no stray assertion is left behind.

No `sudo`, no `pmset` changes, no dependencies beyond the OpenCode plugin API.

## Requirements

- macOS (uses the built-in `/usr/bin/caffeinate`).
- OpenCode v2 with the plugin API (`@opencode/plugin`, `Plugin.define`).

## Install

### From npm (recommended)

Add the package to `plugins` in `~/.config/opencode/opencode.json`:

```json
{
  "plugins": ["@bayu06/opencode-keep-awake@0.1.0"]
}
```

Then restart OpenCode.

### As a local file

Local plugins in `~/.config/opencode/plugins/` are loaded automatically; no entry in `opencode.json` is needed.

Download the plugin file:

```sh
mkdir -p ~/.config/opencode/plugins
curl -fsSL https://raw.githubusercontent.com/yhoyoex/opencode-keep-awake/main/keep-awake.ts \
  -o ~/.config/opencode/plugins/keep-awake.ts
```

Or clone this repository and copy `keep-awake.ts` into `~/.config/opencode/plugins/`.

Then restart OpenCode.

## Verify

While an agent is working, run:

```sh
pmset -g assertions | grep caffeinate
```

A `caffeinate` assertion (`PreventUserIdleSystemSleep`) should be listed. Once all sessions are idle, run the command again; the entry should be gone.

## Limitations

- Closing the lid on battery power still puts the Mac to sleep. Clamshell mode requires AC power and an external display.
- Only idle system sleep is prevented. The display may still turn off and the screen may still lock.
- On non-macOS platforms the plugin does nothing.
- Developed against the OpenCode v2 plugin API; it has not been tested with other versions.

## Uninstall

```sh
rm ~/.config/opencode/plugins/keep-awake.ts
```

Then restart OpenCode.

## License

[MIT](LICENSE)
