# opencode-zellij-status

Small OpenCode V2 plugin that shows OpenCode status on the current Zellij tab and optionally sends macOS desktop notifications for attention-worthy events.

**Compatibility:** OpenCode V2 only. This plugin uses the V2 plugin API and does not support OpenCode V1. Its Zellij and notification handlers run in the TUI client, where they can access the active terminal's environment.

The plugin listens for OpenCode session, permission, and form events (including agent questions). It renames the current Zellij tab with a small status suffix, using an idle marker so the tab label width stays stable as status changes.

## Install

Add the plugin to your OpenCode config:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-zellij-status"]
}
```

The package includes a minimal server part so OpenCode loads its TUI part from this `plugins` entry. Zellij actions and events run locally in the TUI client; no separate `cli.json` entry is needed.

The plugin only acts when running inside Zellij, detected through `ZELLIJ` or `ZELLIJ_SESSION_NAME`. It also uses `ZELLIJ_PANE_ID` to find the tab containing the current OpenCode pane.

If Zellij tab lookup or tab rename fails, the plugin no-ops silently so it does not break OpenCode outside the expected environment.

## Behavior

The first version intentionally keeps the mapping small and quiet. These are the default portable markers:

| OpenCode event | Tab suffix | Notification |
| --- | --- | --- |
| idle/default | `✓` | No |
| `session.execution.started` | `●` | No |
| `session.retry.scheduled` | `…` | macOS only, if enabled |
| `session.execution.succeeded` | `✓` | macOS only, once per completion if enabled |
| `session.idle` | `✓` | macOS only, if no explicit outcome event was received |
| `session.execution.interrupted` | `✓` | No |
| `session.execution.failed` | `!` | macOS only, if enabled |
| `permission.asked` | `?` | macOS only, if enabled |
| `permission.replied` | Current session state | No |
| `form.created` | `?` | macOS only, if enabled |
| `form.replied` | Current session state | No |
| `form.cancelled` | `✓` | No |

On each handled event, the plugin reads the current tab name from Zellij, strips any known status suffix (`✓`, `●`, `…`, `?`, `!`), and stores that base tab name in memory using the current Zellij session and tab ID. If the stripped tab name changes, for example after `sesh here` or a manual tab rename, the plugin treats the new name as authoritative. Idle status renames the tab back to that stored base name plus `✓`.

## Status Markers

Use a Nerd Font marker preset with:

```sh
OPENCODE_ZELLIJ_STATUS_STYLE=nerd
```

The Nerd Font preset is:

| State | Marker |
| --- | --- |
| idle/default | `󰸞` |
| busy | `󰔟` |
| retry | `` |
| waiting/question | `` |
| error | `󰛉` |

Override individual markers with:

```sh
OPENCODE_ZELLIJ_STATUS_IDLE="󰸞"
OPENCODE_ZELLIJ_STATUS_BUSY="󰔟"
OPENCODE_ZELLIJ_STATUS_RETRY=""
OPENCODE_ZELLIJ_STATUS_WAITING=""
OPENCODE_ZELLIJ_STATUS_ERROR="󰛉"
```

Per-marker overrides win over the preset. The plugin strips both default and Nerd Font markers from the current tab name before storing the base name, so switching styles does not permanently bake the old marker into the tab name.

Zellij tab names are plain text, so this plugin cannot make one marker glyph larger than the rest of the tab label. Marker size comes from your terminal font, font fallback, and any `zjstatus` tab styling. Use `zjstatus` colors, bold text, backgrounds, or a wider custom marker if you want the status to stand out more.

## Desktop Notifications

macOS desktop notifications are disabled by default. Enable them with:

```sh
OPENCODE_ZELLIJ_NOTIFY_DESKTOP=1
```

Alternatively, enable them through the plugin options in `opencode.json` by replacing the package string in the `plugins` array with this object:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "opencode-zellij-status",
      "options": { "desktopNotifications": true }
    }
  ]
}
```

When enabled, attention-worthy events use OpenCode's TUI attention API to send a macOS desktop notification. The environment variable must be available to the TUI process; plugin options work independently of the server environment.

Notifications are only sent for `session.idle`, retry, error, permission, and question events. When the current Zellij tab can be resolved, the notification body is prefixed with the base tab name, for example:

```text
OpenCode Zellij Status: task complete
```

## Zellij Details

The plugin finds the current tab by reading pane metadata:

```sh
zellij action list-panes --json --tab --command --state
```

It matches the current OpenCode process using `ZELLIJ_PANE_ID`, then renames the owning tab:

```sh
zellij action rename-tab-by-id <tab_id> "<base tab name> ●"
```

No custom Zellij WASM plugin is required.

## zjstatus

`zjstatus` is recommended as the visual tab bar layer if you want a polished tab display, but this plugin updates the Zellij tab name directly. It does not send `zjstatus::pipe::pipe_opencode` messages.

If you already use `zjstatus`, no special OpenCode pipe widget is needed. Make sure your tab format displays the tab name so the suffix is visible. A minimal tab-bar-oriented example:

```kdl
layout {
    default_tab_template {
        children
        pane size=1 borderless=true {
            plugin location="https://github.com/dj95/zjstatus/releases/latest/download/zjstatus.wasm" {
                format_left "{tabs}"
                format_right "{mode}"

                tab_normal "#[fg=#6C7086] {name} "
                tab_active "#[fg=#89B4FA,bold] {name} "
            }
        }
    }
}
```

Add this to a Zellij layout, such as `~/.config/zellij/layouts/default.kdl`. If you already have a `default_tab_template` or `zjstatus` config, merge the `format_left` and `tab_*` pieces rather than replacing your whole layout.

## Design Notes

- This is a focused OpenCode plugin, not a custom Zellij WASM plugin.
- It does not adopt `opencode-zellij` wholesale.
- It does not track todo counts in the first version.
- It fails silently when `zellij` or `osascript` is unavailable.

## Future Ideas

- Port/status display.
- Branch or worktree display.
- Richer agent status.
- Integration with `sesh`.
- Optional `zjstatus` pipe integration if tab suffixes are not enough.
