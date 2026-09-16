<div align="center">

# opencode status popup

**A second screen for your agent: a floating pill and a tray icon that show what OpenCode is doing right now.**

[![npm](https://img.shields.io/npm/v/opencode-status-popup?color=7ac0ff)](https://www.npmjs.com/package/opencode-status-popup)
[![license](https://img.shields.io/npm/l/opencode-status-popup?color=7ac0ff)](LICENSE)
[![platform](https://img.shields.io/badge/platform-windows-7ac0ff)](#install)
[![opencode](https://img.shields.io/badge/opencode-v2-7ac0ff)](https://opencode.ai/v2/docs/)

<img src="https://raw.githubusercontent.com/LucasInstra/opencode-status-popup/main/docs/typing.gif" width="380" alt="the pill typing opencode">
&nbsp;&nbsp;
<img src="https://raw.githubusercontent.com/LucasInstra/opencode-status-popup/main/docs/tray.gif" width="150" alt="the tray letter building itself pixel by pixel">

*the pill typing itself out while the agent works · the tray icon, the letter o building pixel by pixel*

</div>

---

An OpenCode V2 plugin that shows what the agent is doing on a second surface, outside the terminal.

While a session is thinking, a small always-on-top pill **types "opencode" letter by letter, on a loop** (`o` → `op` → `ope` → … → `opencode`), highlighting the newest letter. The same surface doubles as an attention light: it turns **amber** while a provider request is being retried, **red** when an execution failed, and **violet with a `?`** when OpenCode is waiting for you to allow something.

- **You are never left guessing** — is it working, retrying, stuck, or waiting for you?
- **The permission state comes first**: a session blocked on a permission decision outranks everything else, so you can be in another window and still notice.
- **Out of the way**: the pill has no border, no taskbar button, it never steals focus, it reopens where you left it and you can drag it anywhere. Prefer nothing on screen? Right click it and pick `Show in tray` (or ask *"put the popup in the tray"*).
- **Several projects, one indicator**: every OpenCode instance reports in and the popup shows the union.
- **Nothing to install twice**: the UI is a small PowerShell process that starts on demand and exits by itself; the plugin itself is plain TypeScript.

## States

| State | Window | Tray | Meaning |
|---|---|---|---|
| `idle` | `opencode`, white, slow breathing | the o, slow blink | nothing is running |
| `busy` | `opencode` typing itself, blue | the o drawing itself pixel by pixel, blue | the agent is working |
| `retry` | `opencode` typing itself, amber | the o drawing itself pixel by pixel, amber | a provider request failed and another attempt is scheduled |
| `error` | `opencode!`, red, breathing | the o, red, blink | an execution failed (kept for `errorHoldSeconds`, or until the session works again) |
| `permission` | `opencode?`, violet, faster breathing | the o, violet, fast blink | OpenCode is blocked waiting for a permission decision from you |

Priority is `permission` > `error` > `retry` > `busy` > `idle`, so a session waiting for permission is never hidden behind work happening in another session. In tray mode, a left click shows a balloon with the detail — `needs you: bash git push origin main`, `error: 429 provider.rate-limit` — and lists every project involved.

![the five states](https://raw.githubusercontent.com/LucasInstra/opencode-status-popup/main/docs/states.png)

Tray icons for the same states, the letter o building itself pixel by pixel while the agent works and blinking while it waits for you, at 8x and at real size:

![tray icons in every state](https://raw.githubusercontent.com/LucasInstra/opencode-status-popup/main/docs/tray.png)

The letter is drawn on a 6x7 pixel grid with a stroke one cell thick — a 2px line in a 20px tray slot, and it is taller than wide, like the glyph in the wordmark. Pixels appear clockwise from the top left, about 2 every 250ms, and a finished letter holds for half a second before it starts over. Every image in this README is rendered from the real popup, off screen: `npm run docs:images` for the stills and `npm run docs:gif` for the animations.

Two renderers, chosen with the `mode` option:

| | `window` (default) | `tray` |
|---|---|---|
| What you see | frameless translucent pill, top of the z-order | system tray icon with the letter o of the wordmark |
| Animation | the word types itself out | the o building itself pixel by pixel while it works, blinking while it waits |
| Cost | ~45–60 MB (PowerShell + WPF) | ~30–40 MB (PowerShell + WinForms) |
| Intrusiveness | floats above other windows, but no border, no taskbar button, does not steal focus | nothing covers the screen |
| Legibility of the word | fully readable | the word does not fit in a 16px slot, hence the letter o |

Both are a single detached PowerShell process that is started on demand, shared by every OpenCode instance, and exits by itself a few seconds after the last instance goes away.

## Install

Requires **OpenCode V2** and **Windows** (the host uses WPF/WinForms through PowerShell; `pwsh.exe` or `powershell.exe` from the machine).

### Package

```sh
opencode plugin add opencode-status-popup
```

By hand, in `opencode.json(c)`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "opencode-status-popup",
      "options": { "mode": "window" }
    }
  ]
}
```

### Local development copy

Any `.opencode/plugins/` directory in the location is discovered automatically, so a junction is enough:

```powershell
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.opencode\plugins" | Out-Null
New-Item -ItemType Junction -Path "$env:USERPROFILE\.opencode\plugins\opencode-status-popup" `
  -Target "C:\path\to\opencode-status-popup"
```

### From a checkout

Point `plugins` at the **directory**. A configured plugin path has to be a directory and is loaded through its `index.ts` — the `exports` field of the package is not what a directory plugin resolves to, which is why this repository ships a root `index.ts` that re-exports the real entry point:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["C:/path/to/opencode-status-popup"]
}
```

Do not configure the same plugin twice (say the junction in `~/.opencode/plugins` *and* a config entry): it would be loaded twice for that location.

## Options

All options are optional. Defaults shown.

| Option | Type | Default | Description |
|---|---|---|---|
| `enabled` | `boolean` | `true` | Turn the plugin off without uninstalling it. |
| `mode` | `"window" \| "tray"` | `"window"` | Which renderer to use. The `/popup-*` commands override it until `/popup-reset`. |
| `word` | `string` | `"opencode"` | Word that types itself out. Max 24 characters. |
| `typeMs` | `number` | `140` | Milliseconds per typed character (40–2000). |
| `position` | `"bottom-right" \| "bottom-left" \| "top-right" \| "top-left"` | `"bottom-right"` | Where the pill appears the first time. After you drag it, the position is remembered. |
| `freshSeconds` | `number` | `20` | How long presence data counts as fresh. |
| `idleSeconds` | `number` | `25` | How long the host waits without any live instance before exiting. |
| `errorHoldSeconds` | `number` | `90` | How long a failed execution keeps the pill red. Use `0` to keep it until the session works again. |
| `mark` | `boolean` | `false` | Draw the small o mark before the word in the pill. Off by default: the window is just the word, the mark belongs to the tray icon. |
| `shellPath` | `string` | `null` | Force a specific PowerShell executable. |

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "opencode-status-popup",
      "options": {
        "mode": "tray",
        "typeMs": 110,
        "position": "top-right"
      }
    }
  ]
}
```

## Interaction

- **Drag** the pill with the left mouse button. The position is remembered in `%TEMP%\opencode-status-popup\window.json` and checked every couple of seconds, so the pill reopens where you left it even if the host was killed, the mode was switched, or OpenCode restarted.
- **Right click** the pill for `Show in tray`, `Reset position` and `Close`. In `tray` mode, **right click** the icon for `Show as window` and `Close`, and **left click** it for a balloon with the current state.
- The window never appears in the taskbar or the Alt+Tab list, and it does not activate itself when it appears.
- The tray icon keeps a **constant tooltip** (`opencode-status-popup`) on purpose: Windows uses the tooltip as part of the icon identity and hides an icon whose tooltip changes. The live state is in the balloon you get on left click.

## Switching the renderer

Three ways, none of them needs a config edit or a restart. The choice is kept in the plugin storage, and the running host is replaced immediately, with the pill coming back where it was.

**Click it.** Right click the pill for `Show in tray`, or right click the tray icon for `Show as window`. The host asks the plugin for the change and it lands in about a second.

**Ask the agent.** The plugin registers a tool, so a prompt like *"put the popup in the tray"* works:

```
popup_mode({ mode: "window" | "tray" | "toggle" | "reset" })
```

**Commands.** `/popup-window`, `/popup-tray`, `/popup-toggle` and `/popup-reset` are registered on the server and work when a client dispatches them, for example:

```sh
opencode api post /api/session/<sessionID>/command --data '{"command":"popup-toggle","text":""}'
```

> Note: the command palette of the TUI lists the commands the *client* knows about. Commands contributed by a server plugin are reported by `GET /api/command` but are not part of that list yet, so they may not appear in the `/` autocomplete — the tool above is the path that works from a normal prompt today.

`reset` (or `/popup-reset`) forgets the choice and goes back to the `mode` of the config.

In tray mode the icon may start inside the hidden icons area (`^`) the first time — drag it onto the taskbar once and it stays there.

## How it works

```
OpenCode server
  └── plugin instance (one per location)
        ├── subscribes to the server event stream
        ├── tracks busy sessions      → session.status, session.execution.*, ...
        └── writes %TEMP%\opencode-status-popup\state\<project>.json every 3 s
                                              │
                        one PowerShell host ──┘  reads every presence file,
                        (named mutex per state dir) aggregates them and paints
```

- **Busy detection** uses the public event stream: `session.status` (`busy`/`retry`/`idle`), `session.execution.started/succeeded/failed/interrupted`, `session.idle`, streaming deltas and tool activity. Permission prompts come from `permission.asked` / `permission.replied`. Every event is matched against the plugin's own location, so a busy session in another project does not light up your pill.
- **Multiple instances** (several OpenCode windows, several projects on one server) each write their own presence file. The host shows the union and the tray tooltip lists the project names.
- **Crash safety**: presence files expire after `freshSeconds`, a session that sends no event for 45 minutes is dropped, and the host exits by itself when nothing is fresh. The plugin also restarts the host if it died or if the options changed.
- **Tray identity**: the icon is registered through `Shell_NotifyIcon` with a fixed GUID (see `host/TrayIcon.cs`), so the shell remembers the place you dragged it to across restarts, unlike the executable-plus-uid slot that every PowerShell tray icon shares.

## Development

```sh
npm install
npm run typecheck               # TypeScript
npm test                        # unit tests: config parsing and event tracking
$env:SMOKE=1; npm run smoke     # loads the plugin, drives it with events, spawns a real host
```

### See it without OpenCode

The preview writes the same presence files the plugin writes, so the host cannot tell the difference. This is the fastest way to iterate on the visuals:

| Command | What it does |
|---|---|
| `npm run preview:cycle` | the pill, cycling through every state: `busy` → `retry` → `error` → `permission` → `idle`, 6s each |
| `npm run preview:tray:cycle` | the tray icon, same cycle |
| `npm run preview` | the pill, staying in one state (`busy` by default) |
| `npm run preview:tray` | the tray icon, staying in one state |
| `npm run preview:stop` | stop the host and remove the fake presence file |

Ctrl+C also cleans up, and the tray icon may start inside the hidden icons area (`^`) the first time — drag it onto the taskbar once and it stays there.

Flags go after `--`:

```sh
npm run preview -- --state permission --detail "bash npm publish"
npm run preview -- --word oi --type 200
npm run preview:tray -- --keep
```

- `--mode window|tray` — which renderer.
- `--state busy|idle|retry|error|permission` — where the cycle starts, or the only state without `--watch`.
- `--watch` — cycle every 6 seconds.
- `--detail '<text>'` — what the balloon reports.
- `--word <text>` / `--type <ms>` — the word and the typing speed.
- `--seconds N` — stop by itself after N seconds.
- `--keep` — leave the host running when the preview exits.

`pwsh -File scripts/dev-host.ps1 -Mode window` runs the host in the foreground and writes everything it prints to `%TEMP%\opencode-status-popup\test-window.out`, which is the quickest way to read a script error.

### Debugging inside OpenCode

Set `OPENCODE_STATUS_POPUP_DEBUG=1` before starting OpenCode and the plugin traces every event it accepts, with the phase it produced and whether the event belonged to this location, to `%TEMP%\opencode-status-popup\plugin.log`:

```powershell
$env:OPENCODE_STATUS_POPUP_DEBUG = "1"; opencode
```

The host side logs to `%TEMP%\opencode-status-popup\host.log` (see below).

`npm run docs:images` re-renders `docs/*.png` from the real XAML (off screen, so no screen capture and no desktop in the images) and dumps the raw frames; `npm run docs:gif` turns those frames into `docs/typing.gif` and `docs/tray.gif`.

The host logs to `%TEMP%\opencode-status-popup\host.log`, which is the first place to look when the popup does not show up:

- `start mode=... pid=...` — the host started.
- `another host is already running, exiting` — the single instance guard did its job.
- `took over an abandoned host` — the previous host was killed hard; the new one recovered the slot.

## Notes and limitations

- Windows only. On other platforms the plugin loads and does nothing.
- The host is a separate process, so the popup outlives a `kill` of the OpenCode server for at most `idleSeconds`.
- `mode: "window"` uses WPF through PowerShell. If a machine blocks PowerShell or WPF, use `shellPath` to point at a working interpreter, or switch to `mode: "tray"`.
