# opencode-notification-localized

Based on `@duoyun/opencode-notification@1.1.0`.

This fork keeps the original plugin structure and behavior, but replaces the bundled notification text and default sound files.

## Modified desktop notification texts

- `session.idle`: `The assigned task has been completed.`
- `session.error`: `There was an error in the session.`
- `question.asked`: `You have a question.`
- `permission.asked`: `Permissions are required.`
- `permission.updated`: `More permissions are required.`
- Fallback text: `OpenCode notification`

## Modified default sounds

- `session.idle` → `assets/sound/task-done.mp3`
- `session.error` → `assets/sound/error.mp3`
- `question.asked` → `assets/sound/question.mp3`
- `permission.asked` → `assets/sound/permission.mp3`
- `permission.updated` → `assets/sound/more-permissions.mp3`

These files were copied from:

- `/home/emerson/.config/opencode/notification-sounds/task-done.mp3`
- `/home/emerson/.config/opencode/notification-sounds/error.mp3`
- `/home/emerson/.config/opencode/notification-sounds/question.mp3`
- `/home/emerson/.config/opencode/notification-sounds/permission.mp3`
- `/home/emerson/.config/opencode/notification-sounds/more-permissions.mp3`

## OpenCode config example

```jsonc
{
  "plugin": [
    "opencode-notification-localized"
  ]
}
```

For local development:

```jsonc
{
  "plugin": [
    ["file:///absolute/path/to/opencode-notification-localized/main.ts", {
      "enabled": true
    }]
  ]
}
```

## Note

Restart OpenCode after changing plugin configuration or updating the plugin files.
