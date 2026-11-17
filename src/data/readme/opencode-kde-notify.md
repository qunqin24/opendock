# opencode-kde-notify

[![CI](https://github.com/tiagosantini/opencode-kde-notify/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/tiagosantini/opencode-kde-notify/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

Native KDE Plasma / freedesktop notifications for [OpenCode](https://opencode.ai) on Linux,
delivered straight to D-Bus through `notify-send`. Clicking a bubble brings the terminal
running OpenCode back — across virtual desktops, Plasma Activities and monitors.

## Why this exists

OpenCode raises notifications through the terminal's OSC 99 protocol (`opentui-notifications`). Inside
`tmux` that sequence never reaches the terminal — tmux only forwards sequences wrapped in its
passthrough format — so no system bubble appears (the sound still plays, because it is generated
locally). This plugin bypasses the problem by talking to `org.freedesktop.Notifications` directly.

## Requirements

- OpenCode 2.x
- Linux with a freedesktop notification server (KDE Plasma, GNOME, dunst, mako, …)
- `notify-send` on `PATH` (`libnotify` / `libnotify-bin`)
- For click-to-focus: KDE Plasma 6 and `gdbus` (part of glib2, normally already installed)
- Clickable bubbles need libnotify 0.8 or newer; older versions still show plain,
  non-interactive notifications

## Installation

### As a local plugin (auto-discovered)

Copy or clone this directory into the global plugin folder:

```text
~/.config/opencode/plugins/opencode-kde-notify/
```

OpenCode discovers plugins under `<config>/plugins/<package>/` automatically — nothing to configure.

### From a repository outside the config directory

Point to the absolute path in `~/.config/opencode/opencode.json`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["/home/user/Projects/opencode-kde-notify"],
}
```

### From GitHub

```sh
opencode plugin add github:tiagosantini/opencode-kde-notify
```

### Published on npm

```sh
opencode plugin add opencode-kde-notify
```

## What gets notified

| Event                                | Title                 | Icon                 | Urgency          |
| ------------------------------------ | --------------------- | -------------------- | ---------------- |
| `form.created` (question in harness) | OpenCode Question     | `dialog-question`    | critical, sticky |
| `session.execution.succeeded`        | Task completed        | `dialog-information` | normal, 8 s      |
| `session.execution.failed`           | Execution failed      | `dialog-error`       | critical, sticky |
| `session.execution.interrupted`      | Execution interrupted | `process-stop`       | normal, 8 s      |
| `permission.asked`                   | Permission required   | `dialog-password`    | critical, sticky |

Subagent sessions are ignored — only the root session notifies. All of these bubbles are
clickable on Plasma 6 (see [Click to focus](#click-to-focus)); the user-facing strings live in
`src/plugin.ts`.

## Behavior

- **Click:** the bubble carries a hidden `default` action. While the bubble is visible, clicking
  it brings the terminal back. Plasma keeps expired notifications in history but drops their
  actions, so entries in the history are not clickable.
- **Focus:** the native attention API is used as a focus probe. A notification is skipped only when
  the focus is known (`focused`) or when notifications are turned off; on `focus_unknown` it still
  notifies, so events are never lost.
- **Sounds:** untouched. They keep coming from the built-in `opencode.notifications` plugin.
- **`auto` mode:** the plugin stays inactive when running inside kitty **without** tmux, because
  there OSC 99 reaches the terminal and OpenCode already notifies. Inside tmux (or in any other
  terminal) it takes over. This prevents duplicate bubbles.
- **Identity:** notifications carry a `desktop-entry=opencode` hint and the plugin installs
  `~/.local/share/applications/opencode.desktop` for it (see below).

## Click to focus

Clicking a notification brings the terminal running OpenCode back:

- leaves "show desktop" and unminimizes the window;
- switches to the window's Plasma Activity and virtual desktop (per output when KWin supports
  separate desktops per screen);
- raises and activates it, including on another monitor;
- selects the pane and window in tmux, and focuses the OpenCode tab of the session.

Plasma calls the notification's `default` action when the body is clicked. Wayland has no
window-control API such as `xdotool`, so the plugin asks KWin to do it: it writes a throwaway
script into `$XDG_RUNTIME_DIR/opencode-kde-notify` and runs it through
`org.kde.KWin /Scripting`. The window is matched by pid. The plugin derives the pids from the
TUI process ancestry and, under tmux, from the attached tmux client — tmux daemonizes, so the TUI
no longer descends from the terminal. `KITTY_PID` is used as an extra hint.

Limitations:

- A bubble is only clickable while it is visible; Plasma removes the actions from notifications
  that have expired.
- Terminal emulators that host several windows in one process (kitty, konsole) share a pid. The
  plugin prefers the active window and otherwise the topmost one. Use `focusCommand` to pick an
  exact window, for example with kitty's remote control:
  ```jsonc
  {
    "plugins": [
      {
        "package": "opencode-kde-notify",
        "options": { "focusCommand": "kitty @ --match id:$KITTY_WINDOW_ID focus-window" },
      },
    ],
  }
  ```
  This requires `allow_remote_control` in `kitty.conf`.
- Click-to-focus needs a KDE session. On other desktops the action is omitted unless
  `focusCommand` is configured (the command is then the whole focus implementation).
- `focusCommand` runs through `sh -c` on click by design; treat it like any other shell alias.

## Notification history

Plasma only keeps a notification in the system tray history when it can attribute it to an
application: it resolves the `desktop-entry` hint against an installed `.desktop` file. A
notification without one falls into the `@other` bucket, and Plasma ships that bucket with
`ShowInHistory=false` — the bubble appears, the history stays empty. Plain `notify-send` has the
same fate.

That is why the plugin writes `opencode.desktop` into `$XDG_DATA_HOME/applications` (usually
`~/.local/share/applications`) on startup: it gives the notifications an identity Plasma can
resolve, so they land in the history with the default settings.

- The file is marked with `X-OpenCode-KDE-Notify=true`. It is only rewritten when the plugin
  created it; a real `opencode.desktop` installed by something else is never touched.
- `NoDisplay=true` keeps it out of the application launcher.
- Set `desktopEntry: false` (or `OPENCODE_KDE_NOTIFY_DESKTOP_ENTRY=false`) to stop the file from
  being written, or delete it — the notifications keep working, they just lose their history entry.
- Plasma keeps the history in memory only, so it is emptied whenever `plasmashell` restarts
  ([KDE bug 486483](https://bugs.kde.org/show_bug.cgi?id=486483)).

## Configuration

Options (all have sensible defaults — usually nothing to configure):

| Option         | Values              | Default   | Description                                                                  |
| -------------- | ------------------- | --------- | ---------------------------------------------------------------------------- |
| `mode`         | `auto`, `always`    | `auto`    | `auto` acts only where the native path fails; `always` uses D-Bus every time |
| `when`         | `blurred`, `always` | `blurred` | Notify only when the terminal is unfocused, or always                        |
| `desktopEntry` | `true`, `false`     | `true`    | Install `opencode.desktop` so notifications reach the Plasma history         |
| `focusOnClick` | `true`, `false`     | `true`    | Click a bubble to bring the terminal back                                    |
| `focusCommand` | shell command       | unset     | Extra command run on click, after the built-in KWin focus step               |

Through configuration:

```jsonc
{
  "plugins": [
    {
      "package": "/home/user/Projects/opencode-kde-notify",
      "options": { "mode": "always", "when": "always" },
    },
  ],
}
```

Or through the environment, without editing configuration:

```sh
OPENCODE_KDE_NOTIFY_MODE=always
OPENCODE_KDE_NOTIFY_WHEN=always
OPENCODE_KDE_NOTIFY_DESKTOP_ENTRY=false
OPENCODE_KDE_NOTIFY_FOCUS_ON_CLICK=false
OPENCODE_KDE_NOTIFY_FOCUS_COMMAND='kitty @ --match id:$KITTY_WINDOW_ID focus-window'
```

Environment variables are used only when the matching option is not set.

## Releasing

Releases are published by the `Release` workflow when `main` moves. Merging the release PR is the
approval; no environment or repository secret is involved.

1. Bump the version and finalize the changelog in a PR:

   ```sh
   npm version 0.2.0 --no-git-tag-version
   ```

   Rename `## [Unreleased]` to `## [0.2.0] - YYYY-MM-DD` in `CHANGELOG.md` and update the
   comparison links at the bottom.

2. Open the PR as `chore(release): 0.2.0` and rebase-merge it once CI is green.

3. The workflow runs the tests, checks that the changelog has a section for the version, publishes
   to npm with provenance, pushes the `v0.2.0` tag and creates the GitHub release.

Ordinary merges are no-ops: the workflow only acts when the `package.json` version is neither
tagged nor published. Re-running a failed release is safe and performs only the missing steps.

One-time prerequisites:

- On npmjs.com, add a trusted publisher for GitHub Actions: owner `tiagosantini`, repository
  `opencode-kde-notify`, workflow `release.yml`, no environment.
- An unvalidated trusted publisher expires after two days, so keep the configuration fresh until
  its first successful publish.
- No repository secrets are needed.

To validate the workflow without publishing, run **Actions → Release → Run workflow** with
`dry_run` enabled (the default). It prints the release state and checks the changelog.

## Development

No dependencies required:

```sh
node --test test/*.test.ts        # 64 tests, Node 22.18+ (native type stripping)
```

With type checking:

```sh
npm install
npm run typecheck
```

### Layout

```text
src/
  index.ts    server part (package identity)
  tui.ts      TUI part (entrypoint loaded by OpenCode)
  plugin.ts   wiring: events → focus probe → notification → click handler
  config.ts   options, environment variables, terminal detection
  desktop.ts  desktop-entry identity and its installation
  focus.ts    click-to-focus: process ancestry, KWin script, tmux selection
  notify.ts   argument building and click-aware notify-send execution
test/
  config.test.ts
  desktop.test.ts
  focus.test.ts
  notify.test.ts
  plugin.test.ts
```

`plugin.ts` imports nothing from the OpenCode SDK at runtime (types only), and process execution,
child processes and file access are injected, so the tests run on plain Node.

## Disabling

Add the id to `plugins` in `cli.json`, prefixed with `-`:

```jsonc
{
  "plugins": ["-kde.notify"],
}
```

To keep the notifications but stop making them clickable, set `focusOnClick: false` (or
`OPENCODE_KDE_NOTIFY_FOCUS_ON_CLICK=false`).

## Troubleshooting

- **Nothing shows up:** test D-Bus with
  `notify-send --app-name=OpenCode "test" "works?"`.
- **Clicking does nothing:** click-to-focus needs Plasma 6 and `gdbus`. Check the plugin log, make
  sure the bubble is still visible (expired history entries are not clickable), and probe KWin with
  `gdbus call --session --dest org.kde.KWin --object-path /Scripting --method org.kde.kwin.Scripting.isScriptLoaded opencode-kde-notify-test`.
  For an exact window in a multi-window terminal process, set `focusCommand`.
- **Bubble shows up, history stays empty:** check that
  `~/.local/share/applications/opencode.desktop` exists and that `plasmashell` has not restarted
  since the notification (the history is in memory only).
- **Plugin errors:** `~/.local/share/opencode/log/opencode.log` (look for `kde-notify`).
- **Plugin detection:** `opencode plugin list` should show `kde.notify`.
- **After plugin code or config changes:** quit the TUI and start it again (for example with
  `opencode --continue`). `/reload` only reconciles server-side plugins; it does not re-run the
  TUI plugin entrypoint, so code and option changes take effect only after a full restart.
- **Anything else:** open an issue at
  [github.com/tiagosantini/opencode-kde-notify/issues](https://github.com/tiagosantini/opencode-kde-notify/issues).

## Contributing

Issues and pull requests are welcome at
[github.com/tiagosantini/opencode-kde-notify](https://github.com/tiagosantini/opencode-kde-notify).

```sh
node --test test/*.test.ts      # tests
npm run format:check   # formatting
npm run typecheck      # types, after `npm install`
```

## License

MIT — see [LICENSE](./LICENSE).
