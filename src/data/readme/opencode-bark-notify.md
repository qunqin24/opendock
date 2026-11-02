# opencode-bark-notify

Bark push notifications for [OpenCode](https://opencode.ai) sessions: one push when a task finishes, fails, or needs approval, with the session title, a deep link back to it, and no duplicates.

## Requirements

- [Bark](https://github.com/Finb/Bark) on your iPhone or iPad
- Your Bark device key from the app
- OpenCode V2

## Install

```sh
opencode plugin add opencode-bark-notify
```

Then configure it in `opencode.json(c)`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "opencode-bark-notify",
      "options": {
        "barkKey": "YOUR_DEVICE_KEY",
        "uiUrl": "https://opencode.example.com",
      },
    },
  ],
}
```

## Options

| Option    | Required | Default                                    | Description                                                              |
| --------- | -------- | ------------------------------------------ | ------------------------------------------------------------------------ |
| `barkKey` | yes      | —                                          | Bark device key. Without it the plugin logs a warning and sends nothing. |
| `barkUrl` | no       | `https://api.day.app`                      | Base URL of a Bark server. Trailing slashes are stripped.                |
| `group`   | no       | `opencode`                                 | Bark notification group.                                                 |
| `uiUrl`   | no       | —                                          | Base URL of the OpenCode web UI, used to build per-session deep links.   |
| `icon`    | no       | `https://opencode.ai/favicon-96x96-v3.png` | Icon URL shown by Bark. Set to `""` to send no icon.                     |
| `sound`   | no       | `tiptoes`                                  | Bark/iOS sound name. Set to `""` to send no sound.                       |

Leave `uiUrl` unset to omit the tap action entirely.

## Events

| Event                         | Title         | Subtitle      | Body                          |
| ----------------------------- | ------------- | ------------- | ----------------------------- |
| `session.execution.succeeded` | session title | Task finished | `A session is ready.`         |
| `session.execution.failed`    | session title | Task failed   | `A session execution failed.` |
| `permission.asked`            | session title | Question      | `action: resource`            |

The title falls back to `OpenCode` when the session has no title or the lookup fails.

Requests go to `POST {barkUrl}/push` with an 8 second timeout.

## Duplicate prevention

OpenCode loads plugins once per project location while the event stream is server-wide, so a naive subscriber sends one push per open project. This plugin avoids that by:

- keeping only events whose session belongs to the plugin instance's own directory;
- skipping sessions with a `parentID` for completion events, so subagents do not each produce a push (`permission.asked` is exempt);
- relying on a single explicit config entry, never auto-discovery as well.

## Deep links

Tapping a notification opens the session in the OpenCode web UI:

```text
https://opencode.example.com/server/<serverKey>/session/<sessionID>
```

`serverKey` is the base64url encoding of the `uiUrl` origin. Pairing the same OpenCode server through a different URL yields a different key, so the deep link only resolves when your client is paired to the same origin as `uiUrl`.

## Logging

Each send logs one line:

```text
[opencode-bark] sending ses_abc123 from /home/me/projects/app
```

## License

MIT
