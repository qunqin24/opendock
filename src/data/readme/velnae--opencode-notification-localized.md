# OpenCode Notification Localized

`@velnae/opencode-notification-localized` delivers localized OpenCode event notifications to the Linux desktop, OpenCode Toast, local sound, and optionally Android through SSH and Termux. It is an OpenCode TypeScript plugin, not a standalone notification daemon.

## Install

Add the scoped package to your OpenCode configuration, then restart OpenCode.

```jsonc
{
  "plugin": [
    ["@velnae/opencode-notification-localized", {
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

## Optional Android Delivery

The SSH channel is disabled by default. Define a host alias in `~/.ssh/config`; `ssh.host` is an alias, not a hostname, shell command, or connection string.

```sshconfig
Host android
  HostName 192.168.1.50
  User u0_a123
  IdentityFile ~/.ssh/id_ed25519
```

On the Android device, install Termux, Termux:API, and the Termux API package so `termux-notification` is available. Then enable the channel:

```jsonc
{
  "plugin": [["@velnae/opencode-notification-localized", {
    "ssh": { "enabled": true, "host": "android" }
  }]]
}
```

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
- Values passed to the remote POSIX shell are single-quote escaped.
- Channel delivery runs concurrently; SSH failures are swallowed and do not interrupt desktop, Toast, or sound notifications.

## Testing And Limitations

Run `npm test` for type checking plus focused Node built-in tests. Run `npm pack --dry-run` to inspect the release contents.

Linux desktop delivery requires `notify-send`. Sound playback requires a supported local player (`pw-play`, `paplay`, `aplay`, or `ffplay`; macOS can use `afplay`). Android delivery requires a reachable preconfigured SSH alias and Termux:API. This release does not test real SSH, Termux, desktop daemon, or audio-device delivery automatically.
