# OpenCode Annotate

**Review OpenCode AI replies, Markdown documents, and webpages — send annotated feedback to the originating session.**

[![npm](https://img.shields.io/npm/v/@nxxxsooo/opencode-annotate)](https://www.npmjs.com/package/@nxxxsooo/opencode-annotate)
[![CI](https://github.com/nxxxsooo/opencode-annotate/actions/workflows/ci.yml/badge.svg)](https://github.com/nxxxsooo/opencode-annotate/actions/workflows/ci.yml)
[![MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

[Website](https://mjshao.fun/opencode-annotate/) · [Install](#install) · [Workflows](#workflows) · [Browser review](#browser-review-optional) · [Configuration](#configuration)

This **unofficial OpenCode plugin** bundles the native [terminal reviewer](tui/README.md) — no separate reviewer install is required. The optional [browser companion](#browser-review-optional) adds Chrome delivery and Safari copy-only review. Published on npm as `@nxxxsooo/opencode-annotate`.

| Surface | Reviews | Entry point |
|---|---|---|
| Terminal (bundled TUI) | AI replies, Markdown, plain text | `/annotate` |
| Chrome (optional) | Webpages, local HTML | `/annotate <url-or-html>` or extension |
| Safari (optional, copy-only) | Webpages | `/annotate <url-or-html>` or extension |

## Install

Requires **OpenCode 2.2.0+**. The npm package includes **Annotate TUI**, built from [`tui/`](tui/README.md) for macOS arm64/x64, Linux arm64/x64 and Windows x64. See its [platform requirements](tui/README.md#source-and-build). The OpenCode terminal handoff has been tested on macOS; Windows handoff has not yet been verified.

```sh
opencode plugin add @nxxxsooo/opencode-annotate@latest
```

<p align="center">
  <img src="https://raw.githubusercontent.com/nxxxsooo/opencode-annotate/main/docs/assets/terminal-review.gif" alt="Bundled terminal reviewer selecting a passage in a Markdown plan and saving an inline comment" width="720">
</p>

The real bundled reviewer, using a synthetic Markdown plan. [Capture details](https://github.com/nxxxsooo/opencode-annotate/blob/main/docs/assets/README.md).

OpenCode loads the server tools and TUI commands from one entry in your global **`opencode.json`** or **`opencode.jsonc`**. Run `/reload` if the command list has not refreshed.

Manual configuration, preserving other entries:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["@nxxxsooo/opencode-annotate@latest"]
}
```

`@latest` selects the current npm release when installing or updating; publishing a release does not itself replace an installed copy. Keep your existing plugin `options`.

## First review in 3 steps

1. **Open the reviewer** — run `/annotate` in any session to review the last completed assistant reply.
2. **Select and comment** — drag to select text (or press `v` and move), then press `c` to comment. Press Enter to save the note.
3. **Send** — press `q` to send your annotations back to the session. The feedback is submitted as a prompt to the originating conversation, resuming it for the assistant to act on.

Empty and cancelled reviews submit nothing. Opening a review makes no model call.

**`Ctrl+S`** saves the current comment and sends in one step. The header's **Send N back (q)** button does the same as `q`. **`Ctrl+C`** returns without sending, and OpenCode asks whether to send. `E` and `S` send as well, following any `[keys]` rebinding. Confirmed text and browser sends continue the captured session with `steer` / `resume: true`, including while a turn is running.

<a id="what-it-reviews"></a>

## Workflows

### Annotate AI responses

`/annotate` opens the last completed reply. `/annotate-pick` chooses from recent replies and progress updates. `/annotate-selection` opens the message containing your last transcript selection. Reasoning, tool-call commentary, and in-progress messages are excluded.

For a selection that spans messages, `/annotate-selection` reviews just the selected text.

### Review text and config files

```text
/annotate docs/plan.md            # Review a Markdown document
/annotate "docs/release plan.md"  # Path with spaces
/annotate ~/Documents/notes.txt   # Plain text
/annotate-file                    # Pick a file from this session's directory
/annotate-file settings          # Narrow the file search
```

`/annotate-file` uses OpenCode's `@` file search in the session's directory and its subdirectories, then lets you filter the results in the picker. You can also pass a supported path directly to `/annotate`.

Supported files include Markdown, plain text, CSV, logs, JSON, YAML, TOML, XML, and common config files such as `.editorconfig`, `.gitignore`, `Dockerfile`, and `Makefile`. Files must be local UTF-8 and no larger than 2 MiB. `.env` and credential-looking names are excluded. Relative paths resolve against the captured session's working directory; absolute and `~/` paths work too.

The reviewer reads a fixed snapshot and does not edit the original file. Feedback includes the original path and snapshot hash, with instructions to re-read the current file before applying suggestions. Document review works even before the session has an assistant reply.

### Browser webpage feedback

Open the extension panel on any webpage and choose an automatically registered OpenCode session. Select text or pick an element, write notes across pages, and send the grouped round to that destination. `/annotate` can also open an explicit browser target:

```text
/annotate page.html               # Review a local HTML file
/annotate https://example.com     # Review a webpage
```

<p align="center">
  <img src="https://raw.githubusercontent.com/nxxxsooo/opencode-annotate/main/docs/assets/browser-review.png" alt="Chrome extension panel with a saved webpage comment and an explicit Send 1 note button" width="440">
  <br>
  <em>Real v0.13.0 extension panel with synthetic feedback; captured in an isolated headless tab. The current panel adds cross-page rounds and a destination picker.</em>
</p>

Browser setup is separate from the plugin install. Safari supports local notes and copying only; see [Browser review](#browser-review-optional) below.

## Command reference

```text
/annotate                         Review the last completed assistant reply
/annotate docs/plan.md            Review a Markdown document
/annotate "docs/release plan.md"  Review a path containing spaces
/annotate ~/Documents/notes.txt   Review a plain-text document
/annotate-file [query]            Choose a text or config file in the session directory
/annotate-pick                    Choose a recent reply or mid-turn progress update
/annotate-selection               Review the message containing your last transcript selection
/annotate page.html              Review local HTML in the configured browser
/annotate https://example.com    Review the specified webpage
```

Numbered `/annotate N`, `/annotate-last` and `/annotate-web` are retired. Use `/annotate-pick` for earlier text, `/annotate` for the latest reply, and `/annotate <url-or-html>` for a page. Browser connection controls live in the extension's destination menu.

## Herdr

Bind **prefix, then `a`** (`Ctrl+B`, then `a` by default) to
`annotate.review` using the [manifest and keybinding setup](tui/README.md#herdr).
In AGY this opens a floating Markdown reviewer without starting a model turn.
Send starts a turn if AGY is idle or done, or queues feedback if it is working.
Press `q` to send pending notes and close, or `Ctrl+C` to close without
sending. Claude, Codex, Pi, and OpenCode use the existing `herdr last`
route. With the AGY hooks installed, `/annotate` can open the same popup before
the model runs; the skill remains available as a fallback.

Run the bundled `annotate-tui` directly from a Herdr pane. Herdr needs an enabled
`annotate` plugin with a `doc` pane entrypoint; see the [TUI setup](tui/README.md#herdr).
OpenCode's `/annotate` keeps its own session delivery, even when OpenCode runs in Herdr.

```sh
annotate-tui herdr open docs/plan.md --placement split --deliver-to w1:p2
annotate-tui herdr open docs/ --deliver-to w1:p2
annotate-tui herdr last --deliver-to w1:p2
annotate-tui herdr terminal --lines 20 --deliver-to w1:p2
annotate-tui herdr terminal --lines 5 --print
```

- `open`, `last` and `terminal` accept `--placement overlay|split|tab|zoomed`. The default is `overlay`.
- `last` opens a reply picker; add `--newest` to open the newest reply directly. With `--deliver-to`, it reads that pane's agent session.
- `terminal` reviews recent output from the calling pane, even if feedback goes to a different pane. `--print` writes a fenced Markdown block to stdout instead of opening a reviewer.
- Replace `w1:p2` with the receiving agent's pane ID. **Send** submits the feedback as a prompt, including Enter. If Herdr reports the agent is blocked at a dialog, no prompt is sent. Annotate keeps the notes pending and tries to copy the feedback to the terminal clipboard; resolve the dialog and retry when ready.

Outside Herdr, use `annotate-tui docs/plan.md` to copy feedback via a terminal that supports OSC 52. `herdr open` requires a Herdr pane.

## Upgrading from the TUI-only package

`opencode-annotate` replaces `opencode-plannotator-tui` (0.4.2 and earlier). To switch, run `opencode plugin remove opencode-plannotator-tui@latest` and then install this package as shown above.

Move its entry from `cli.json` to `opencode.json(c)`, retaining the whole entry and any `options`. Keep one entry so the TUI is loaded once and the server entry can synchronize options.

## Upgrading to 0.16.0

**Breaking:** `/ref` (including `--all` and `--tui`) and the agent session search/read
tools have moved out of Annotate to Another. Install Another 0.28.0 or later and run
`another setup` to get its cross-agent `/ref` in OpenCode.

Existing `opencode.json(c)` entries and plugin options keep working. Remove any
`annotate_session_*` permission rules. Annotate continues to review replies,
documents and webpages.

## Antigravity (AGY) support

In a configured Herdr AGY pane, `/annotate` opens a native overlay before the
model runs. `prefix+a` opens the latest reply, and `/annotate <local-document>`
can review a file. Outside Herdr on macOS, the skill opens Ghostty or Terminal
for text reviews. URL and HTML targets use the browser companion.

Set up AGY manually from one installed package (`npm install -g @nxxxsooo/opencode-annotate`;
find the package under `npm root -g`) or a checkout with `npm run build:tui`:

1. Link the package's `agy/skills/annotate` directory as `~/.agents/skills/annotate`.
2. Merge the `agy-annotate` entries from `agy/hooks.json` into
   `~/.gemini/config/hooks.json`, replacing `./hooks.mjs` in all three commands
   with the absolute path to `agy/hooks.mjs` from that installation.
3. For Herdr, follow the [manifest and keybinding setup](tui/README.md#herdr)
   using the CLI and native reviewer from the same installation.

**Send** (`Ctrl+S` or the Send button) returns feedback to the captured AGY
conversation. In Herdr it starts a turn if AGY is idle or done, or queues
feedback for its lifecycle hooks if AGY is working. `q` sends pending notes and
closes; with no notes it just closes. `Ctrl+C` closes without sending.

- **CLI Commands**:
  ```sh
  npx --package @nxxxsooo/opencode-annotate@latest agy-annotate status
  npx --package @nxxxsooo/opencode-annotate@latest agy-annotate tui
  npx --package @nxxxsooo/opencode-annotate@latest agy-annotate web
  npx --package @nxxxsooo/opencode-annotate@latest agy-annotate queue
  ```

### Match OpenCode's colors

Set `"inheritTheme": true` in the plugin's `options`. The bundled reviewer supports the full palette and `[ui].doc_width` for a readable text column on wide terminals. See [TUI theme integration](docs/tui-theme.md).

Each review uses OpenCode's current resolved colors for the canvas, text, Markdown, borders, highlights, cursor and selection. The plugin asks the chosen binary for its effective configuration, copies it into that review's private directory, and validates the themed copy before taking over the terminal. Your original settings stay intact. Launchers must honor an existing `PLANNOTATOR_TUI_CONFIG`.

## Browser review (optional)

Requirements: macOS and Chrome 116+ or Safari 18+, plus Node 22+ for the Chrome native host.

### Safari (copy-only)

Build the shared browser sources into a Safari Web Extension app with Xcode installed:

```sh
ANNOTATE_SIGN_IDENTITY="Apple Development: Your Name (TEAMID)" \
ANNOTATE_DEVELOPMENT_TEAM="TEAMID" npm run build:safari
npm run install:safari
```

The installer replaces `/Applications/annotate.app` and refreshes its registration. Open that app once, then enable Annotate in Safari > Settings > Extensions. Without signing environment variables the build uses an ad-hoc signature, which Safari may refuse to register. Allow access to the pages you want to review.

Click the Annotate toolbar button, or use Option+Shift+A where Safari supports the extension command, to open its standalone panel. Select text or pick an element, write notes, then **Copy notes** to paste the round into any agent. Notes and drafts stay local; copying closes the round and **Restore last round** recovers it.

Safari requires an App-Sandboxed app extension, so it cannot start the Node bridge or read the session registry. It has no direct session delivery or session chooser; Chrome retains both. Safari also has no docked side panel: its separate window stays bound to the reviewed browser window and keeps polling while you work on the page.

Set the plugin option `"browser": "Safari"` so `/annotate <url-or-html-file>` opens the page in Safari. The only public values are `"Chrome"` (default) and `"Safari"`; Chrome maps to the macOS app Google Chrome. AGY supports the same choice with `agy-annotate web <url> --browser Safari`. Safari ignores session registration and copies notes instead. Plain `/annotate` still opens the text reviewer.

After updates, run `npm run build:safari` with the signing variables again, then `npm run install:safari`. Reopen the app and re-enable the extension if needed. An unpacked Chrome reload does not update the installed Safari app.

### Chrome (direct delivery)

1. Clone this repository and load its `browser/` directory as an unpacked extension in `chrome://extensions`. Allow file URL access if reviewing local HTML.
2. Reopen the OpenCode terminal client. The plugin registers the native host and active sessions automatically on macOS; the shared service needs no restart. The host allows only this companion's fixed extension ID, resolves Node absolutely, starts on demand and opens no HTTP port.
3. Open the extension panel and choose a destination. If automatic setup reports an error, run `npm run install:bridge` in the clone to repair it.

Click the destination beside **To** to filter sessions by title or directory and sort by recent activity, creation or title. The picker refreshes automatically and shows current session titles. **New session** creates an empty session with the chosen session's location/model, or the blank OpenCode home's current selection, without starting a model turn. **Disconnect** keeps the destination named and notes local; choosing that session again reconnects. A disconnected destination never silently switches to another session. Restarted receivers reconnect by stable provider/session identity, carrying any retry batch to the replacement.

Choose **Pick element**, drag a rectangle with **Select area**, or select text directly, then write a comment or question. Unsent areas stay marked: click a dashed outline or badge to activate it, drag the rectangle to move it, or drag a handle to resize. Esc cancels an adjustment. Area notes include the rectangle's position, visible text, and element hints, without a screenshot. **Send N notes & continue** saves current feedback and sends all pending notes across pages; **Add note** collects feedback locally. Cmd/Ctrl+Enter adds a note or saves an edit. Confirmed sends use `steer` / `resume: true`: idle sessions start immediately and running turns receive feedback at their next processing boundary. Registering, creating sessions and saving notes make no model call. Switching terminal tabs never changes the captured destination.

The queue groups notes by page, with contiguous numbers matching page markers and delivered Markdown. Click a note's quoted target to show it on its page without activating the element; off-page notes can open their page. **Edit** changes the feedback, and **Undo** restores a deleted note. The delivery bar shows the whole round's count and destination; drafts remain page-local.

**Clear** in the notes header removes every unsent note in the round; each page group has its own **Clear**. One **Undo** restores the whole removed batch. Drafts, delivered history and **Restore last round** stay intact. Clearing the round drops a pending retry batch only after inline confirmation.

Each send closes the global review round: delivered notes leave the list and the panel is ready for the next round. **Restore last round** returns the most recent round's notes across pages; the last ten rounds are kept globally.

**Send** and **Copy instead** remain separate actions. Send requires a live destination; Copy instead copies the grouped round as Markdown for any agent and closes it the same way. If a session drops during Send, notes remain available for retry or copying. **More review options** contains a non-closing Markdown copy, JSON export, and a preview of the current round.

After a page reload or same-site navigation, the panel reconnects its page tools automatically. If Chrome has withdrawn access (for example after moving to another site), the panel asks you to click the extension icon once; saved notes are kept.

### Explicit routing

Plain `/annotate`, `/annotate-file`, `/annotate-pick` and `/annotate-selection` use the TUI; text and config paths do too. Explicit URLs and HTML paths passed to `/annotate` enter the browser workflow. A reply containing HTML links or code fences does not change the default.

### Browser safeguards and limitations

Picking and text selection work inside same-origin iframes, legacy framesets and
nested frames. Reveal and page markers can find those notes after reload; delivered
Markdown includes a `Frame:` line for frame context. Cross-origin frames cannot be
picked and show a clear message. After updating to 0.17.0 (browser protocol 8), reload
the Chrome extension and restart OpenCode.

Written drafts autosave locally and restore after panel reload or a return to the same URL, including SPA routes. Selecting another target with unfinished feedback offers **Add/Save & switch**, **Keep editing**, or **Discard & switch**. Storage failures keep the input and offer a retry; competing panels require an explicit choice of draft. Saved-note revision checks likewise prevent stale tabs overwriting newer feedback. Full JSON/Markdown exports include redacted URLs, exact selected text/context, verified selector hints, styles and accessibility. Missing/changed/ambiguous targets are labeled in the sidebar instead of silently rebound. Comments and drafts live in extension-owned UI/storage; the page receives only selection metadata and numbered markers, not your written feedback.

Native delivery requires an open local TUI and a connected destination. If the receiver closes, feedback stays pending. A failed batch retains its original target and ID for safe retry; if that session is permanently gone, export the notes before starting a new review. **Retry N notes & continue** retries that original batch; newly composed feedback stays local for the next send. Copying a round instead supersedes a failed batch. Clipboard failures expose a selectable preview and keep the round open. Browser-internal pages, PDF, cross-origin iframes, Canvas and remote SSH TUI clients are outside this version's scope. Page Context is retired only after exporting its drafts and verifying this replacement.

See [implementation plan](docs/annotate-html-integration-plan.md) and [shipped-artifact evaluation](docs/annotate-html-evaluation.md), plus [browser provenance](browser/UPSTREAM.md). `npm test`, `npm run test:smoke`, and `npm run test:browser` verify each layer; the browser test uses an existing Playwright installation (`PLAYWRIGHT_MODULE`) and browser executable (`CHROMIUM_PATH`) in an isolated profile.

### Reload after browser companion updates

After updating the unpacked `browser/` files, open `chrome://extensions` and click **Reload** for **OpenCode Annotate**. Return to the target webpage and open Annotate using its extension icon or **Alt+Shift+A**.

A newly opened sidebar can load the updated `panel.mjs` while Chrome still runs an older `worker.mjs`. The panel detects this protocol mismatch and shows **Annotate was updated** with a **Reload Annotate** button; reopen the panel afterwards. Saved extension-local data survives an extension reload.

For diagnosis, compare the running worker's source (DevTools/CDP `Debugger.getScriptSource`) with `browser/worker.mjs` in the loaded checkout. The manifest version alone cannot identify edits to an unpacked extension.

## Review and send

1. Run `/annotate` or `/annotate path/to/file.md`.
2. Select text by dragging, or press `v` and move.
3. Press `c` to comment, `w` for **what?** ([what? notes](#what-notes)), `a` for "looks good," or `d` to request deletion. Without a selection, `c` comments on the current block. Enter saves a comment; with a selection waiting, Enter records **Done**, `g` records **Get**. Esc dismisses. The compact toolbar shows approve, comment, Done and Get; `w`, `d` and `y` are keyboard-only. Press `y` to copy the selected source.
4. Press **`q`** to send your notes and return to OpenCode.

For PNG toolbar artwork in a verified Kitty-graphics terminal, see the [local image-toolbar configuration](tui/README.md#local-image-toolbar-trial). Artwork is user-supplied; unconfigured terminals keep Unicode icons.

### Chinese and other input methods

An input method holds plain letters while it composes, so review keys such as `e`, `q` and `s`, and OpenCode's permission shortcuts, do nothing. With [Slash Saver](https://github.com/nxxxsooo/slash-saver) 1.1+ installed in `/Applications`, the plugin selects its configured ASCII source while you browse a review or answer a permission prompt, and restores your source afterwards. The comment and edit boxes switch back to your writing source while open. Set `"inputSource": false` in the plugin's `options` to turn this off, or a path to another helper with the same `input-source current|select|ascii` commands. The reviewer also binds **`Ctrl+E`** to edit, which an input method passes through.

Opening a review makes no model call. Confirming sends a normal user prompt and resumes the **original session**, even if the active tab changes. Empty and cancelled reviews submit nothing.

## Updates and uninstall

`@latest` selects the npm release channel. OpenCode caches installed packages; it does not follow this repository's commits. Update just this plugin with:

```sh
opencode plugin update @nxxxsooo/opencode-annotate@latest
```

Run `/reload` if the command list has not refreshed. Check the installed version with `opencode plugin list`.

To remove it:

```sh
opencode plugin remove @nxxxsooo/opencode-annotate@latest
```

## Configuration

### Automatically review long replies

Enable auto-annotation in the plugin entry in **`opencode.jsonc`** (or `opencode.json`):

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "@nxxxsooo/opencode-annotate@latest",
      "options": {
        "autoAnnotate": true,
        "autoAnnotateThreshold": 2000, // Open when the reply exceeds this many characters.
      },
    },
  ],
}
```

Add these options to your existing entry, keeping any other options. Auto-annotation is **off by default**; set `autoAnnotate` to `false` to disable it. The threshold defaults to **2,000 characters** and accepts a non-negative integer; `0` reviews every non-empty reply. It counts Unicode characters in the trimmed reply text, including Markdown and code, excluding reasoning and tool output. A reply exactly at the threshold does not open.

After a successful turn, a new qualifying reply in the active session opens the normal reviewer once. Progress updates, failed or interrupted turns, historical replies and background sessions do not trigger it. A reply is skipped if another review is open, you switch sessions before it opens, or a new turn starts. Dismissing the reviewer or reloading the plugin does not reopen that reply. Sending remains your explicit action. OpenCode reloads saved configuration automatically; use `/reload` if needed.

### What? notes

A `what?` note stays short in the review. When you send, the feedback adds one instruction after all the notes: explain each marked passage in plain language with more detail and a concrete example where it helps, relate it to the current task, and hold any pending action until you confirm. Change or remove that instruction in `~/.config/opencode-annotate/tui.toml`; an empty string sends the notes alone:

```toml
[prompts]
what = "Explain each passage marked what? in two sentences, then stop."
```

If OpenCode has a skill with ID `what`, the plugin attaches it to the sent feedback, the same as mentioning `@what`. That skill can then hold pending work and ask whether to continue. Choose another skill or turn this off with the `whatSkill` plugin option:

```jsonc
"options": { "whatSkill": "explain" } // or false
```

A missing default `what` skill is skipped. A missing skill that you set yourself stops the send with an error and keeps the draft and `feedback.md`.

### Reviewer binary and layout

The bundled reviewer is selected automatically. Use `binary` only to override it with another locally built Annotate TUI executable:

```json
{
  "plugins": [
    {
      "package": "@nxxxsooo/opencode-annotate@latest",
      "options": { "binary": "/path/to/annotate-tui" }
    }
  ]
}
```

The adapter launches Annotate TUI in the current terminal. Layout and key settings live in `~/.config/opencode-annotate/tui.toml`; font family and size belong to the terminal. The adapter supplies `PLANNOTATOR_TUI_THEME` to follow OpenCode's light/dark mode. The existing environment and annotation-field names are local protocol identifiers; they do not connect to or install another project.

<details>
<summary id="draft-recovery">Draft recovery</summary>

Each review has its own private temporary source and annotation store. Successful, empty and cancelled reviews are cleaned up. Failures and archived notes retain the store, and a status message gives its directory.

`review.json` records the session, original source and relative `snapshot` path. `feedback.md` holds exported feedback when available. To recover a retained review:

```sh
PLANNOTATOR_DATA_DIR="<retained-directory>/data" \
  npx --package @nxxxsooo/opencode-annotate annotate-tui "<retained-directory>/<snapshot>"
```

Use the `snapshot` value from `review.json`. Press `H` to restore archived notes, then `E` to copy them for pasting into OpenCode. An **E → F** archive is preserved even when `--export` reports "No annotations."
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

Rust 1.96+ is needed to build from source. Unit tests use the bundled annotation/export binary, including theme inheritance tests. The optional smoke test also requires Python 3, tmux and OpenCode. It runs a detached terminal, verifies commands and feedback through the actual API, then removes its test session. Its submission uses `resume: false`, so it makes no model call or visible window.

Set `ANNOTATE_TUI_BINARY` to test a custom binary or launcher through the plugin's real configuration path. For a build with a centered 120-column viewport, also set `ANNOTATE_EXPECT_MARGIN=10` to assert blank margins in the 140-column smoke terminal. These variables configure the test, not the shipped plugin.

For development loading, set the plugin entry in `opencode.json(c)` to this checkout's absolute directory, preserving its `options`, and run `/reload`. Remove any duplicate entry in `cli.json`. The older `npm run install:plugin` helper switches **only the TUI** entry in `cli.json`; use it only for TUI-only development.

See [release instructions](docs/releasing.md) and [changelog](CHANGELOG.md).
</details>

## 中文速用

这是**非官方 OpenCode 批注插件**：文本用本仓库 `tui/` 中的 Annotate TUI，网页用 Chrome 伴随扩展。

- `/annotate`：批注上一条完整回复。
- `/annotate 文档.md`：批注文档，支持中文、空格和相对路径。
- `/annotate-file [关键词]`：从当前会话目录及其子目录中选择文本或配置文件。
- `/annotate-pick`：从最近的回复和运行中的进度说明里选一条批注。
- `/annotate-selection`：先在会话里拖选文字，再批注包含这段文字的消息。
- 0.16.0 移除 `/ref` 和代理会话搜索／读取工具，交由 Another 提供跨代理引用：安装 Another 0.28.0 或更高版本并运行 `another setup` 即可。原有插件配置继续有效，请移除 `annotate_session_*` 权限规则。
- `/annotate 页面.html`、`/annotate https://…`：打开网页批注。Chrome 自动注册主机和会话，扩展目的地菜单可筛选、新建空会话、断开及重连；Safari 保持仅复制。跨页备注汇成一轮，Send 与 Copy instead 分开，确认发送后自动继续原会话。
- 选中文字 → `c` 写批注 → Enter 保存 → `q` 发送并返回。
- 写批注中途按 `Ctrl+S`，一步保存、返回并发送（中文输入法开着也有效）；`Ctrl+C` 返回后由 OpenCode 询问。
- 文档采用独立快照，反馈附原文件路径，确认后发回发起批注的会话。
- 更新：`opencode plugin update @nxxxsooo/opencode-annotate@latest`，命令未刷新时运行 `/reload`。

MIT licensed. Original terminal-reviewer copyright notices are preserved in [tui/LICENSE](tui/LICENSE).
