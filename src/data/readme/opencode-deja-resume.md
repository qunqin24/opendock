# opencode-deja-resume

Open a **specific session tab** in the [OpenCode](https://opencode.ai) desktop app
from a terminal, a script, or [`deja resume`](https://github.com/vshulcz/deja-vu).

The desktop app already remembers the last session it showed, but it has no
session deep link and no `-s` / `--session` flag. This plugin adds the missing
piece: an external process drops a small request file, the plugin's main process
picks it up, and its window entry calls the official
`ctx.tabs.open({ server, id }, { focus: true })` API.

```
deja resume ses_xxx --exec
        │
        ▼
opencode -s ses_xxx          (shim)
        │  writes ~/.local/share/opencode/deja-resume.json
        │  opens / focuses the desktop app
        ▼
deja-resume GUI plugin
        │  ctx.tabs.open(..., { focus: true })
        ▼
OpenCode desktop → the session's tab is open and active
```

## Requirements

- OpenCode Desktop **2.3.0 or newer** (the `ctx.tabs` plugin API).
- The plugin is configured in the **global** OpenCode config, because the
  desktop app loads GUIs from the server it runs.

## Install the plugin

### From npm (recommended)

```sh
opencode plugin add opencode-deja-resume
```

### From GitHub

```sh
opencode plugin add github:AndrewGoal/opencode-deja-resume
```

### From a clone (local plugin, auto-discovered)

```sh
git clone https://github.com/AndrewGoal/opencode-deja-resume \
  ~/.config/opencode/plugin/opencode-deja-resume
```

OpenCode discovers `~/.config/opencode/plugin/*` automatically. Restart the
desktop app once, then check **Settings → Extensions → Plugins** for
`opencode-deja-resume`.

## Install a shim

`deja resume <id> --exec` runs `opencode -s <id>`. The shim must be found
**before** any other `opencode` on `PATH`:

| OS | Copy | To |
| --- | --- | --- |
| macOS | `shims/opencode-macos.sh` | `/usr/local/bin/opencode` |
| Linux | `shims/opencode-linux.sh` | `/usr/local/bin/opencode` |
| Windows | `shims/opencode-windows.cmd` | a directory before your existing `opencode.exe` |

```sh
# macOS / Linux
sudo install -m 755 shims/opencode-macos.sh /usr/local/bin/opencode
# Linux: use shims/opencode-linux.sh instead
```

On Linux with mise (or another version manager) activating its own `opencode`
ahead of `/usr/local/bin`, put the shim in a directory you prepend in your
shell rc. mise rebuilds its command wrappers, so a symlink inside its own
directory does not survive:

```sh
mkdir -p ~/.local/share/opencode-shim/bin
ln -sf /usr/local/bin/opencode ~/.local/share/opencode-shim/bin/opencode
echo 'export PATH="$HOME/.local/share/opencode-shim/bin:$PATH"' >> ~/.bashrc
```

Then open a new terminal or run `source ~/.bashrc`.

On Windows, copy `shims/opencode-windows.cmd` to `%USERPROFILE%\bin\opencode.cmd`
and make sure `%USERPROFILE%\bin` comes before `%USERPROFILE%\scoop\shims`
(or wherever the real `opencode.exe` lives) in the user `PATH`.

The shim preserves the normal CLI: anything that is not a session id goes to
the original `opencode` / `opencode-cli`, so the TUI keeps working.

## Use

```sh
deja resume ses_xxx --exec
# or directly
opencode -s ses_xxx
opencode --session ses_xxx
opencode ses_xxx
```

The desktop app opens (or comes to the front) with that session's tab active.
The shim also prints the exact `opencode -s <id>` line it received, so you can
copy it for later or reproduce the resume without `deja`.

> `deja resume ses_xxx` without `--exec` only prints the command. That is deja's
> own behavior; add `--exec` to run it.

## How it works

1. The shim writes a request to
   `~/.local/share/opencode/deja-resume.json` (XDG-aware):
   ```json
   { "session": "ses_xxx", "time": 1795664256000 }
   ```
2. The plugin's **main** entry polls that file (desktop main process, Node
   access) and finds the focused window.
3. It calls `webContents.executeJavaScript` to run the window entry.
4. The window entry calls
   `ctx.tabs.open({ server: builtin.id, id: session }, { focus: true })` and
   focuses the tab again after the app's own restore logic runs.
5. The request is deleted. Requests older than two minutes are ignored, so a
   request that could not be handled never fires much later.

No network listener, no extra port, no patched app files. The request file is
owned by the user and only opens a session the local server already knows.

## Compatibility

- macOS: verified with OpenCode Desktop 2.4.2.
- Linux: verified with OpenCode Desktop 2.3.0 on Hyprland/Wayland. The shim
  starts the app with `--ozone-platform=wayland` on a Wayland session, so a
  launch from SSH, a script, or a non-graphical shell also works.
- Windows: verified at the plugin level with OpenCode Desktop 2.3.2; the shim
  is included but Windows has more install layouts, so adjust the paths in
  `shims/opencode-windows.cmd` if needed.

## Uninstall

```sh
opencode plugin remove opencode-deja-resume
# local clone: remove ~/.config/opencode/plugin/opencode-deja-resume
# and restore /usr/local/bin/opencode (or delete the Windows shim)
```

## Notes

- The plugin only opens tabs on the desktop app's **own** (builtin) server.
  That is the server `deja` indexes and the one `opencode -s` resumes.
- If you use a different launcher, writing the request file directly is enough;
  the shims are just convenience wrappers.
- `deja` lives at <https://github.com/vshulcz/deja-vu>.

## License

MIT
