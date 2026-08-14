# opencode-last-activity

OpenCode TUI plugin that shows a relative last-activity indicator in `session_prompt_right` so you can tell whether the current session is active, waiting, retrying, or possibly stalled.

## Demo

https://github.com/user-attachments/assets/8dccc64a-ed73-4582-b981-beead5537dc5

## Features

- shows `active now` while work is happening
- shows `last activity 8s ago` when the session is idle
- shows `waiting on permission` and `waiting on question` when input is blocked
- shows `possibly stalled 2m ago` when the session stays busy without recent activity
- optional inactivity-only mode that stays hidden until the session goes quiet
- optional compact mode for tighter prompt layouts

## Install

Install the package with OpenCode:

```sh
opencode plugin @alexandroheredia/opencode-last-activity
```

Then quit and restart OpenCode.

## Manual Config

If you prefer to edit `tui.json` directly:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": [
    [
      "@alexandroheredia/opencode-last-activity",
      {
        "compact": false,
        "activeWindowMs": 5000,
        "inactivityNoticeMs": 30000,
        "stalledWindowMs": 60000,
        "visibility": "always"
      }
    ]
  ]
}
```

## Options

| Option               | Type                                   | Default    | Description                                                           |
| -------------------- | -------------------------------------- | ---------- | --------------------------------------------------------------------- |
| `compact`            | `boolean`                              | `false`    | Uses shorter labels such as `active`, `2m ago`, and `stalled 2m ago`. |
| `visibility`         | `"always" \| "inactivity-only"`     | `"always"` | Controls whether the indicator is always visible or only after inactivity. |
| `activeWindowMs`     | `number`                               | `5000`     | Age threshold that still counts as active.                            |
| `inactivityNoticeMs` | `number`                               | `30000`    | In inactivity-only mode, how long to wait before showing quiet sessions. |
| `stalledWindowMs`    | `number`                               | `60000`    | Age threshold for switching a busy session to stalled.                |

If `inactivityNoticeMs` is set lower than `activeWindowMs`, the plugin raises it to match the active window. If `stalledWindowMs` is set lower than `inactivityNoticeMs`, the plugin pushes it above the inactivity threshold so labels stay sane.

## Inactivity-Only Example

If you only want to see the indicator when OpenCode has gone quiet for a while:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": [
    [
      "@alexandroheredia/opencode-last-activity",
      {
        "visibility": "inactivity-only",
        "inactivityNoticeMs": 30000,
        "stalledWindowMs": 60000
      }
    ]
  ]
}
```

In this mode, active sessions stay hidden until there has been no output for at least `inactivityNoticeMs`. Permission prompts, questions, and retries still show immediately.

## Label Examples

Full mode:

- `active now`
- `last activity just now`
- `waiting on permission`
- `waiting on question`
- `retrying 12s ago`
- `possibly stalled 3m ago`

Compact mode:

- `active`
- `just now`
- `permission`
- `question`
- `retry 12s ago`
- `stalled 3m ago`

## Contributing

Development setup and local testing notes live in [`CONTRIBUTING.md`](./CONTRIBUTING.md).
