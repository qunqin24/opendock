# opencode-notify

> Native OS notifications for OpenCode V2.

A plugin for [OpenCode](https://opencode.ai/v2/docs/) that delivers Native OS notifications when tasks complete, errors occur, or the AI needs your input. It uses native OS notification delivery on macOS, Windows, and Linux, with an additional [cmux](https://www.cmux.dev/)-native path when available.

## Why This Exists

You delegate a task and switch to another window. Now you're checking back every 30 seconds. Did it finish? Did it error? Is it waiting for permission?

This plugin solves that:

- **Stay focused** - Work in other apps. A notification arrives when the AI needs you.
- **Native OS notifications first** - Uses macOS Notification Center via `alerter`, plus Windows Toast and Linux notify-send via `node-notifier`.
- **Smart defaults** - Won't spam you. Only notifies for meaningful events, with parent-session filtering and quiet-hours support.
- **Additional [cmux](https://www.cmux.dev/)-native path** - When running in [cmux](https://www.cmux.dev/), can route through `cmux notify` and still falls back safely to desktop notifications.

## Installation (OpenCode V2)

Requires OpenCode V2 (`opencode --version` should report 2.x).

**Option A — from source (local path, recommended for now):**

`opencode plugin add` only accepts npm/Git targets, so local paths are
declared directly in config. In `~/.config/opencode/opencode.json(c)`
(global) or `<project>/.opencode/opencode.json(c)` (project-local):

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    "C:/Users/Basilio/projects/opencode-notify",
  ],
}
```

Use the package directory (it exposes `index.ts` at the root). Then reload:

```bash
opencode reload
opencode plugin list   # should show kdco-notify / local
```

**Option B — from npm (once published):**

```bash
opencode plugin add kdco-notify@latest
opencode service restart
```

**Verify it works:** run a session and wait for it to idle, or trigger a
permission prompt — a desktop notification should arrive. Check
`opencode plugin list` for the `kdco-notify` ID, and the server log
(`~/.local/share/opencode/log/opencode.log`) for `notify:` warnings if
nothing appears.

## How It Works

> "Notify the human when the AI needs them back, not for every micro-event."

| Event | Notifies? | Sound | Why |
|-------|-----------|-------|-----|
| Session complete | Yes | Glass | Main task done - time to review |
| Session error | Yes | Basso | Something broke - needs attention |
| Permission needed | Yes | Submarine | AI is blocked, waiting for you |
| Question asked | Yes | Submarine (default) | Questions should always reach you promptly |
| Sub-task complete / error | No (default) | - | Set `notifyChildSessions: true` to include child-session `session.idle` and `session.error` events |

The plugin automatically:
1. Detects your terminal emulator (supports 37+ terminals)
2. Suppresses `session.idle`, `session.error`, and `permission.updated` notifications when your terminal is focused on macOS
3. Enables click-to-focus on macOS (click notification → terminal foregrounds)

Question notifications intentionally bypass macOS focus suppression so direct prompts are not missed.

**V2 note:** OpenCode V2 rarely emits `session.idle` for interactive sessions (verified: no idle event across long active sessions), so turn completion is derived from step/text/tool activity going quiet: when a turn ends and nothing happens for `quietSeconds` (default 8), the plugin notifies. Any further session activity cancels the pending notification. Genuine `session.idle` / `session.status` events are still honored when the server emits them (e.g. background runs).

## Native OS Notification Paths

By default, notifications go through the native OS desktop notification path:

- **macOS:** Notification Center via [`vjeantet/alerter`](https://github.com/vjeantet/alerter) (`alerter` must be on `PATH`, macOS 13+)
- **Windows:** Toast notifications (`SnoreToast` backend)
- **Linux:** `notify-send`

macOS desktop fallback requires installing `alerter` separately. Supported install paths include Homebrew (`brew install vjeantet/tap/alerter`), MacPorts, or downloading the release zip from GitHub Releases and placing the binary on `PATH`.

### Additional [cmux](https://www.cmux.dev/)-native path

When running inside [cmux](https://www.cmux.dev/) (with `CMUX_WORKSPACE_ID` set), the plugin can also send notifications via [cmux](https://www.cmux.dev/):

```bash
cmux notify --title "..." --subtitle "..." --body "..."
```

If [cmux](https://www.cmux.dev/) is unavailable or invocation fails, notifications automatically fall back to the desktop path: `alerter` on macOS, and the existing `node-notifier`-backed path on Windows/Linux.

## Platform Support

| Feature | macOS | Windows | Linux |
|---------|-------|---------|-------|
| Native OS notifications | Yes | Yes | Yes |
| Custom sounds | Yes | No | No |
| Focus detection | Yes | No | No |
| Click-to-focus | Yes | No | No |
| Terminal detection | Yes | Yes | Yes |

## Configuration (Optional)

Works out of the box. To customize, create `~/.config/opencode/kdco-notify.json`:

```json
{
  "notifyChildSessions": false,
  "quietSeconds": 8,
  "timeout": 0,
  "terminal": "ghostty",
  "sounds": {
    "idle": "Glass",
    "error": "Basso",
    "permission": "Submarine",
    "question": "Submarine"
  },
  "quietHours": {
    "enabled": false,
    "start": "22:00",
    "end": "08:00"
  }
}
```

Configuration keys:

- `notifyChildSessions` (default `false`): when `true`, include child/sub-session `session.idle` and `session.error` notifications (question and permission notifications are unaffected).
- `quietSeconds` (default `8`): seconds of session silence after a turn ends before notifying. Set to `0` to disable quiet-based detection (event-based only).
- `timeout` (default `0`): seconds before a desktop notification disappears automatically. Set to `0` for no timeout. Supported on macOS and Linux outside of cmux.
- `terminal` (optional): override terminal auto-detection.
- `sounds`: per-event sounds (`idle`, `error`, `permission`, optional `question`).
- `quietHours`: scheduled suppression window.

**Available macOS sounds:** Basso, Blow, Bottle, Frog, Funk, Glass, Hero, Morse, Ping, Pop, Purr, Sosumi, Submarine, Tink

## FAQ

### Does this add bloat to my context?

Minimal footprint. The plugin is event-driven - it listens for session events and fires notifications. No tools are added to your conversation, no prompts are injected beyond initial setup.

### Will I get spammed with notifications?

No. Smart defaults prevent noise:
- Only notifies for parent sessions (not every sub-task)
- Supports quiet-hours suppression
- Suppresses when your terminal is the active window on macOS (except direct question notifications)

### Can I disable it temporarily?

This plugin does not currently expose an `enabled` config flag. To disable notifications, remove the plugin (`opencode plugin remove <target>` or drop the `plugins` entry and run `opencode service restart`) and add it back when needed.

## Supported Terminals

Uses [`detect-terminal`](https://github.com/jonschlinkert/detect-terminal) to automatically identify your terminal. Supports 37+ terminals including:

Ghostty, Kitty, iTerm2, WezTerm, Alacritty, Hyper, Terminal.app, Windows Terminal, VS Code integrated terminal, and many more.

## Manual Installation

If you prefer not to use `opencode plugin add`, copy the `src/` tree into
`.opencode/plugins/notify/` (or `~/.config/opencode/plugins/notify/` for
global use) preserving the layout, then `npm install` the runtime deps
(`node-notifier`, `detect-terminal`, `@opencode/plugin`) — or just reference
this repo as a local path plugin as shown above, which is simpler and keeps
updates automatic.

**Caveats:**
- On macOS 13+, install [`vjeantet/alerter`](https://github.com/vjeantet/alerter) and ensure `alerter` is on `PATH` (Homebrew: `brew install vjeantet/tap/alerter`; MacPorts and GitHub Releases/manual zip are also supported)
- Install [cmux](https://www.cmux.dev/) if you want the additional [cmux](https://www.cmux.dev/)-native notification path

## Part of the OCX Ecosystem

This plugin is part of the [KDCO Registry](https://github.com/kdcokenny/ocx/tree/e79df6f/workers/kdco-registry). For the full experience, check out [kdco-workspace](https://github.com/kdcokenny/ocx) which bundles notifications with background agents, specialist agents, and planning tools.

## Maintenance

V2 port. The V1 event names changed in V2 and are mapped as follows
(`session.error` → `session.execution.failed`, `permission.updated` →
`permission.asked`, `question.asked` → `form.created` + `question` tool hook);
legacy V1 names are still accepted when present.

## Disclaimer

This project is not built by the OpenCode team and is not affiliated with [OpenCode](https://github.com/sst/opencode) in any way.

## License

MIT
