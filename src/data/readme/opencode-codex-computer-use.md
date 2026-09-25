<h1 align="center">opencode-codex-computer-use</h1>

<p align="center">
  <a href="https://www.npmjs.com/package/opencode-codex-computer-use"><img alt="npm" src="https://img.shields.io/npm/v/opencode-codex-computer-use?color=8b5cf6&label=npm"></a>
  <a href="https://github.com/malhashemi/opencode-codex-computer-use/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/malhashemi/opencode-codex-computer-use/actions/workflows/ci.yml/badge.svg"></a>
  <a href="LICENSE"><img alt="MIT license" src="https://img.shields.io/badge/license-MIT-22d3ee"></a>
  <img alt="OpenCode 2.0.16 or newer" src="https://img.shields.io/badge/OpenCode-%E2%89%A5%202.0.16-4ade80">
  <img alt="macOS; Windows and Linux experimental" src="https://img.shields.io/badge/platforms-macOS%20%C2%B7%20Windows%20%26%20Linux%20experimental-64748b">
</p>

<p align="center">
  <b>Let OpenCode operate your desktop apps and Chrome tabs with the Codex Computer Use engine already on your machine.</b><br>
  Your OpenCode model decides; Codex's engine clicks, types and reads the screen.
</p>

<p align="center">
  <a href="#install">Install</a> ·
  <a href="#usage">Usage</a> ·
  <a href="#configuration">Configuration</a> ·
  <a href="#how-it-works">How it works</a> ·
  <a href="CONTRIBUTING.md">Contributing</a>
</p>

---

The ChatGPT and Codex desktop apps ship a Computer Use engine that reads apps through the accessibility tree, acts in
the background without taking over your mouse, and falls back to screenshots when it has to. This plugin gives your
OpenCode agent that same engine. It does not reimplement, copy, patch or bundle anything from OpenAI: it talks to Codex
through Codex's public [app-server protocol](https://github.com/openai/codex/tree/main/codex-rs/app-server-protocol),
and Codex runs its own Computer Use plugin as it does for itself. No OpenAI model is called.

- **Native apps and Chrome tabs.** One tool covers both: Finder, Notes, Settings or any other app, and the pages in your
  Chrome through the ChatGPT for Chrome extension.
- **Background operation.** Clicks and keys go to the target app, so you can keep working. Apps that are not running
  launch in the background.
- **Nothing piles up in Codex.** Each OpenCode session gets a throwaway Codex thread that is never saved and never
  appears in your ChatGPT or Codex history.
- **Works without vision.** Screenshots can arrive as on-device OCR text with click coordinates, for models that cannot
  read images.
- **Waits for you.** The agent can hand a page over for a login or a CAPTCHA and pick it up again whenever you are
  back.

> Not affiliated with or endorsed by OpenAI. Computer Use is a proprietary OpenAI component; using it from a
> third-party agent is your decision. Check OpenAI's terms for your account.

## Requirements

Nothing in Codex has to be configured by hand. You need a working Computer Use install:

| Requirement                                                                                                       | Why                                                                                                                                           |
| ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| [OpenCode](https://opencode.ai) 2.0.16 or newer                                                                   | The plugin API this plugin uses.                                                                                                              |
| **Mac with Apple Silicon** running **macOS 14.4 or later**                                                        | OpenAI ships the Computer Use helper for arm64 only, and 14.4 is its minimum.                                                                 |
| **ChatGPT desktop app** (or the Codex desktop app) in `/Applications`, **signed in**                              | It ships the `codex` binary and the Computer Use runtime this plugin uses. Computer Use must be available for your account and region.        |
| **Computer Use turned on** in the app (Settings → Computer Use)                                                   | This installs `~/.codex/computer-use/Codex Computer Use.app` and registers Codex's `cua_repl` runtime in `~/.codex`.                          |
| **Accessibility** and **Screen Recording** granted to _Codex Computer Use_ (System Settings → Privacy & Security) | macOS asks the first time Computer Use runs. Easiest: ask Codex to do one small Computer Use task first.                                      |
| _Optional, for Chrome tabs:_ the **ChatGPT for Chrome** extension, connected                                      | Set up from the ChatGPT/Codex app (Chrome plugin). Without it, native apps still work and the agent can only drive Chrome as an ordinary app. |

The ChatGPT app does not need to be open while you use OpenCode.

**Windows and Linux (experimental):** Codex Computer Use also runs on Windows, and its runtime has a Linux target. The
plugin itself is platform-neutral (it only talks to `codex app-server`), but it has only been tested on macOS. On
other platforms, `codex` is found through `PATH` or the `codexPath` option, and OCR is not available yet.

## Install

Add the plugin to your OpenCode config (`~/.config/opencode/opencode.json` for every project, or `opencode.json` in one
project):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-codex-computer-use"]
}
```

Restart OpenCode, then run `/computer-use-doctor` to check the setup.

To run it from a checkout instead, clone this repository, run `bun install` in it and put the absolute path of the
repository directory in `plugins`.

## Usage

Ask for what you want in plain words, for example "open my latest note in Notes and add a checklist for today" or
"find the latest Codex release on GitHub". The agent works through two tools:

| Tool                             | What it does                                                                                                                                                                                                    |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `computer_use`                   | Runs JavaScript in Codex's Computer Use runtime, where a `cua` object is preloaded, and returns text output, accessibility trees and screenshots. Variables persist between calls in the same OpenCode session. |
| `computer_use_reset`             | Clears that runtime for the current session.                                                                                                                                                                    |
| `/computer-use-doctor` (command) | Checks the setup; see [Check your setup](#check-your-setup).                                                                                                                                                    |

The same runtime covers both surfaces, as it does in Codex:

```js
// Native apps
let app = await cua.getApp("Notes") // name, bundle ID or path; returns the app's accessibility tree

// Chrome tabs (needs the ChatGPT for Chrome extension)
let browser = await cua.getBrowser()
let tab = await cua.createBrowserTab(browser.browserId, "https://example.com")
```

The first call in each session also returns the engine's full API reference to the model, so the plugin does not
need to ship OpenAI's documentation.

Tabs work on the page itself and add `goto`, `back`, `reload`, `close` and Playwright-style locators. Tabs the agent
creates close automatically when the OpenCode turn ends, unless the agent marks them to keep (`tab.markDeliverable()`,
or `tab.markHandoff()` for a page that waits on you). Keys and typing go to the bound app or tab, so system-wide
shortcuts such as Spotlight are not available.

### Check your setup

In OpenCode, run the **`/computer-use-doctor`** command. It checks each requirement above, read-only: the platform, the
`codex` executable, the Computer Use app and runtime, native app access and screenshots, OCR (when enabled) and
connected browsers, and says how to fix whatever is missing. The report is added to the session without starting a
model turn.

From a checkout, `bun run doctor` runs the same checks in a terminal (`bun scripts/smoke.ts --ocr` also tests OCR).

```
## Codex Computer Use doctor: ready

- ✅ **Platform**: macOS 26.6.2 (arm64)
- ✅ **codex executable**: /Applications/ChatGPT.app/Contents/Resources/codex (codex-cli 0.155.0-alpha.16)
- ✅ **Computer Use app**: ~/.codex/computer-use/Codex Computer Use.app (26.916.1001103)
- ✅ **Computer Use runtime**: Codex app-server running with `cua_repl`
- ✅ **App access**: Codex approves app access itself (approval_policy = "never")
- ✅ **Native apps**: Engine reachable, 17 apps listed
- ✅ **Screenshots**: Finder screenshot captured (image/jpeg, 132 KB)
- ✅ **OCR**: 61 text lines recognized in 894 ms
- ✅ **Browser tabs**: Connected: Chrome (extension)
```

## Configuration

Pass options with the object form of the plugin entry. Every option is optional; these are the defaults:

```jsonc
{
  "plugins": [
    {
      "package": "opencode-codex-computer-use",
      "options": {
        "surfaces": ["apps", "browser"],
        "screenshots": "image",
        "maxOutputKB": 128,
        "idleShutdownMinutes": 0,
        "callTimeoutSeconds": 300,
        "debug": false,
      },
    },
  ],
}
```

| Option                | Default               | Meaning                                                                                                                                                                                                                                                                                                                                                                                     |
| --------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `surfaces`            | `["apps", "browser"]` | What the agent may operate: native apps, browser tabs, or both. Turning one off removes it from the tool description and makes its `cua` functions throw. This scopes the model; it is not a security boundary.                                                                                                                                                                             |
| `screenshots`         | `"image"`             | How screenshots reach the model. `"image"`: as images. `"ocr"`: as text recognized on-device (macOS Vision), one line per text block with its `[x,y]` position, which is also a valid click coordinate; for models without vision, or to keep pixels off your model provider. `"both"`: image plus text. `"off"`: replaced by a placeholder, so the model relies on the accessibility tree. |
| `maxOutputKB`         | `128`                 | Maximum text one call returns. Longer output is cut, with a note telling the model to narrow its query. `0` disables the limit. Images are not counted.                                                                                                                                                                                                                                     |
| `idleShutdownMinutes` | `0` (never)           | Stop the background Codex process after this many minutes without Computer Use calls. The default keeps it running until OpenCode stops, so work can wait indefinitely for you (for example, a login in a tab the agent handed over).                                                                                                                                                       |
| `callTimeoutSeconds`  | `300`                 | Maximum time for one `computer_use` call.                                                                                                                                                                                                                                                                                                                                                   |
| `codexPath`           | auto                  | Path to `codex`. Otherwise `$OPENCODE_CODEX_COMPUTER_USE_CODEX_PATH`, then (on macOS) the ChatGPT app, then the Codex app, then `PATH`.                                                                                                                                                                                                                                                     |
| `debug`               | `false`               | `true` (or a file path) writes every message exchanged with Codex to `~/.local/share/opencode/log/codex-computer-use.jsonl`, with screenshots replaced by their size. The log contains accessibility trees and page text, so it can hold sensitive data.                                                                                                                                    |

### App access

Computer Use asks before it touches an app ("Allow Computer Use to use Calculator?"). Your Codex settings answer that
question, as they do inside Codex:

- With `approval_policy = "never"` in `~/.codex/config.toml`, Codex approves app access itself.
- Apps you approved permanently in ChatGPT or Codex are always allowed.
- Any other app is declined, and the agent tells you which app needs permission. OpenCode's plugin API cannot show
  these prompts as OpenCode permission questions yet; once it can
  ([anomalyco/opencode#46530](https://github.com/anomalyco/opencode/pull/46530)), they will appear in OpenCode instead.

Apps blocked by the engine or your organization stay blocked. `/computer-use-doctor` shows which policy applies.

### Permissions

Both tools use the OpenCode permission action `computer_use`, which OpenCode allows by default. To turn Computer Use
off for a project or an agent, deny it; the tools then disappear from the model's tool list:

```jsonc
{
  "permissions": [{ "action": "computer_use", "resource": "*", "effect": "deny" }],
}
```

An `ask` rule is meant to prompt before every call, but OpenCode 2.0.16 does not yet apply `ask` to tools from external
plugins ([anomalyco/opencode#50652](https://github.com/anomalyco/opencode/issues/50652), fix in
[#50657](https://github.com/anomalyco/opencode/pull/50657)); until that fix ships, `ask` behaves like `allow`.

## How it works

```
OpenCode ── computer_use tool
  └─ codex app-server  (hidden, started on first use, JSON-RPC over stdio)
      └─ one ephemeral Codex thread per OpenCode session
          └─ cua_repl (Codex's Computer Use runtime) ── Codex Computer Use engine ── your apps and tabs
```

- **Nothing opens in Codex.** Threads are started with `ephemeral: true`: nothing is written to disk, nothing appears
  in the ChatGPT/Codex thread list, and no model turn runs in Codex. Only routine Codex diagnostic log lines are written.
- **What you see:** the apps being operated (apps that are not running are launched in the background) and Computer
  Use's own on-screen indicator while it acts ("ChatGPT is using your computer — Esc to cancel").
- **Turns:** each call carries the Codex thread ID and an ID for the current OpenCode turn (in the request's `_meta`,
  as Codex does for its own tool calls); the browser surface requires it. When an OpenCode turn finishes or is
  interrupted, the plugin tells Computer Use the turn ended, which also cleans up agent-created Chrome tabs. Deleting
  an OpenCode session closes its Codex thread.
- **Lifetime:** the Codex process keeps running between calls, so JavaScript variables survive long waits. If it
  stops anyway (an optional `idleShutdownMinutes`, a crash, or a ChatGPT update), the next call starts it again and
  tells the model, before anything else, that its earlier variables are gone.

## Privacy

Computer Use reads the UI and screenshots of the apps and pages it operates, and those are sent to **your OpenCode
model provider** as tool results. In Chrome it works in your real profile, with your logged-in sessions. OpenAI's
Computer Use component also sends its own usage telemetry to OpenAI, as it does inside ChatGPT; your ChatGPT settings
govern that. With `screenshots: "ocr"` or `"off"`, no screenshot pixels leave your machine.

## Troubleshooting

Start with `/computer-use-doctor`; it names the missing piece.

| Symptom                                    | Fix                                                                                                                                                         |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Could not find the codex executable`      | Install the ChatGPT desktop app in `/Applications`, or set `codexPath`.                                                                                     |
| `Codex has no cua_repl MCP server`         | Turn on Computer Use in the ChatGPT/Codex app, then run `/computer-use-doctor` again.                                                                       |
| Permission errors from the engine          | Grant Accessibility and Screen Recording to _Codex Computer Use_, then retry.                                                                               |
| The agent says an app needs permission     | Approve the app permanently in ChatGPT/Codex, or set `approval_policy = "never"`; see [App access](#app-access).                                            |
| No browsers listed / Chrome tab calls fail | Install and connect the ChatGPT for Chrome extension from the ChatGPT/Codex app, keep Chrome running, then run `/computer-use-doctor`.                      |
| Anything else                              | Plugin messages are prefixed `[codex-computer-use]` in `~/.local/share/opencode/log/opencode.log`; set `"debug": true` to log the full exchange with Codex. |

## Contributing

Bug reports, platform testing and pull requests are welcome. [CONTRIBUTING.md](CONTRIBUTING.md) covers development,
the code layout and how releases work. To report a vulnerability, follow [SECURITY.md](SECURITY.md).

## Disclaimer

This is an independent project. OpenAI, ChatGPT, Codex and Computer Use are trademarks of OpenAI. The plugin uses the
Codex Computer Use engine installed on your machine through Codex's public protocol and contains none of OpenAI's code.

## License

[MIT](LICENSE) for this plugin's code. The Codex Computer Use engine is OpenAI's and is not part of this repository.
