# OpenCode Annotate

**Review OpenCode AI replies, Markdown documents, and webpages — send annotated feedback to the originating session.**

[![npm](https://img.shields.io/npm/v/@nxxxsooo/opencode-annotate)](https://www.npmjs.com/package/@nxxxsooo/opencode-annotate)
[![CI](https://github.com/nxxxsooo/opencode-annotate/actions/workflows/ci.yml/badge.svg)](https://github.com/nxxxsooo/opencode-annotate/actions/workflows/ci.yml)
[![MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

[Website](https://mjshao.fun/opencode-annotate/) · [Install](#install) · [Workflows](#workflows) · [Browser review](#browser-review-optional) · [References](#reference-previous-conversations) · [Configuration](#configuration)

This **unofficial OpenCode plugin** bundles the native [terminal reviewer](tui/README.md) — no separate reviewer install is required. The optional [browser companion](#browser-review-optional) adds Chrome delivery and Safari copy-only review. Published on npm as `@nxxxsooo/opencode-annotate`.

| Surface | Reviews | Entry point |
|---|---|---|
| Terminal (bundled TUI) | AI replies, Markdown, plain text | `/annotate` |
| Chrome (optional) | Webpages, local HTML | `/annotate-web` |
| Safari (optional, copy-only) | Webpages | `/annotate-web` |

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

**`Ctrl+S`** saves the current comment and sends in one step. The header's **Send N back (q)** button does the same as `q`. **`Ctrl+C`** returns without sending, and OpenCode asks whether to send. `E` and `S` send as well, following any `[keys]` rebinding.

<a id="what-it-reviews"></a>

## Workflows

### Annotate AI responses

`/annotate` opens the last completed reply. `/annotate-pick` chooses from recent replies and progress updates. `/annotate-selection` opens the message containing your last transcript selection. Reasoning, tool-call commentary, and in-progress messages are excluded.

`/annotate-last` always reviews the latest completed reply; any supplied argument is ignored. For a selection that spans messages, `/annotate-selection` reviews just the selected text.

### Review Markdown and text documents

```text
/annotate docs/plan.md            # Review a Markdown document
/annotate "docs/release plan.md"  # Path with spaces
/annotate ~/Documents/notes.txt   # Plain text
```

Local UTF-8 `.md`, `.mdx`, `.markdown` and `.txt` files up to 2 MiB. Relative paths resolve against the captured session's working directory, not the directory from which the terminal client happened to start. Absolute and `~/` paths work too. The file must exist on the machine running the terminal client.

The reviewer reads a fixed snapshot and does not edit the original file. Feedback includes the original path and snapshot hash, with instructions to re-read the current file before applying suggestions. Document review works even before the session has an assistant reply.

### Browser webpage feedback

Run `/annotate-web` to pair the current session with the Chrome extension, then open the extension panel on any webpage. Select text or pick an element, write notes, and send them back to the paired session.

```text
/annotate-web                     # Pair this session
/annotate-web page.html           # Review a local HTML file
/annotate-web https://example.com # Review a webpage
/annotate-web off                 # Revoke this session's browser pairing
```

<p align="center">
  <img src="https://raw.githubusercontent.com/nxxxsooo/opencode-annotate/main/docs/assets/browser-review.png" alt="Chrome extension panel with a saved webpage comment and an explicit Send 1 note button" width="440">
  <br>
  <em>Real extension panel with synthetic page feedback; captured in an isolated headless tab.</em>
</p>

Browser setup is separate from the plugin install. Safari supports local notes and copying only; see [Browser review](#browser-review-optional) below.

### Reference previous conversations

Run `/ref` to search and attach a past conversation as context. The source is queued with `resume: false` so an idle assistant stays idle until your next prompt.

```text
/ref                             # Choose a conversation from this project
/ref authentication              # Search titles in this project
/ref --all authentication        # Search titles across projects
/ref ses_…                       # Attach a specific conversation
```

Two Code Mode tools are registered for agent use: `annotate.session_search` and `annotate.session_read`.

## Command reference

```text
/annotate                         Review the last completed assistant reply
/annotate-last                    Review the latest reply, ignoring arguments
/annotate docs/plan.md            Review a Markdown document
/annotate "docs/release plan.md"  Review a path containing spaces
/annotate ~/Documents/notes.txt   Review a plain-text document
/annotate-pick                    Choose a recent reply or mid-turn progress update
/annotate-selection               Review the message containing your last transcript selection
/annotate-web                     Pair this session, or create an empty one from home
/annotate-web page.html           Review the specified local HTML in Chrome
/annotate-web https://example.com Review the specified webpage
/annotate-web off                 Revoke this session's browser pairing
/ref                             Choose a conversation from this project
/ref authentication              Search conversation titles in this project
/ref --all authentication        Search titles across projects
/ref ses_…                       Attach a specific conversation
```

Numbered `/annotate N` is retired.

## Upgrading from the TUI-only package

`opencode-annotate` replaces `opencode-plannotator-tui` (0.4.2 and earlier). To switch, run `opencode plugin remove opencode-plannotator-tui@latest` and then install this package as shown above.

Move its entry from `cli.json` to `opencode.json(c)`, retaining the whole entry and any `options`. Keep one entry so the TUI is loaded once. A remaining CLI-only installation provides `/ref` and annotation commands, but cannot register the agent tools.

## Reference another conversation

Run `/ref` or `/ref <title words>`, select the source, add an optional comment, then choose **Attach reference**. The comment field grows as you type or paste, wraps long lines, and scrolls at a screen-aware height limit. **Shift+Enter** adds a line, **Enter** continues to confirmation, and **Esc** cancels. The confirmation names both conversations and shows whether the text is an excerpt. The source is attached to the session where you invoked `/ref`, even if you switch tabs. It is queued as historical context with `resume: false`: an idle assistant stays idle until your next prompt. An already-running session can consume it at a later queue boundary.

Search defaults to the current session's project, including its worktrees. `/ref --all` searches every project on the connected server. Titles can be ambiguous, so title searches always show a chooser with directory, time and session ID. An exact `ses_…` ID selects that source directly, including a source in another project.

The server part adds two Code Mode tools:

- `annotate.session_search`: title search, with `query`, optional `allProjects`, `limit`
  and `cursor`. It excludes the current conversation and child sessions. Repeat
  `allProjects: true` when paging a cross-project search.
- `annotate.session_read`: read by `sessionID`; pass `nextCursor` back as `cursor` for
  older history. For a shortened message, pass its `messageID` and `nextOffset` as
  `offset` to retrieve the rest.

References include user text and completed assistant text, source IDs and timestamps. Tool payloads, reasoning, binary attachments and unfinished output are excluded. Each page contains at most 24,000 characters of message text, distributed across the messages; truncation and continuation are explicit. Historical claims may no longer match the code. Search matches titles, not words inside messages.

**Server requirement:** the full-history read tool uses the official `opencode api` command because OpenCode 2.2's plugin context exposes only post-compaction context. The server must run as the managed OpenCode service with `opencode` on PATH. A process-ID check rejects a different discovered server. `/ref` uses the TUI's connected client directly.

Permission actions are `annotate_session_search` (project ID, or `*` for cross-project search) and `annotate_session_read` (source session ID).

<details>
<summary id="reference-verification">Reference verification</summary>

`npm run test:references` exercises the server tools and `/ref` against source or an extracted npm package. The checks cover pre-compaction history, API responses larger than 256 KiB, pagination, long-message continuation, attachment and cancellation without a model turn. Unit checks also cover tab changes, permission denial and private-file cleanup.

Recovery starts in `reference-command.mjs` for `/ref`, `session-tools.mjs` for agent tools, and `session-reference.mjs` for bounded history. `server-history.mjs` captures CLI output in private temporary files to avoid v2.2.0 pipe truncation, then removes them. Regression entrypoints are `session-reference.test.mjs`, `server-history.test.mjs` and `tests/references-smoke.py`; release ownership remains in [docs/releasing.md](docs/releasing.md).
</details>

## Antigravity (AGY) support

`opencode-annotate` provides companion support for Google Antigravity CLI (`agy`) via `agy-annotate`:

- **Slash commands `/annotate` & `/annotate-web`**: Built-in AGY skill at `agy/skills/annotate/` handles review directly within active AGY sessions.
- **Interactive TUI**: Uses the same bundled reviewer as OpenCode, with Dracula theme inheritance and one-key send.
- **Native Delivery**: Hooks into AGY lifecycle (`SessionStart`, `PreInvocation`, `Stop`) to deliver feedback directly into the conversation turn without network listeners.
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

Set the plugin option `"browser": "Safari"` so `/annotate-web <url-or-html-file>` opens the page in Safari. The only public values are `"Chrome"` (default) and `"Safari"`; Chrome maps to the macOS app Google Chrome. AGY supports the same choice with `agy-annotate web <url> --browser Safari`. Restart the client after changing the option. `/annotate-web` keeps its existing pairing lifecycle; Safari ignores that pairing and copies notes instead. `/annotate` remains the text/TUI command.

After updates, run `npm run build:safari` with the signing variables again, then `npm run install:safari`. Reopen the app and re-enable the extension if needed. An unpacked Chrome reload does not update the installed Safari app.

### Chrome (direct delivery)

1. Clone this repository and load its `browser/` directory as an unpacked extension in `chrome://extensions`. Allow file URL access if reviewing local HTML.
2. Run `npm run install:bridge` in the clone to register the native host. It allows only this companion's fixed extension ID and resolves Node absolutely. The host starts on demand and opens no HTTP port.
3. Reopen the OpenCode terminal client; the shared service needs no restart.

Run `/annotate-web`, then open the Chrome extension. From the blank home screen, it creates an empty session in the current directory using the selected model; no first prompt is needed. In an existing session, it pairs that session. A sole live session is shown automatically; with several sessions, choose one once. Click the destination beside **To** to change or refresh it. Its title stays visible beside Send, including while disconnected, with its directory available on hover and in the chooser. A sole target is only preselected: no binding or model turn occurs until the user clicks **Send & continue**. A disconnected destination never silently switches to another session.

Choose **Pick element** or select text, then write a comment or question. The composer appears for that selection. **Send N notes & continue** saves the current feedback and sends pending notes in one action; **Add note** collects feedback locally for a batch. Cmd/Ctrl+Enter adds a note or saves an edit. This sends pending notes to that captured session and starts a normal model turn; pairing and saving notes make no model call. Switching terminal tabs never changes the paired target. Revoke with `/annotate-web off`.

The numbered queue matches the page markers. Click a note's quoted target to show it on the page without activating the element; **Edit** changes the feedback, and **Undo** restores a deleted note. The delivery bar shows the round's note count and destination.

Each send closes a review round: delivered notes leave the list and the panel is ready for the next round. **Restore last round** returns the most recent delivered notes to the list; the last ten rounds per page are kept.

Delivery has two modes, shown beside the destination. With a **Live** session the primary button is **Send N notes**, and the copy icon beside it copies the round instead. When the session is **Offline**, or none is connected, the button is **Copy N notes**: it copies the round as Markdown for any agent and closes it the same way. Run `/annotate-web` in a session to switch back to Send. If a session drops during Send, the notes are kept and the panel switches to Copy. **More review options** contains a non-closing Markdown copy, JSON export, and a preview of the current round.

After a page reload or same-site navigation, the panel reconnects its page tools automatically. If Chrome has withdrawn access (for example after moving to another site), the panel asks you to click the extension icon once; saved notes are kept.

### Explicit routing

`/annotate`, `/annotate-pick` and `/annotate-selection` always use the TUI; Markdown and plain-text files do too. Only `/annotate-web` enters the browser workflow; passing a URL or HTML file to `/annotate` points you there. A reply containing HTML links or code fences does not change the default.

### Browser safeguards and limitations

Written drafts autosave locally and restore after panel reload or a return to the same URL, including SPA routes. Selecting another target with unfinished feedback offers **Add/Save & switch**, **Keep editing**, or **Discard & switch**. Storage failures keep the input and offer a retry; competing panels require an explicit choice of draft. Saved-note revision checks likewise prevent stale tabs overwriting newer feedback. Full JSON/Markdown exports include redacted URLs, exact selected text/context, verified selector hints, styles and accessibility. Missing/changed/ambiguous targets are labeled in the sidebar instead of silently rebound. Comments and drafts live in extension-owned UI/storage; the page receives only selection metadata and numbered markers, not your written feedback.

Native delivery requires an open, paired local TUI. If the receiver closes, feedback stays pending. A failed batch retains its original target and ID for safe retry; if that target is permanently gone, export the notes before starting a new review. **Retry N notes & continue** retries that original batch; newly composed feedback stays local for the next send. Copying a round instead supersedes a failed batch. Clipboard failures expose a selectable preview and keep the round open. Browser-internal pages, PDF, cross-origin iframes, Canvas and remote SSH TUI clients are outside this version's scope. Page Context is retired only after exporting its drafts and verifying this replacement.

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
npm run test:references
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
- `/annotate-pick`：从最近的回复和运行中的进度说明里选一条批注。
- `/annotate-selection`：先在会话里拖选文字，再批注包含这段文字的消息。
- `/annotate-last`：固定批注最新一条完整回复，忽略附带参数。
- `/ref`：选择并引用同项目的历史会话，可附留言；留言框随内容自动增高、换行，超长时滚动。Shift+Enter 换行，Enter 进入确认，Esc 取消。`/ref --all 关键词` 跨项目搜索；`/ref ses_…` 直接指定。确认后附加上下文，不启动空闲助手。
- `/annotate-web`：配对 Chrome；空白首页会先创建空会话，无需先发提示词。`/annotate-web 页面.html`、`/annotate-web https://…` 批注网页；`/annotate-web off` 撤销配对。
- 选中文字 → `c` 写批注 → Enter 保存 → `q` 发送并返回。
- 写批注中途按 `Ctrl+S`，一步保存、返回并发送（中文输入法开着也有效）；`Ctrl+C` 返回后由 OpenCode 询问。
- 文档采用独立快照，反馈附原文件路径，确认后发回发起批注的会话。
- 更新：`opencode plugin update @nxxxsooo/opencode-annotate@latest`，命令未刷新时运行 `/reload`。

MIT licensed. Original terminal-reviewer copyright notices are preserved in [tui/LICENSE](tui/LICENSE).
