# OpenCode Wayland Permission Notify

An OpenCode terminal-UI plugin that turns permission requests into actionable
Linux desktop notifications with **Approve once**, **Always allow** and **Deny**
buttons. It has no dependencies.

The plugin runs in the local terminal UI, not the server, so it also works when
the TUI is attached to a remote OpenCode server: the notification appears on the
desktop you are sitting at.

Version 2 targets OpenCode 2.2. Version 1 (the single `wayland-permission-notify.js`
file in this repository's history) was for OpenCode 1.x and does not work on 2.x.

## Requirements

- **OpenCode 2.2** (the terminal UI, `opencode` or `opencode attach`). It uses only
  the public 2.2 TUI plugin API: `data.on("permission.asked" | "permission.replied")`,
  `data.session.get`, `ui.router.current` and `client.permission.reply` with
  `decision`. Earlier 2.x releases sent `reply` instead of `decision` and are not
  supported.
- Linux with a graphical session and a **session D-Bus** (`DBUS_SESSION_BUS_ADDRESS`
  set in the TUI's environment). On any other platform the plugin does nothing.
- A notification daemon implementing `org.freedesktop.Notifications` **with
  action buttons**. GNOME Shell on Wayland is the tested target; KDE Plasma, Mako,
  Dunst and similar daemons should work if they show actions.
- `gdbus` (from GLib) and `dbus-monitor` (from D-Bus) on `PATH`. Ubuntu/Debian:
  `libglib2.0-bin` and `dbus`.

## Install

Add it to the **local** `cli.json` (terminal-only plugins go there, not in the
server's `opencode.json`):

```json
{
  "plugins": ["@kerneloops/opencode-wayland-permission-notify"]
}
```

Or point at a checkout of this repository: `"plugins": ["/absolute/path/to/opencode-wayland-permission-notify"]`.
Restart the terminal UI afterwards.

## Behaviour

- Only the TUI currently showing a session notifies about that session's
  requests. TUIs showing other sessions, or the home screen, ignore them.
- If the same session is open in several TUIs on one machine, the first to claim
  a per-session Unix socket in `$XDG_RUNTIME_DIR` (or the temporary directory) owns
  its notifications; another takes over when it exits.
- **Approve once** replies `once`, **Always allow** replies `always`, **Deny**
  replies `reject`. A reply is sent only if the session is still known to the TUI.
- Answering in the TUI (or anywhere else) closes the notification. Duplicate
  requests for the same action and resources show one notification.
- Unanswered notifications are withdrawn after 10 minutes; the request stays
  pending in OpenCode.
- Button clicks are accepted only from the current owner of the
  `org.freedesktop.Notifications` bus name (enforced by the D-Bus match rule), so
  another client on the session bus cannot fake a click. Each notification also
  gets fresh random action keys, and a click counts only if it names one of the
  keys offered for that notification ID. Another application's notification
  cannot answer an OpenCode request, even with a crafted action key.

## Limits

- The notification shows the requested action and its resources (for example a
  shell command), truncated to 500 characters. Your desktop may show it on the
  lock screen or keep it in its notification history.
- Anything running as your user on the same desktop can already control your
  session; this plugin does not defend against that.
- Daemons without action support show a plain notification you cannot answer.
- It is not a permission policy: it only relays your click.
- Troubleshooting lines (session and request IDs, fixed error descriptions; never
  the request contents or `gdbus` error output) are appended to
  `~/.opencode-permission-notify.log`. The plugin sets it to mode `0600` on every
  write, including a file left readable by version 1. It never writes through a
  symlink. The file is not rotated.

## Development

```bash
npm test
```

The tests replace `gdbus` and `dbus-monitor` with fakes and need no desktop.

## Licence

[MIT](LICENSE)
