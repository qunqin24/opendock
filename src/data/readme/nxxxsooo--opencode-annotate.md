# Open Annotate

English · [简体中文](https://github.com/nxxxsooo/open-annotate/blob/main/README.zh-CN.md)

Review AI replies, local documents, and webpages, then send numbered feedback back to the originating agent session.

[![npm](https://img.shields.io/npm/v/@nxxxsooo/open-annotate)](https://www.npmjs.com/package/@nxxxsooo/open-annotate)
[![CI](https://github.com/nxxxsooo/open-annotate/actions/workflows/ci.yml/badge.svg)](https://github.com/nxxxsooo/open-annotate/actions/workflows/ci.yml)
[![MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

[Website](https://mjshao.fun/open-annotate/) · [Install](#install) · [Workflows](#workflows) · [Herdr](#herdr) · [AGY](#antigravity-agy-support) · [Browser review](#browser-review-optional) · [Configuration](#configuration)

This unofficial OpenCode plugin bundles a native Rust [terminal reviewer](tui/README.md) from `tui/`, so no separate reviewer install is needed. It works for OpenCode users, Antigravity CLI (AGY) users, Herdr and Herdr.app panes, and optional Chrome or Safari webpage reviews. Published on npm as `@nxxxsooo/open-annotate`.

| Host | Reviews | Entry point | Start here |
|---|---|---|---|
| OpenCode (bundled TUI) | AI replies, Markdown, text and config files | `/annotate`, `/annotate-file`, `/annotate-pick`, `/annotate-selection` | [OpenCode install](#opencode) |
| Antigravity CLI (AGY) | AGY replies, Markdown, webpages | `/annotate` (hook or `annotate` skill), `agy-annotate` | [AGY install](#antigravity-cli-agy) |
| Herdr / Herdr.app | Agent replies, files, pane terminal output | `prefix+a` (`annotate.review`), `annotate-tui herdr`, Herdr.app peek or pane | [Herdr](#herdr) |
| Chrome (optional) | Webpages, local HTML (direct delivery) | `/annotate <url-or-html>`, `agy-annotate web`, `Alt+Shift+A` | [Browser install](#local-browser-enabled-installation) |
| Safari (optional) | Webpages, local HTML (copy to clipboard only) | `/annotate <url-or-html>` (`"browser": "Safari"`), `Option+Shift+A` | [Safari](#safari-copy-only) |

<p align="center">
  <img src="https://raw.githubusercontent.com/nxxxsooo/open-annotate/main/docs/assets/cover-dracula-full-20261116.webp" alt="Real OpenCode Annotate 0.17.0 capture in Ghostty using the Dracula theme, showing two annotations and the reaction toolbar on a synthetic document" width="720">
</p>

Real 0.17.0 capture in Ghostty (Dracula theme) on a synthetic document, showing two annotations and the reaction toolbar. [Capture details](https://github.com/nxxxsooo/open-annotate/blob/main/docs/assets/README.md).

## Install

### OpenCode

Requires OpenCode 2.2.0+. The npm package includes `annotate-tui` binaries built from [`tui/`](tui/README.md) for macOS arm64/x64, Linux arm64/x64 (Ubuntu 22.04 / glibc 2.35+), and Windows x64. See [source and build](tui/README.md#source-and-build). OpenCode terminal handoff is verified on macOS; Windows handoff is not yet verified.

```sh
opencode plugin add @nxxxsooo/open-annotate@latest
```

OpenCode loads server option sync and TUI commands from one entry in global `opencode.json` or `opencode.jsonc`. Run `/reload` if commands have not refreshed. Manual configuration, preserving other entries and `options`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["@nxxxsooo/open-annotate@latest"]
}
```

`@latest` selects the current npm release when installing or updating. Publishing a release does not automatically replace an installed copy. If you only use OpenCode, jump to [First review in 3 steps](#first-review-in-3-steps); AGY, Herdr, and browser setup below are optional.

### Antigravity CLI (AGY)

AGY does not require OpenCode. Install the package globally (`npm install -g @nxxxsooo/open-annotate`, under `npm root -g`) or build a checkout (`npm run build:tui`), then:

1. Link the package's `agy/skills/annotate` directory to `~/.agents/skills/annotate`.
2. Merge the `agy-annotate` entries from `agy/hooks.json` (`SessionStart`, `PreInvocation`, `Stop`) into `~/.gemini/config/hooks.json`, replacing `./hooks.mjs` in all three commands with the absolute path to `agy/hooks.mjs` from that same installation.
3. For the Herdr TUI only, complete the [manifest and keybinding setup](tui/README.md#herdr) using `annotate-tui` and `agy-annotate` from that same installation. Herdr.app needs no manifest.

### Herdr and Herdr.app

- **Herdr.app (`herdr-core`)**: uses `hc` and `herdr-app` directly and needs no Herdr TUI plugin manifest. For AGY inside Herdr.app, complete steps 1 and 2 under [Antigravity CLI (AGY)](#antigravity-cli-agy), then see [Herdr.app](#herdrapp) and [Antigravity (AGY) support](#antigravity-agy-support).
- **Herdr TUI on macOS** (tested with Herdr 0.9.5): save `herdr-plugin.toml` in a plugin directory using paths from one installation, run `herdr plugin link /absolute/path/to/plugin-directory`, and bind `prefix+a` to `annotate.review` in Herdr's `config.toml`. See [manifest and keybinding setup](tui/README.md#herdr).

### Local browser-enabled installation

Browser review is optional and installs separately from the plugin. It requires macOS, Chrome 116+ or Safari 18+, and Node 22+ for the Chrome native host.

1. Run `/annotate <url-or-html>` in OpenCode or `agy-annotate web [url-or-html]` in AGY. If Annotate is missing or disabled in Chrome, the command copies the unpacked `browser/` path, reveals it in Finder, and prints setup steps (or names Chrome profiles where Annotate is enabled).
2. In your review Chrome profile, open `chrome://extensions`, turn on Developer mode, click Load unpacked, press `⌘⇧G`, and paste the path (or turn Annotate on if listed). You can also clone this repository and load its `browser/` directory. Under Details, enable Allow access to file URLs for local HTML.
3. OpenCode registers the Chrome native host (`fun.mjshao.annotate`, fixed extension ID, absolute Node path, starts on demand with no HTTP port) and active sessions automatically on macOS. If you use AGY without OpenCode or automatic setup reports an error, run `npm run install:bridge` in the installed package or checkout.
4. Open the page and press `Alt+Shift+A` (or click the extension icon) to open the side panel.

Safari builds from a checkout with Xcode (`npm run build:safari`, `npm run install:safari`) and supports copying notes only. See [Safari (copy-only)](#safari-copy-only).

## First review in 3 steps

<p align="center">
  <img src="https://raw.githubusercontent.com/nxxxsooo/open-annotate/main/docs/assets/terminal-review-dracula-20261116.gif" alt="Real OpenCode Annotate 0.17.0 Ghostty recording in Dracula theme selecting passages, adding a reaction and a typed comment, and showing Send 2 back (q)" width="720">
</p>

Real 0.17.0 Ghostty recording (Dracula theme) on a synthetic document: select, react, select, type a comment, save, and prepare `Send 2 back (q)`. [Capture details](https://github.com/nxxxsooo/open-annotate/blob/main/docs/assets/README.md).

1. **Open the reviewer**: run `/annotate` in any session to review the last completed assistant reply, or `/annotate path/to/file.md` for a document.
2. **Select and comment**: drag to select text (or press `v` and move), press `c` to write a note, and press Enter to save.
3. **Send**: press `q` (or click **Send N back (q)** in the header) to submit numbered feedback to the originating session and resume it.

- `Ctrl+S` saves an open comment and sends in one step. `E` and `S` also send, following `[keys]` rebindings.
- `Ctrl+C` closes the reviewer. OpenCode then asks whether to send saved notes; AGY closes without sending.
- Opening a review makes no model call, and empty or cancelled reviews submit nothing.
- In OpenCode, confirmed text and browser sends continue the captured session with `steer` / `resume: true`, including while a turn is running.

<a id="what-it-reviews"></a>

## Workflows

### Annotate AI replies

- `/annotate` opens the last completed reply, including turns interrupted while waiting on a question tool. Real failures, streaming replies, content-filtered replies, reasoning, and tool-call commentary are excluded.
- `/annotate-pick` chooses from up to 30 recent replies and mid-turn progress updates.
- `/annotate-selection` opens the message containing your last transcript selection, or reviews just the selected text when a selection spans messages.

### Review text and config files

```text
/annotate docs/plan.md            # Review a Markdown document
/annotate "docs/release plan.md"  # Path with spaces
/annotate ~/Documents/notes.txt   # Plain text
/annotate-file                    # Pick a file from this session's directory
/annotate-file settings           # Filter the file search
```

`/annotate-file` uses OpenCode's `@` file search in the session directory and subdirectories (up to 200 matches, symlink-checked inside the session root) and opens a picker. You can also pass a supported path directly to `/annotate`.

- **Supported formats**: `.md`, `.mdx`, `.markdown`, `.txt`, `.rst`, `.adoc`, `.org`, `.tex`, `.csv`, `.tsv`, `.log`, `.json`, `.jsonc`, `.json5`, `.yaml`, `.yml`, `.toml`, `.ini`, `.cfg`, `.conf`, `.properties`, `.xml`, `.plist`, `.editorconfig`, `.gitignore`, `.gitattributes`, `.dockerignore`, `Dockerfile`, and `Makefile`.
- **Limits and exclusions**: non-Markdown files open inside fenced code blocks with formatting intact. Files must be local UTF-8, at most 2 MiB, and free of binary bytes; `.env` and credential-looking filenames are excluded.
- **Paths and snapshots**: relative paths resolve against the session's working directory; Unix-style absolute paths and `~/` paths also work. The reviewer reads a fixed snapshot without editing the original file. Feedback includes the file path and SHA-256 hash so the assistant re-reads the file before editing. File review works before the first assistant reply.

### Browser webpage feedback

```text
/annotate page.html               # Review a local HTML file
/annotate https://example.com     # Review a webpage
```

Open the Chrome side panel (`Alt+Shift+A`) on any page and choose an automatically registered OpenCode or AGY session, or start from OpenCode home to create an empty session without starting a model turn. Safari supports local notes and copying only.

Plain `/annotate`, `/annotate-file`, `/annotate-pick`, `/annotate-selection`, and text or config paths use the TUI. The browser workflow accepts explicit URLs (`http:`, `https:`, `file:` HTML) and `.html`/`.htm` paths; HTML links or code fences in a reply do not change routing. See [Browser review](#browser-review-optional).

## Command reference

```text
/annotate                         Review the last completed assistant reply
/annotate docs/plan.md            Review a Markdown document
/annotate "docs/release plan.md"  Review a path containing spaces
/annotate ~/Documents/notes.txt   Review a plain-text document
/annotate-file [query]            Choose a text or config file in the session directory
/annotate-pick                    Choose a recent reply or mid-turn progress update
/annotate-selection               Review the message containing your last transcript selection
/annotate page.html               Review local HTML in the configured browser
/annotate https://example.com     Review the specified webpage
```

Numbered `/annotate N`, `/annotate-last`, and `/annotate-web` are retired. Use `/annotate-pick`, `/annotate`, and `/annotate <url-or-html>`. Browser connection controls live in the extension's destination menu.

## Review and send

- **Select**: drag to select text, or press `v` and move. Without a selection, `c` comments on the current block.
- **Annotate**: press `c` to comment, `w` for `what?` ([what? notes](#what-notes)), `a` to approve, or `d` to request deletion.
- **Comment box**: Enter saves, `Ctrl+S` saves and sends, and Esc cancels editing. Use `Shift+Enter` for a new line where the terminal reports it, or `Alt+Enter` or `Ctrl+J` as fallbacks. The top border shows save and send hints; the bottom border shows cancel and newline hints.
- **React or copy**: With a selection waiting, Enter records **Done** and `g` records **Get**. Esc dismisses the selection, and `y` copies the selected source without overwriting the clipboard on select.
- **Toolbar**: the compact toolbar shows approve, comment, **Done**, and **Get**. `w`, `d`, and `y` are keyboard-only. For user-supplied PNG toolbar artwork in Kitty-graphics terminals, see [local image-toolbar configuration](tui/README.md#local-image-toolbar-trial); unconfigured terminals keep Unicode icons.
- **Finish**: press `q` to send and return. While browsing, `Ctrl+C` closes the reviewer; OpenCode asks whether to send saved notes, and AGY closes without sending. `E` and `S` also send per `[keys]`. In OpenCode, confirming sends a normal user prompt and resumes the original session even if you switch tabs.

### Chinese and other input methods

An input method holds plain letters while composing, swallowing review keys such as `e`, `q`, `s`, and OpenCode permission shortcuts.

- With [Slash Saver](https://github.com/nxxxsooo/slash-saver) 1.1+ installed in `/Applications`, the plugin switches to Slash Saver's ASCII source while browsing a review or answering permission prompts.
- Comment and edit boxes switch back to your writing source while open, and your previous source is restored afterwards.
- Set `"inputSource": false` in plugin `options` to turn this off, or set a path to another helper supporting `input-source current|select|ascii`.
- `Ctrl+E` also edits when an input method is active.

## Herdr

### Herdr.app

Herdr.app (`herdr-core`) uses `hc` and `herdr-app` directly and needs no Herdr TUI plugin manifest.

- **Placement**: a focused calling pane gets a floating peek (`terminal.peek`). Otherwise, the reviewer opens as a pane in the caller's tab, or in its host pane's tab for a sub-agent, without stealing focus.
- **Slash hook**: with AGY hooks installed, `/annotate` and `/annotate <local-document>` work in AGY panes and sub-agents. If the hook cannot verify the conversation or open the reviewer, it ends the turn with a visible reason and makes no model call.
- **Sending**: `Ctrl+S`, Send, or `q` with pending notes sends feedback (`q` with no notes just closes; `Ctrl+C` or closing the pane sends nothing).
  - Hook-opened reviews submit via `hc send` when AGY is `idle` or `done`, queue for the AGY hooks when `working`, and send nothing when `blocked`, unknown, or changed.
  - Skill-opened reviews queue feedback for AGY's lifecycle hooks.

### Herdr TUI

Bind `prefix+a` (`Ctrl+B` then `a` by default) to `annotate.review` using the [manifest and keybinding setup](tui/README.md#herdr).

- **AGY panes**: `prefix+a` opens a 90% x 90% floating Markdown popup (`agy-popup`) without starting a model turn. Send starts a turn when AGY is `idle` or `done`, queues feedback when `working`, and sends nothing when `blocked`, unknown, or changed. Press `q` to send pending notes and close (or close if empty), or `Ctrl+C` to close without sending.
- **AGY slash hook vs skill**: with AGY hooks installed, `/annotate` and `/annotate <local-document>` in a focused AGY pane open the same popup before the model runs. Otherwise, the `annotate` skill opens an overlay when focused, or a non-focus-stealing split when unfocused.
- **Other agents**: Claude, Codex, Pi, and OpenCode panes use `herdr last --newest --deliver-to`.

You can also run `annotate-tui herdr` directly from any Herdr pane with an enabled `annotate` plugin providing the `doc` pane entrypoint (see [TUI setup](tui/README.md#herdr)). OpenCode's `/annotate` clears inherited `HERDR_*` variables and keeps its own session delivery.

```sh
annotate-tui herdr open docs/plan.md --placement split --deliver-to w1:p2
annotate-tui herdr open docs/ --deliver-to w1:p2
annotate-tui herdr last --deliver-to w1:p2
annotate-tui herdr terminal --lines 20 --deliver-to w1:p2
annotate-tui herdr terminal --lines 5 --print
```

- `open`, `last`, and `terminal` accept `--placement overlay|split|tab|zoomed` (default `overlay`; `popup` is manifest-only).
- `last` opens a reply picker, or `--newest` opens the newest reply directly. With `--deliver-to`, it reads that pane's agent session.
- `terminal` reviews recent output from the calling pane even when delivering to another pane. `--print` writes a fenced Markdown block to stdout instead of opening a reviewer.
- Replace `w1:p2` with the target agent's pane ID. Send submits the prompt including Enter. If Herdr reports the agent is blocked at a dialog, nothing is sent; notes stay pending and Annotate tries an OSC 52 clipboard copy so you can resolve the dialog and retry.
- Outside Herdr, use `annotate-tui docs/plan.md` to copy feedback via a terminal supporting OSC 52. `herdr open` requires a Herdr pane.

## Antigravity (AGY) support

See [AGY install](#antigravity-cli-agy) for skill and hook setup. How AGY reviews open and deliver depends on your terminal:

- **Slash hook**: with AGY hooks installed, `PreInvocation` intercepts `/annotate` and `/annotate <local-document>` before the model runs in a configured Herdr TUI pane or in [Herdr.app](#herdrapp), including AGY sub-agents.
- **Skill and CLI**: if the Herdr TUI hook declines, the `annotate` skill runs `agy-annotate tui [path]` in an overlay or split. Outside Herdr on macOS, it opens a Ghostty (172x48) or Terminal.app window. Running `agy-annotate tui` directly on an interactive shell TTY opens inline.
- **Webpages**: explicit URL and HTML targets invoke `agy-annotate web` to pair the session and open the browser companion.
- **Sending**: `Ctrl+S` or the Send button returns feedback to the captured AGY conversation; `q` sends pending notes and closes (or closes if empty), and `Ctrl+C` closes without sending. Direct reviews in Herdr TUI or Herdr.app start a turn on `idle` or `done` and queue on `working`; skill-invoked reviews queue for `SessionStart`, `PreInvocation`, and `Stop` hooks.
- **Logs**: declined slash interceptions and popup outcomes log to `~/.local/share/opencode-annotate/agy-review.log`.

```sh
npx --package @nxxxsooo/open-annotate@latest agy-annotate status
npx --package @nxxxsooo/open-annotate@latest agy-annotate tui [path]
npx --package @nxxxsooo/open-annotate@latest agy-annotate web [url-or-html]
npx --package @nxxxsooo/open-annotate@latest agy-annotate queue
```

Supported CLI options: `--session <id>`, `--binary <path>`, and `--browser Chrome|Safari`.

## Browser review (optional)

<p align="center">
  <img src="https://raw.githubusercontent.com/nxxxsooo/open-annotate/main/docs/assets/browser-review.png" alt="Real v0.13.0 Chrome extension panel showing a saved webpage comment and Send 1 note button" width="440">
  <br>
  <em>Real v0.13.0 <code>panel.html</code> capture with synthetic feedback in an isolated headless Chromium tab (not Chrome's native side-panel frame). Current panels add cross-page rounds, area selection, and a destination picker.</em>
</p>

### Chrome (direct delivery)

See [Local browser-enabled installation](#local-browser-enabled-installation) to load the unpacked extension and native host.

**Session picker and connection**

- Click the destination beside **To** to filter sessions by title or directory and sort by recent activity, creation, or title. The picker refreshes automatically with current titles.
- **New session** creates an empty OpenCode session with the chosen OpenCode session's directory and model (or OpenCode home's selection) without starting a model turn.
- **Disconnect** keeps the target named and notes local; choosing it again reconnects. A disconnected target never silently switches to another session.
- Restarted receivers reconnect by stable provider/session identity and carry pending retry batches. Switching terminal tabs never changes the captured destination.

**Capturing notes and areas**

- Select text directly, choose **Pick element**, or drag a rectangle with **Select area**, then write a comment or question.
- Unsent area outlines stay marked on the page: click a dashed outline or badge to activate it, drag to move or resize via handles, and press `Esc` to cancel an adjustment.
- Area notes record rectangle position, viewport, visible text, and up to five selectors without taking a screenshot.
- **Add note** (or `Cmd/Ctrl+Enter`) saves locally. **Send N notes & continue** saves open input and sends all pending notes across pages. OpenCode uses `steer` / `resume: true` (idle sessions start immediately; running turns receive feedback at the next boundary). AGY queues notes for its lifecycle hooks. Registering, creating sessions, and saving notes make no model call.

**Managing rounds and reconnection**

- Notes group by page with contiguous numbers matching page markers and delivered Markdown. The delivery bar shows the whole round's count and destination; drafts remain page-local.
- Click a note's quoted target to reveal it on its page without activating the element; off-page notes open their page. Use **Edit** to change feedback and **Undo** to restore a deleted note.
- **Clear** in the notes header removes every unsent note in the round, and each page group has its own **Clear**. One **Undo** restores the cleared batch, while drafts, delivered history, and **Restore last round** stay intact. Clearing the whole round drops a pending retry batch only after inline confirmation.
- Each send closes the global round, and **Restore last round** recovers the most recent round across pages. The last ten rounds are kept.
- **Send** and **Copy instead** stay separate actions. **Copy instead** copies the grouped Markdown for any agent and closes the round. **More review options** adds non-closing Markdown copy, JSON export, and a round preview.
- Reloads and same-site navigation reconnect automatically. If Chrome withdraws access on a cross-site move, the panel asks you to click the extension icon once while keeping saved notes.

### Safari (copy-only)

Build the shared browser sources into `/Applications/annotate.app` from a checkout with Xcode installed:

```sh
ANNOTATE_SIGN_IDENTITY="Apple Development: Your Name (TEAMID)" \
ANNOTATE_DEVELOPMENT_TEAM="TEAMID" npm run build:safari
npm run install:safari
```

- `npm run install:safari` replaces `/Applications/annotate.app` and refreshes its registration. Open the app once, enable Annotate in Safari > Settings > Extensions, and allow access to the pages you want to review. Builds without signing variables use an ad-hoc signature that Safari may refuse to register.
- Open the standalone panel from the toolbar button or `Option+Shift+A` (where supported). Safari has no docked side panel; its separate window stays bound to the reviewed Safari window and polls while you work.
- Because Safari extensions are App-Sandboxed, Safari cannot start the Node bridge, read the session registry, or deliver to sessions directly. It ignores session registration and keeps notes local. Use **Copy notes** to paste into any agent; copying closes the round and **Restore last round** recovers it.
- Set `"browser": "Safari"` in the plugin's `options` in `opencode.json(c)` or pass `--browser Safari` to `agy-annotate web`. The only public values are `"Chrome"` (default, mapped to Google Chrome) and `"Safari"`. Plain `/annotate` still opens the TUI.
- After updates, rebuild with signing variables, run `npm run install:safari`, reopen the app, and re-enable if needed. An unpacked Chrome reload does not update the installed Safari app.

### Safeguards and limitations

- **Frames**: picking and text selection work inside same-origin iframes, legacy framesets, and nested frames, and delivered Markdown includes a `Frame:` line. Cross-origin frames cannot be picked and show a clear message.
- **Limits and redaction**: rounds accept up to 200 notes and 512 KiB of JSON (4,000-character quotes, 8,000-character comments). URL credentials and sensitive query or hash parameters (tokens, passwords, secrets, signatures, credentials, API keys, `auth`, `code`) are redacted from exported URLs.
- **Drafts**: drafts autosave per page and restore after a panel reload or return to the same URL, including SPA routes. Switching targets with unfinished input offers **Add/Save & switch**, **Keep editing**, or **Discard & switch**.
- **Privacy and conflicts**: storage failures keep input for retry, competing panels require an explicit draft choice, and revision checks prevent stale tabs from overwriting newer feedback. Comments and drafts stay in extension storage; the page receives only selection metadata and numbered markers.
- **Exports and targets**: full JSON and Markdown exports include redacted URLs, exact selected text and context, verified selector hints, styles, and accessibility. Missing, changed, or ambiguous targets are labeled in the sidebar instead of silently rebound.
- **Delivery**: native delivery requires a running local OpenCode TUI or AGY receiver and a connected destination. If a session drops during Send, notes remain available for retry or copying.
- **Failed batches**: a failed batch keeps its target and batch ID for **Retry N notes & continue** while new notes stay local; if that session is permanently gone, export the notes before starting a new review. Copying a round supersedes a failed batch, and clipboard failures expose a selectable preview while keeping the round open.
- **Out of scope**: browser-internal pages, Chrome Web Store URLs, PDFs, cross-origin iframes, Canvas, and remote SSH TUI clients. If migrating from the older Page Context extension, export its drafts and verify this replacement before retiring it.
- **Docs and tests**: see [implementation plan](docs/annotate-html-integration-plan.md), [shipped-artifact evaluation](docs/annotate-html-evaluation.md), and [browser provenance](browser/UPSTREAM.md). `npm test`, `npm run test:smoke`, and `npm run test:browser` (`PLAYWRIGHT_MODULE`, `CHROMIUM_PATH`) verify each layer.

### Reload after browser companion updates

Keep Developer mode on and update the `browser/` folder loaded in Chrome. When the panel connects, an up-to-date native host checks installed unpacked manifest versions. If a newer version is on disk and the review is idle, Annotate reloads once; reopen the panel with the extension icon or `Alt+Shift+A`.

Auto-reload waits if notes, drafts, or a retry are pending or another panel is open. Finish the review and click **Reload Annotate**.

If a newly opened panel loads an updated `panel.mjs` beside an older `worker.mjs`, the protocol mismatch shows **Annotate was updated** with **Reload Annotate**. Click it, or click **Reload** in `chrome://extensions` (also needed after edits without a manifest version bump, or when upgrading from a version before automatic reload).

Extension-local notes and drafts survive reload. Reopen OpenCode or run `npm run install:bridge` if the native host also changed. To diagnose a mismatch, compare the running worker source (DevTools/CDP `Debugger.getScriptSource`) with `browser/worker.mjs`; the manifest version alone cannot detect unpacked edits.

## Configuration

### Automatically review long replies

Enable auto-annotation in `opencode.jsonc` (or `opencode.json`), preserving existing options:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "@nxxxsooo/open-annotate@latest",
      "options": {
        "autoAnnotate": true,
        "autoAnnotateThreshold": 2000 // Open when trimmed reply exceeds this many Unicode characters.
      }
    }
  ]
}
```

- `autoAnnotate` defaults to `false`. `autoAnnotateThreshold` accepts a non-negative integer and defaults to `2000`.
- The threshold counts Unicode characters in trimmed reply text including Markdown and code, excluding reasoning and tool output. `0` opens every non-empty reply; a reply equal to the threshold does not open.
- After a successful turn in an active idle session, a qualifying reply opens once. Progress updates, failed or interrupted turns, historical replies, and background sessions do not trigger it.
- A reply is skipped if another review is open, you switch sessions before it opens, or a new turn starts. Dismissing or reloading does not reopen that reply, and sending remains explicit. OpenCode reloads saved configuration automatically; use `/reload` if needed.

### What? notes

A `what?` note stays short in the review. When you send, the feedback appends one instruction asking for plain-language explanations with concrete examples where helpful, tied to the current task, while holding pending actions until you confirm.

Change or clear that instruction (`""` sends notes alone) in `~/.config/opencode-annotate/tui.toml` (`%APPDATA%/opencode-annotate/tui.toml` on Windows):

```toml
[prompts]
what = "Explain each passage marked what? in two sentences, then stop."
```

If OpenCode has a skill with ID `what`, the plugin attaches it to the sent feedback like mentioning `@what`, so the skill can hold pending work and ask whether to continue. Choose another skill or disable this with `whatSkill` in `opencode.json(c)`:

```jsonc
"options": { "whatSkill": "explain" } // or false
```

A missing default `what` skill is skipped. A missing custom `whatSkill` stops the send with an error and keeps the draft and `feedback.md`.

### Theme, layout, and plugin options

Layout and `[keys]` settings live in `~/.config/opencode-annotate/tui.toml` (`%APPDATA%/opencode-annotate/tui.toml` on Windows). Example readable-column layout:

```toml
[ui]
horizontal_margin = 2
max_width = 168
doc_width = 120
```

Font family and size belong to the terminal. The adapter sets `PLANNOTATOR_TUI_THEME` to follow light/dark mode. `PLANNOTATOR_*` environment and field names are local protocol identifiers and never connect to another project.

Additional `options` in `opencode.json(c)`:

- `inheritTheme`: set to `true` to use OpenCode's resolved colors (canvas, text, Markdown, borders, highlights, cursor, selection). The plugin reads the binary's effective config, writes a validated per-review `PLANNOTATOR_TUI_CONFIG` without altering user files, and takes over the terminal. Launchers must honor `PLANNOTATOR_TUI_CONFIG`. See [TUI theme integration](docs/tui-theme.md).
- `binary`: path overriding the bundled `annotate-tui` executable with another locally built binary.
- `browser`: `"Chrome"` (default, mapped to Google Chrome) or `"Safari"`.
- `inputSource`: `false` to disable automatic input-source switching, or a path to a helper with `input-source current|select|ascii`.

<details>
<summary id="draft-recovery">Draft recovery</summary>

Each review uses a private temporary directory cleaned up after successful, empty, or cancelled runs. Failures and archived notes retain the directory and print its path.

`review.json` holds the session, source, and relative `snapshot` path; `feedback.md` holds exported feedback when available. Recover a retained review using the `snapshot` value from `review.json`:

```sh
PLANNOTATOR_DATA_DIR="<retained-directory>/data" \
  npx --package @nxxxsooo/open-annotate annotate-tui "<retained-directory>/<snapshot>"
```

Press `H` to open the archive, select a note and press Enter to restore it, then `E` to copy feedback for pasting into OpenCode. An `E -> F` archive is preserved even when `--export` reports "No annotations."
</details>

<details>
<summary id="development">Development</summary>

```sh
npm ci
npm run build:tui
npm run check:tui
npm run check
npm run test:smoke
```

- Building from source requires Rust 1.96+ and Node 22+. Unit tests run against the bundled binary, including theme inheritance checks.
- `npm run test:smoke` also requires Python 3, tmux, and OpenCode. It runs an isolated session with `resume: false`, making no model call or visible window.
- Set `ANNOTATE_TUI_BINARY` to test a custom binary or launcher through the real config path, and `ANNOTATE_EXPECT_MARGIN=10` to assert centered 120-column margins in the 140-column smoke terminal. These variables configure the test, not the shipped plugin.
- For development loading in OpenCode, point the plugin entry in `opencode.json(c)` to this checkout's absolute path (preserving `options`), remove any duplicate `cli.json` entry, and run `/reload`.
- See [release instructions](docs/releasing.md) and [changelog](CHANGELOG.md).
</details>

## Updates and uninstall

OpenCode caches installed packages and does not follow repository commits. Update or remove the plugin with:

```sh
opencode plugin update @nxxxsooo/open-annotate@latest
opencode plugin remove @nxxxsooo/open-annotate@latest
```

Run `/reload` if commands have not refreshed, and check the installed version with `opencode plugin list`. Browser companions update separately: update the unpacked `browser/` directory in Chrome or rebuild and reinstall the Safari app.

## Upgrade notes

- **From `@nxxxsooo/opencode-annotate`**: replace the package value in `opencode.json(c)` with `@nxxxsooo/open-annotate@latest`, keep your options, then run `opencode plugin list`.
- **From `opencode-plannotator-tui` (0.4.2 and earlier)**: run `opencode plugin remove opencode-plannotator-tui@latest`, install `@nxxxsooo/open-annotate@latest`, and move the entry from `cli.json` to `opencode.json(c)` keeping its `options` and keeping a single entry so the TUI loads once and server options sync.
- **To 0.16.0+**: `/ref` (`--all`, `--tui`) and `annotate_session_*` session tools moved to Another. Install Another 0.28.0+ and run `another setup` for cross-agent `/ref`, keep existing `opencode.json(c)` options, and remove any `annotate_session_*` permission rules.

MIT licensed. Original terminal-reviewer copyright notices are preserved in [tui/LICENSE](tui/LICENSE).
