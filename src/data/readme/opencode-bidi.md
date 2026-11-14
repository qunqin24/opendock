# opencode-bidi

Firefox browser automation for OpenCode, over WebDriver BiDi.

[![npm](https://img.shields.io/npm/v/opencode-bidi?color=2563eb)](https://www.npmjs.com/package/opencode-bidi)
[![CI](https://github.com/rimar/opencode-bidi/actions/workflows/ci.yml/badge.svg)](https://github.com/rimar/opencode-bidi/actions/workflows/ci.yml)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

`opencode-bidi` is an [OpenCode](https://opencode.ai) plugin that connects to
Firefox through WebDriver BiDi. If Firefox is already running with remote
debugging on, the plugin attaches to it and uses that session: cookies, logins,
open tabs. If it isn't, the plugin can launch its own copy with a separate
profile, so it leaves your normal browser alone. There's no extension, no
Playwright, and no Selenium.

Navigating, taking snapshots, filling a form, and clicking through it:

[![Filling a form with opencode-bidi](https://raw.githubusercontent.com/rimar/opencode-bidi/main/docs/demo.gif)](https://raw.githubusercontent.com/rimar/opencode-bidi/main/docs/demo.gif)

## Why

Firefox stopped shipping CDP, so most Chrome DevTools-based automation can't
talk to it. This plugin uses the protocol Firefox does expose. One WebSocket to
the BiDi endpoint and plain JavaScript in the page is enough. There's no driver
to install and no extension to keep updated.

It also keeps the tool surface small. The snapshot gives the agent numbered refs
(`e0`, `e1`, ...) that `firefox_click` and `firefox_fill` accept, which tends to
work better than exposing a large automation API.

## Requirements

- Firefox 129 or newer. WebDriver BiDi is on by default starting with 129.
- OpenCode 2.x.
- Linux, macOS, or Windows. I've only tested Linux. The macOS and Windows paths
  use the standard Firefox install locations and `taskkill` for restarts, but
  nobody has run them on a real machine yet. If you do, please open an issue and
  tell me what broke.

## Install

### OpenCode CLI

```sh
opencode plugin add opencode-bidi
```

That installs the package and adds it to your global
`~/.config/opencode/opencode.jsonc`. You can pin a release with
`opencode plugin add opencode-bidi@0.1.6`.

Other commands:

```sh
opencode plugin list
opencode plugin check
opencode plugin update
opencode plugin remove opencode-bidi
```

`plugin add` only writes global config. For a project-local install, edit the
project's `opencode.jsonc` instead.

If you previously copied `firefox-bidi.ts` into `~/.config/opencode/plugins/`,
remove it after installing the package. Both would register the same
`firefox.*` tools.

### Manual config

Add the plugin to `opencode.jsonc`, global or project:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-bidi"]
}
```

OpenCode installs the package on its next run. To use a local checkout during
development:

```jsonc
{
  "plugins": ["/absolute/path/to/opencode-bidi"]
}
```

Then pick how Firefox starts.

**Let the agent launch it.** Run `firefox_start`. By default it uses an isolated
profile at `~/.local/share/opencode-bidi/profile` on Linux. That profile can run
next to your normal Firefox and doesn't share anything with your personal
session.

**Attach to your real session.** Start Firefox yourself with the port open:

```sh
firefox --remote-debugging-port 9222
```

The plugin attaches to whatever Firefox owns that port, using whatever profile
it was started with. One catch: if Firefox is already open without the flag, the
new process can hand off to the existing instance and the port never opens. Quit
Firefox first, or start a separate profile.

## Configuration

Configure the plugin with the object form in `opencode.jsonc`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "opencode-bidi",
      "options": {
        "port": 9222,
        "binary": "/usr/lib/firefox/firefox",
        "profile": "/home/me/.mozilla/firefox/abc.agent",
        "defaultProfile": false
      }
    }
  ]
}
```

| Option | Environment fallback | Default | Meaning |
|---|---|---|---|
| `port` | `FIREFOX_BIDI_PORT` | `9222` | Debugging port the plugin connects to |
| `binary` | `FIREFOX_BIN` | auto-detected | Firefox executable |
| `profile` | `FIREFOX_PROFILE` | isolated profile | `-profile` directory used when the plugin launches Firefox |
| `defaultProfile` | `FIREFOX_DEFAULT_PROFILE` | `false` | Launch with your normal Firefox profile instead of an isolated one |

Options win when both are set. The environment variables are mostly there for
CI and shell wrappers. Settings are read when the plugin loads, so save the
config and reload the plugin (or run `/reload`) after changing them.

### Which profile gets used

This only matters when the plugin launches Firefox (`firefox_start`,
`firefox_restart`). If Firefox already has the debugging port open, the plugin
attaches to that instance and uses whatever profile it was started with.

The plugin picks a profile in this order:

1. **`profile: "/path/to/dir"`** uses that profile. You can create one with
   `firefox -P` → **Create Profile...**, then find its **Root Directory** in
   `about:profiles`. The directory is created if it doesn't exist.
2. **`defaultProfile: true`** launches without `-profile`, so Firefox uses your
   normal profile. That includes every cookie, logged-in account, history entry,
   and extension. The agent can act as you anywhere you're signed in. It also
   runs into Firefox's single-instance rule: if your normal Firefox is already
   open, the launch hands off to it and the port never opens. `firefox_restart`
   may have to kill every Firefox process because it can't tell its own instance
   apart.
3. **Neither, which is the default.** The plugin creates and manages an isolated
   profile:

   | Platform | Location |
   |---|---|
   | Linux | `$XDG_DATA_HOME/opencode-bidi/profile` (default `~/.local/share/...`) |
   | Linux (snap Firefox) | `~/snap/firefox/common/opencode-bidi/profile` |
   | macOS | `~/Library/Application Support/opencode-bidi/profile` |
   | Windows | `%LOCALAPPDATA%\opencode-bidi\profile` |

   It starts with no cookies or logins and runs alongside your normal Firefox.
   It persists between launches, so sites you sign in to there stay signed in.
   It's a separate identity, not a sandbox. The agent controls everything inside
   it.

If you start Firefox yourself, pass the profile on the command line:

```sh
firefox -profile /path/to/profile --remote-debugging-port 9222
```

## Tools

All tools are in the `firefox` namespace and are also available in Code Mode as
`tools.firefox.*`.

| Tool | What it does |
|---|---|
| `firefox_status` | Port and session health check. Attaches if needed. |
| `firefox_start` | Launch Firefox with debugging if it isn't already running. Uses an isolated profile by default. |
| `firefox_restart` | Stop and relaunch the Firefox it launched, reopening the current page. |
| `firefox_navigate` | Open a URL, optionally in a new tab. |
| `firefox_snapshot` | URL, title, numbered interactive elements (`e0`, `e1`, ...), and visible text. |
| `firefox_click` | Click by ref, CSS selector, or visible text / aria-label. |
| `firefox_fill` | Fill an input, textarea, or select. Can submit with Enter. |
| `firefox_press` | Enter, Tab, Escape, arrows, PageDown, and so on. |
| `firefox_eval` | Evaluate JavaScript in the page and return JSON. |
| `firefox_screenshot` | Save a PNG to disk. Open it with the `read` tool. |
| `firefox_tabs` | List, switch, or close tabs. |
| `firefox_bidi` | Escape hatch for any raw BiDi command. |
| `firefox_mask_automation` | Hide `navigator.webdriver` for sites that block automation. |

A typical run looks like this:

```text
firefox_navigate → firefox_snapshot → firefox_click / firefox_fill → firefox_snapshot
```

Take a fresh snapshot before clicking by ref. Refs point at the page state from
the last snapshot.

## Security

Attaching gives the agent the same reach as your browsing session: cookies,
logged-in accounts, and any site you can open. A malicious or compromised page
can try to prompt-inject the agent into acting on your behalf.

- The default launch mode is an isolated profile with no logins. You only expose
  your real session when you attach to your running Firefox, or when you opt in
  with `defaultProfile: true` (or `FIREFOX_DEFAULT_PROFILE=1`).
- Prefer sites you trust, and review actions on sensitive accounts.
- `firefox_mask_automation` exists because some legitimate sites (airlines,
  banks) block automated browsers outright. It changes only
  `navigator.webdriver` for the current session. Use it only where you would
  browse manually.

An isolated profile limits the blast radius of injection, but it isn't a
sandbox. The agent still controls everything inside that browser, and it can
reach any site you sign in to there.

Please report security issues privately through GitHub's **Security → Report a
vulnerability** flow, not a public issue. See [SECURITY.md](SECURITY.md).

## Use responsibly

This plugin drives *your* Firefox, with *your* logins. Whether automation is
allowed is up to each site. Check its terms before pointing this at an account
or service that forbids it.

`firefox_mask_automation` is off by default. It makes an automated session look
like a normal browser, which is a gray area: some sites break for no good
reason, and that's why it exists. If you use it to get around a site's rules,
that's your call and your responsibility, not the plugin's.

Firefox is a trademark of Mozilla.org in the US and other countries. This
project is not affiliated with, endorsed by, or sponsored by Mozilla.

## Notes and limitations

- Firefox allows one BiDi session at a time, and it doesn't release the session
  when a client disconnects. If OpenCode is killed hard, the next connection
  fails with `Maximum number of active sessions`. `firefox_restart` clears it
  when the plugin launched the browser. If you started Firefox yourself, quit it
  and relaunch with the debugging port.
- `firefox_restart` stops the Firefox the plugin launched, matched by profile, so
  your normal browser keeps running. With `defaultProfile: true` there's no
  profile to match, so it falls back to killing every Firefox process
  (`pkill -x firefox` / `taskkill /IM firefox.exe /F`). Unsaved tabs in that
  instance are lost, so use it only to recover.
- There's no network interception, download handling, or multi-browser
  abstraction. It's a small Firefox driver and not much else.
- Firefox stopped shipping CDP, so Chrome DevTools-based tooling can't attach to
  the debugging port.

## How it works

Firefox exposes WebDriver BiDi at `ws://127.0.0.1:9222/session`. The plugin opens
one WebSocket, creates a session, and sends commands like
`browsingContext.navigate`, `script.evaluate`, `input.performActions`, and
`browsingContext.captureScreenshot`. Snapshot, click, and fill are JavaScript
evaluated in the page, which is why there's nothing else to install.

## Development

```sh
pnpm install
pnpm check   # typecheck + tests
```

To try a local checkout in OpenCode, point `plugins` at the repository directory
(see [Install](#install)) or link it with `npm link`.

## License

MIT. See [LICENSE](LICENSE).

This plugin is not affiliated with the OpenCode project.
