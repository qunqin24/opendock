<div align="center">

# opencode status popup

**A second screen for your agent: a floating pill or a tray icon that shows what OpenCode is doing right now.**

[![npm](https://img.shields.io/npm/v/opencode-status-popup?color=7ac0ff)](https://www.npmjs.com/package/opencode-status-popup)
[![license](https://img.shields.io/npm/l/opencode-status-popup?color=7ac0ff)](LICENSE)
[![platform](https://img.shields.io/badge/platform-windows-7ac0ff)](#requirements)
[![opencode](https://img.shields.io/badge/opencode-v2-7ac0ff)](https://opencode.ai/v2/docs/)

<img src="https://raw.githubusercontent.com/LucasInstra/opencode-status-popup/main/docs/typing.gif" width="380" alt="the pill typing opencode">
&nbsp;&nbsp;
<img src="https://raw.githubusercontent.com/LucasInstra/opencode-status-popup/main/docs/tray.gif" width="150" alt="the tray letter building itself pixel by pixel">

*the pill typing itself out while the agent works · the tray icon, the letter o building pixel by pixel*

</div>

---

OpenCode can work for minutes in a terminal you are not looking at. This plugin puts a small status light outside that terminal, so you can tell at a glance whether the agent is working, stuck, retrying, or waiting for you.

- **Working?** The pill types `opencode` letter by letter, in blue; the tray icon draws the o pixel by pixel.
- **Something failed?** Amber while a provider request is retried, red with an `!` when an execution failed.
- **Does it need me?** Violet with a `?` when OpenCode is blocked on a permission decision or on a question — the one state you should never miss.
- **Several projects, one indicator:** every OpenCode instance reports in, and the popup shows the union.

It stays out of the way: no window frame, no taskbar button, it never steals focus, it reopens where you left it, and you can drag it anywhere. If you would rather have nothing on screen, use the tray icon.

## Quick start

```sh
opencode plugin add opencode-status-popup
```

The popup appears as soon as OpenCode loads the plugin — idle until a session starts working. To use the tray icon instead, or to tweak anything, add an options block to `opencode.json(c)`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "opencode-status-popup",
      "options": { "mode": "tray" }
    }
  ]
}
```

### Requirements

- **OpenCode V2**
- **Windows**: the popup is a small PowerShell process (WPF for the pill, WinForms for the tray icon) that uses the `pwsh.exe` or `powershell.exe` already on the machine.

## The five states

| State | Pill | Tray | Meaning |
|---|---|---|---|
| `idle` | `opencode`, white, slow breathing | the o, slow blink | nothing is running |
| `busy` | `opencode` typing itself, blue | the o drawing itself pixel by pixel, blue | the agent is working |
| `retry` | `opencode` typing itself, amber | the o drawing itself pixel by pixel, amber | a provider request failed and another attempt is scheduled |
| `error` | `opencode!`, red, breathing | the o, red, blink | an execution failed (kept for `errorHoldSeconds`, or until the session works again) |
| `permission` | `opencode?`, violet, faster breathing | the o, violet, fast blink | OpenCode is waiting for a permission decision or an answer from you |

Priority is `permission` > `error` > `retry` > `busy` > `idle`, so a session waiting for you is never hidden behind work happening in another session.

In tray mode, `Show details` (right click) opens a balloon with the live detail — `needs you: bash git push origin main`, `needs you: Put the popup in the tray?`, `error: 429 provider.rate-limit` — and lists the projects involved (shortened to fit the balloon).

![the five states](https://raw.githubusercontent.com/LucasInstra/opencode-status-popup/main/docs/states.png)

Tray icons for the same states, at 8x and at real size:

![tray icons in every state](https://raw.githubusercontent.com/LucasInstra/opencode-status-popup/main/docs/tray.png)

The letter is drawn on a 6x7 pixel grid, one cell of stroke thick, clockwise from the top left, about 2 pixels every 250 ms; a finished letter holds for half a second and starts over. Every image in this README is rendered from the real popup, off screen: `npm run docs:images` for the stills and `npm run docs:gif` for the animations.

## Window or tray?

Two renderers, chosen with the `mode` option:

| | `window` (default) | `tray` |
|---|---|---|
| What you see | frameless translucent pill, top of the z-order | system tray icon with the letter o of the wordmark |
| Animation | the word types itself out | the o building itself pixel by pixel while it works, blinking while it waits |
| Cost | ~45–60 MB (PowerShell + WPF) | ~30–40 MB (PowerShell + WinForms) |
| Intrusiveness | floats above other windows, but no window frame, no taskbar button, does not steal focus | nothing covers the screen |
| Legibility of the word | fully readable | the word does not fit in a 16px slot, hence the letter o |

Both are the same single PowerShell process: started on demand, shared by every OpenCode instance, and gone by itself `idleSeconds` after the last instance goes away (25 seconds by default).

### Switching anytime

None of these needs a config edit or a restart, and the pill comes back where it was.

- **Click it.** Right click the pill for `Show in tray`; right click the tray icon for `Show as window`. The change lands in about a second.
- **Ask the agent.** A prompt like *"put the popup in the tray"* works through the `popup_mode` tool:

```
popup_mode({ mode: "window" | "tray" | "toggle" | "reset" })
```

- **Commands.** `/popup-window`, `/popup-tray`, `/popup-toggle`, `/popup-reset` and `/popup-static` work from the command palette (`ctrl+p`) and from the `/` autocomplete. The palette entries run in the client and answer immediately; the slash commands run on the server, which is also what makes them work through the API:

```sh
opencode api post /api/session/<sessionID>/command --data '{"name":"popup-toggle","text":""}'
```

- **The tray idle** has its own toggle: `/popup-static` (palette: `Popup: tray idle static`) flips `trayIdleStatic` between the static letter and the blinking one.
- **`reset`** (`/popup-reset`) forgets the runtime choices — mode and tray idle — and goes back to the config.

The choice is kept in the plugin storage and mirrored to a file next to the presence data, so every instance agrees.

In tray mode the icon may start inside the hidden icons area (`^`) the first time — drag it onto the taskbar once and it stays there.

## Interaction

- **Left click** the pill or the tray icon to bring the OpenCode terminal forward (Windows Terminal, VS Code, WezTerm, the desktop app), restoring it when minimized. If no window is found, the tray icon shows the details balloon and the pill just logs it.
- **Drag** the pill with the left mouse button. A press only counts as a click when it does not move past the system drag distance, so the same button does both. The position is remembered in `%TEMP%\opencode-status-popup\window.json`, so the pill reopens where you left it even after a kill, a mode switch or an OpenCode restart.
- **Right click** the pill for `Show in tray`, `Reset position` and `Close`; right click the tray icon for `Show as window`, `Show details` and `Close`.
- The window never appears in the taskbar or the Alt+Tab list, and it does not activate itself when it appears.
- The tray tooltip is always `opencode-status-popup` on purpose: Windows uses the tooltip as part of the icon identity and hides an icon whose tooltip changes. The live state is in the `Show details` balloon.

## Options

All options are optional; the defaults are shown.

| Option | Type | Default | Description |
|---|---|---|---|
| `enabled` | `boolean` | `true` | Turn the plugin off without uninstalling it. |
| `mode` | `"window" \| "tray"` | `"window"` | Which renderer to use. The renderer commands (`/popup-window`, `/popup-tray`, `/popup-toggle`) override it until `/popup-reset`. |
| `word` | `string` | `"opencode"` | Word that types itself out. Max 24 characters. |
| `typeMs` | `number` | `140` | Milliseconds per typed character in the pill (40–2000). The tray icon ignores it: its tick is a fixed 250 ms. |
| `position` | `"bottom-right" \| "bottom-left" \| "top-right" \| "top-left"` | `"bottom-right"` | Where the pill is placed on its first show, and where `Reset position` sends it back to. Dragging is remembered separately; changing the option applies on the next placement. |
| `freshSeconds` | `number` | `20` | How long presence data counts as fresh (5–600). |
| `idleSeconds` | `number` | `25` | How long the host waits without any live instance before exiting (5–3600). |
| `errorHoldSeconds` | `number` | `90` | How long a failed execution keeps the pill red (0–3600). Use `0` to keep it until the session works again. |
| `mark` | `boolean` | `false` | Draw the small o mark before the word in the pill. Off by default: the window is just the word, the mark belongs to the tray icon. |
| `trayIdleStatic` | `boolean` | `false` | Keep the tray icon still while idle: the full blue o, no blink. The working, retry, error and permission states keep their animations. `/popup-static` toggles it at runtime. |
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

Options are read when the plugin sets up. OpenCode reloads plugins when a watched config file changes (a local dependency outside the watched directories may still need an OpenCode restart). What a change does to a running host:

| Option | Effect |
|---|---|
| `word`, `freshSeconds`, `idleSeconds` | **restart the host** within a few seconds, because it renders them at launch |
| `typeMs`, `mark` | restart a `window` host, which renders them; the tray ignores both |
| `trayIdleStatic` | restart a `tray` host, which renders it; the `window` host ignores it. Once `/popup-static` has been used, the runtime choice overrides the option until `reset` |
| `position` | **does not restart it**: the corner is resolved when the pill is placed (first show, or `Reset position`), so a change applies there and never moves a pill you already dragged |
| `mode` | replaced immediately by the renderer commands (`/popup-window`, `/popup-tray`, `/popup-toggle`); the option is only the fallback after `reset` |
| `shellPath` | applies the next time a host starts; a live host keeps the interpreter it was launched with |
| `enabled`, `errorHoldSeconds` | need no host restart: `enabled` loads or unloads the plugin, and `errorHoldSeconds` is read by the plugin |

## How it works

```
OpenCode server
  └── plugin instance (one per location)
        ├── subscribes to the server event stream
        ├── tracks busy sessions      → session.status, session.execution.*, ...
        └── writes %TEMP%\opencode-status-popup\state\<project>-<hash>.json every 3 s
                                              │
                        one PowerShell host ──┘  reads every presence file,
                        (named mutex per state dir) aggregates them and paints
```

- **Busy detection** uses the public event stream: `session.status` (`busy`/`retry`/`idle`), `session.execution.started/succeeded/failed/interrupted`, `session.idle`, streaming deltas and tool activity. Prompts waiting for you come from `permission.asked` / `permission.replied` and from `form.created` / `form.replied` / `form.cancelled` — OpenCode 2 asks questions through a form, with the question text as the detail. Located events are matched against the plugin's own location, so a busy session in another project does not light up your pill; events that carry no location are accepted.
- **Multiple instances** (several OpenCode windows, several projects on one server) each write their own presence file. The host shows the union and the `Show details` balloon lists the project names.
- **State directory**: next to the presence files it holds `host.json` (the running host: pid, renderer and the settings it renders, rewritten as a heartbeat), `mode.json` (the renderer chosen at runtime, shared by every instance), `mode.request` (a switch waiting for the next server tick), `idle-static.json` (the tray idle chosen at runtime, shared by every instance), `idle-static.request` (a toggle waiting for the next server tick), `position.json` (the configured corner the host applies when it places the pill), `window.json` (where the pill was last placed) and the two logs, `plugin.log` and `host.log` — each rotates to a `.1` copy at its cap (512 KiB and 256 KiB), so the newest lines are the ones kept. The preview harness adds a fake `state\preview.json` of its own while it runs.
- **Crash safety**: presence files expire after `freshSeconds`, a session that sends no event for 45 minutes is dropped, and the host exits by itself when nothing is fresh. The plugin also restarts the host if it died or if the options changed. Files a killed instance left behind are reaped on the next setup and again before the last instance decides to stop the host.
- **Tray identity**: the icon is registered through `Shell_NotifyIcon` with a fixed GUID (see `host/TrayIcon.cs`), so the shell remembers the place you dragged it to across restarts, unlike the executable-plus-uid slot that every PowerShell tray icon shares.

## Development

```sh
npm install
npm run typecheck               # TypeScript
npm test                        # unit tests: config parsing and event tracking
$env:SMOKE=1; npm run smoke     # loads the plugin, drives it with events, spawns a real host
```

### Install from a checkout

Point `plugins` at the **directory**. A configured plugin path has to be a directory and is loaded through its `index.ts` — the `exports` field of the package is not what a directory plugin resolves to, which is why this repository ships a root `index.ts` that re-exports the real entry point:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["C:/path/to/opencode-status-popup"]
}
```

Any `.opencode/plugins/` directory in the location is discovered automatically, so a junction is enough:

```powershell
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.opencode\plugins" | Out-Null
New-Item -ItemType Junction -Path "$env:USERPROFILE\.opencode\plugins\opencode-status-popup" `
  -Target "C:\path\to\opencode-status-popup"
```

Do not configure the same plugin twice (say the junction in `~/.opencode/plugins` *and* a config entry): it would be loaded twice for that location.

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
- `--idle-static` — pin the tray idle icon: the full blue o, no blink.
- `--seconds N` — stop by itself after N seconds.
- `--keep` — leave the host running when the preview exits (Ctrl+C and `--seconds` included); `preview:stop` still stops it.

`pwsh -File scripts/dev-host.ps1 -Mode window` runs the host in the foreground and writes everything it prints to `%TEMP%\opencode-status-popup\test-<mode>.out` (`test-window.out`, or `test-tray.out` for `-Mode tray`), which is the quickest way to read a script error.

### Debugging inside OpenCode

Set `OPENCODE_STATUS_POPUP_DEBUG=1` before starting OpenCode and the plugin traces every event it accepts, with the phase it produced and whether the event belonged to this location, to `%TEMP%\opencode-status-popup\plugin.log`:

```powershell
$env:OPENCODE_STATUS_POPUP_DEBUG = "1"; opencode
```

`OPENCODE_STATUS_POPUP_DIR` points both entrypoints at another state directory — the test suite uses it to keep its runs isolated from the popup you are actually using.

The host logs to `%TEMP%\opencode-status-popup\host.log`, the first place to look when the popup does not show up:

- `start mode=... pid=...` — the host started.
- `another host is already running, exiting` — the single instance guard did its job.
- `took over an abandoned host` — the previous host was killed hard; the new one recovered the slot.

`npm run docs:images` re-renders `docs/*.png` from the real XAML (off screen, so no screen capture and no desktop in the images) and dumps the raw frames; `npm run docs:gif` turns those frames into `docs/typing.gif` and `docs/tray.gif`.

## Notes and limitations

- Windows only. On other platforms the plugin loads and does nothing.
- The host is a separate process, so the popup outlives a `kill` of the OpenCode server for up to `freshSeconds` + `idleSeconds` (about 45 seconds with the defaults): the presence file has to go stale before the idle countdown starts.
- `mode: "window"` uses WPF through PowerShell. If a machine blocks PowerShell or WPF, use `shellPath` to point at a working interpreter, or switch to `mode: "tray"`.
