# OpenCode Notification Localized

`@velnae/opencode-notification-localized` delivers localized OpenCode event notifications to the Linux desktop, OpenCode Toast, local sound, and optionally Android through SSH and Termux. It is an OpenCode TypeScript plugin, not a standalone notification daemon.

The native **Notifications** panel lets you turn event notifications on or off directly in OpenCode, without an AI request. It requires OpenCode **1.18.34 or a compatible 1.x release**.

## Activate In OpenCode

Both entries below are required: `opencode.json` loads notification delivery, while `tui.json` loads its settings panel. These examples use **1.3.1**; until that version is published to npm, use the [local checkout instructions](#local-checkout-installation).

### 1. Check Requirements

Run `opencode --version`: use **1.18.34 or a compatible 1.x release**. On Linux, desktop delivery needs `notify-send`, and sound needs a player such as `pw-play`, `paplay`, `aplay`, or `ffplay`.

### 2. Load The Notification Plugin

Add this entry to `~/.config/opencode/opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    ["@velnae/opencode-notification-localized@1.3.1", {
      "enabled": true
    }]
  ]
}
```

The defaults enable all five events, desktop notifications, toast, and sound. Android starts disabled. OpenCode installs the npm plugin on startup; a global `npm install` is not required.

### 3. Load The Settings Panel

Add this entry to `~/.config/opencode/tui.json`:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["@velnae/opencode-notification-localized@1.3.1"]
}
```

Merge these entries into existing plugin lists; keep other plugins, themes, and options. If the notification plugin is already configured elsewhere (for example, `~/.opencode/opencode.json`), update that entry instead of adding a duplicate. Keep the server and TUI entries on the same version. For project-only installation, use `.opencode/opencode.json` and `.opencode/tui.json` instead of the global files.

### 4. Restart And Verify

1. Close and reopen every OpenCode instance that should load the new plugin.
2. Press **Ctrl+P**, search for **Notifications**, and press Enter.
3. Confirm the five event switches and **Android** appear.
4. Select a row with the arrow keys and press **Enter** to toggle it. The checkbox changes immediately, stays selected, and saves automatically. Press **Esc** to close.

After this initial restart, switch changes apply to subsequent notifications without restarting. See [Optional Android Delivery](#optional-android-delivery) to connect the phone.

If the panel is missing, check the `tui.json` entry, the installed OpenCode version, and that version **1.3.1** is available (or use local files). If the panel opens but delivery is disabled, check the server entry and its `enabled` setting. Avoid loading the npm package and the local checkout at the same time.

<details>
<summary>Full startup configuration (optional)</summary>

Only specify options you want to change. The following example shows the available startup settings:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    ["@velnae/opencode-notification-localized@1.3.1", {
      "enabled": true,
      "desktop": {
        "enabled": true,
        "showImage": true,
        "imageDecayFactor": 0.7,
        "appName": "OpenCode"
      },
      "toast": { "enabled": true, "variant": "info" },
      "voice": {
        "enabled": true,
        "player": "pw-play",
        "decayFactor": 0.7
      },
      "ssh": { "enabled": false, "host": "" },
      "update": {
        "enabled": true,
        "checkIntervalHours": 24,
        "notify": true
      },
      "events": {
        "permission.asked": { "enabled": true, "voice": "assets/sound/permission.mp3" },
        "permission.updated": { "enabled": true, "voice": "assets/sound/more-permissions.mp3" },
        "question.asked": { "enabled": true, "voice": "assets/sound/question.mp3" },
        "session.idle": { "enabled": true, "voice": "assets/sound/task-done.mp3" },
        "session.error": { "enabled": true, "voice": "assets/sound/error.mp3" }
      }
    }]
  ]
}
```

</details>

## Optional Android Delivery

The SSH channel is disabled by default. Define a host alias in `~/.ssh/config`; `ssh.host` is an alias, not a hostname, shell command, or connection string.

```sshconfig
Host android
  HostName 192.168.1.50
  Port 8022
  User u0_a123
  IdentityFile ~/.ssh/id_ed25519
```

Use the phone's actual address, SSH port, username, and your SSH key path. On Android, install Termux and the Termux:API companion app, install `openssh` and `termux-api` inside Termux, and start `sshd`. Configure key-based authentication: the plugin uses noninteractive SSH and cannot ask for a password.

From the computer, verify the configured alias and command:

```bash
ssh -n -T -o BatchMode=yes android 'command -v termux-notification'
```

Add the following options to the **existing server plugin entry** in `opencode.json`:

```jsonc
{
  "plugin": [["@velnae/opencode-notification-localized@1.3.1", {
    "ssh": { "enabled": true, "host": "android" }
  }]]
}
```

Restart OpenCode after changing the SSH startup options. In **Ctrl+P → Notifications**, enable **Android** and the events you want. Android off silences only the phone; an event off silences that event on every channel. Termux and Android notification permissions must allow notifications for delivery to be visible.

## Local Checkout Installation

For development or before publishing to npm, use absolute file URLs instead of package names. In your existing `opencode.json`, replace the notification plugin entry with:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [["file:///absolute/path/to/this/repository/main.ts", {
    "enabled": true
  }]]
}
```

Preserve any existing options such as `ssh.host`. In `tui.json`, replace the notification TUI entry with:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["file:///absolute/path/to/this/repository/tui.ts"]
}
```

Restart OpenCode once to load both updated modules. Open the command palette (`Ctrl+P` by default), search for **Notifications**, and press Enter. This is a native settings action, not an AI slash command.

## Controls And Scope

The panel contains five event switches and an independent Android switch:

```text
Notifications

[x] Permission requested
[x] More permissions requested
[x] Question asked
[ ] Task completed
[x] Session error

[x] Android
```

Use the arrow keys to select a switch and **Enter to toggle it immediately**. The panel stays open with the same row selected. **Escape closes it**; every change is saved automatically. There are no submenus or save button.

Turning an event off blocks **all configured channels**, including Android. **Android** controls only mobile delivery: turning it off keeps local sound, desktop, and toast notifications active for enabled events. Android on still respects every event switch and requires a valid `ssh.host` and working Termux setup.

Each switch initially uses the server plugin configuration: event flags come from `events`, and Android comes from `ssh.enabled`. Saved selections take precedence without restarting, including enabling Android when `ssh.enabled` was initially false. The startup master switch (`enabled`) and local channel settings remain authoritative. If the master switch is off, the panel title indicates that delivery is disabled.

Preferences are **global to the local OS user**, across projects and OpenCode instances. They live in `$XDG_CONFIG_HOME/opencode-notification/preferences.json` (fallback: `~/.config/opencode-notification/preferences.json`). The server reads this small file before each notification: changes apply to subsequent sends without a restart, but do not cancel an in-flight sound or SSH request. Simultaneous saves use last-writer-wins semantics.

The switches are not connection or device-health indicators. Update notices are separate from these five events and remain controlled by `update.notify` in `opencode.json`; the Android switch also controls their mobile delivery.

The TUI and server must share the same local user/config filesystem. A TUI attached to a server on another machine does not synchronize this file remotely. Host aliases, audio paths, players, and other startup options remain in `opencode.json` and require a restart when changed.

If the preferences file is malformed or unreadable, the panel shows an error and does not overwrite it. The server logs a warning and keeps its last valid preferences (or startup defaults if none were loaded). Repair or remove the file to restore normal operation.

The earlier experimental master/channel preference format has been replaced by event booleans. When upgrading that checkout, reset the preferences file to `{}` and restart all OpenCode instances once. Existing event-only preferences remain compatible with the Android switch; no reset is needed when adding it. For example, `{"android":false,"events":{"session.idle":false}}` mutes Android globally and completion notifications on every channel.

## Delivery Behavior

Desktop and Android notifications share the same layout: the title is the OpenCode project name. The body is two lines when a session title is available: session title first, localized event message second. Without a session title, the body is the event message only.

```text
my-project
Implement Android notifications
The assigned task has been completed.
```

Toast notifications remain event-message-only. The plugin does not provide a native shared subtitle; desktop and Android use the title/body layout above. Update notifications use the project title and their update message.

Enabled event types are `permission.asked`, `permission.updated`, `question.asked`, `session.idle`, and `session.error`. Available channels are Linux desktop (`notify-send`), OpenCode Toast, local sound, and optional SSH/Termux Android delivery.

## Security And Reliability

- SSH host aliases are validated against a restricted alias format before use.
- SSH uses `BatchMode=yes`, so notification delivery never waits for an interactive password prompt.
- External commands never inherit terminal input/output; SSH also disables remote terminal allocation.
- Values passed to the remote POSIX shell are single-quote escaped.
- Channels run concurrently and failures are isolated. Per plugin instance, each external channel has at most one active command; arrivals while it is busy are dropped, never queued.

| Channel | Command deadline | After failure |
| --- | --- | --- |
| Android/SSH | 10 seconds | Skip attempts for 30 seconds; resume on a later event, without background retries |
| Desktop | 5 seconds | Drop the stalled notification |
| Sound | 10 seconds | Stop playback; do not launch another player after a timeout |

On Linux and macOS, timeout/disposal also terminates the command's owned process group. Disposing the plugin cancels active commands, pending idle/update timers, and outstanding SDK requests. Toast and session lookups receive a three-second cancellation deadline; only one toast request is allowed in flight. Update checks have an eight-second deadline covering headers and body.

These limits intentionally favor a responsive terminal over delivering every notification in a burst. They apply independently to each plugin instance, not as a system-wide process quota.

Restart each OpenCode instance when convenient to load plugin code changes, including local-file plugins; editing the source does not update already-loaded instances.

## Testing And Limitations

Run `npm test` for type checking plus focused Node built-in tests. On Linux with Bun available, run `npm run test:runtime` for an isolated real-plugin stress/lifecycle test. Run `npm pack --dry-run` to inspect the release contents.

Subprocess tests use isolated fake executables to check input isolation, deadlines, busy-event drops, cooldown recovery, disposal, nonfatal failures, argument quoting, and independent local delivery. The Bun harness sends 20 events to stalled fake SSH, desktop, and audio commands and verifies that only three commands start, their helpers are terminated, and no work is launched after disposal. No real Android or local notification services are used. Type checking covers production and test sources; Node tests are compiled to CommonJS so Node resolves extensionless imports without changing production modules.

Preference tests cover event filtering across local channels, startup defaults, persistence, and corrupt-file recovery. Fake SSH tests verify each event gate and the independent Android switch, including updates, missing hosts, and live re-enabling. A TUI API harness checks one-action toggling, selection retention, and closing during a save without any model client. For a real terminal smoke check, load both local entrypoints in an isolated OpenCode configuration, open **Notifications**, and press Enter twice on **Task completed** and then **Android**: each should toggle without a submenu. No provider connection or test notification is needed.

Linux desktop delivery requires `notify-send`. Sound playback requires a supported local player (`pw-play`, `paplay`, `aplay`, or `ffplay`; macOS can use `afplay`). Android delivery requires a reachable preconfigured SSH alias and Termux:API. This release does not test real SSH, Termux, desktop daemon, or audio-device delivery automatically.

## Publish To npm (Maintainers)

From the repository root, with an npm account authorized to publish under `@velnae`:

```bash
npm test
npm publish --dry-run --access public
npm publish --access public
```

Complete npm's authentication/2FA prompt in your own terminal. Each published package version is immutable; update `package.json`, `package-lock.json`, and `CHANGELOG.md` before the next release. The prepared version is **1.3.1**.
