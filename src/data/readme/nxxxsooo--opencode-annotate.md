# OpenCode Annotate

[![npm](https://img.shields.io/npm/v/@nxxxsooo/opencode-annotate)](https://www.npmjs.com/package/@nxxxsooo/opencode-annotate)
[![CI](https://github.com/nxxxsooo/opencode-annotate/actions/workflows/ci.yml/badge.svg)](https://github.com/nxxxsooo/opencode-annotate/actions/workflows/ci.yml)
[![MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

**Annotate replies, documents, or live HTML pages, then send feedback to the originating OpenCode session.**

This is an **unofficial OpenCode plugin**. [Plannotator TUI](https://github.com/plannotator/plannotator-tui)
provides text review; the [Annotate HTML-derived browser companion](browser/UPSTREAM.md)
provides webpage review. This repository owns explicit routing, native messaging,
session targeting, terminal handoff and confirmed feedback delivery.

Published on npm as `@nxxxsooo/opencode-annotate`. It replaces `opencode-plannotator-tui`
(0.4.2 and earlier); to switch, run
`opencode plugin remove opencode-plannotator-tui@latest` and then install this package as below.

```text
/annotate                         Review the last completed assistant reply
/annotate docs/plan.md            Review a Markdown document
/annotate "docs/release plan.md"  Review a path containing spaces
/annotate ~/Documents/notes.txt   Review a plain-text document
/annotate-pick                    Choose a recent reply or mid-turn progress update
/annotate-selection               Review the message containing your last transcript selection
/annotate-web                     Open this session for browser pairing
/annotate-web page.html           Review the specified local HTML in Chrome
/annotate-web https://example.com Review the specified webpage
/annotate-web off                 Revoke this session's browser pairing
```

`/annotate-last` always reviews the latest completed reply; any supplied argument is ignored.

Progress updates written during a long tool run are not replies, so `/annotate` skips them.
Reach them with `/annotate-pick`, or drag over text in the transcript and run
`/annotate-selection`: the plugin opens the reply or progress update containing that text,
or just the selected text when it spans messages. Numbered `/annotate N` is retired.

## Install

Requires **OpenCode 2.0.22+** and a separately installed `plannotator-tui` on your PATH.
Tested with OpenCode 2.1.2 and Plannotator TUI 0.9.4 on macOS; unit tests also run on
Linux. Windows terminal handoff has not been verified.

Install the upstream TUI on macOS or Linux:

```sh
brew install plannotator/tap/plannotator-tui
```

Homebrew 6 may first require `brew trust plannotator/tap`. Alternatively, use
`cargo install plannotator-tui --locked` or the upstream
[prebuilt binaries](https://github.com/plannotator/plannotator-tui/releases).

Then install the plugin:

```sh
opencode plugin add @nxxxsooo/opencode-annotate@latest
```

OpenCode detects its TUI-only entrypoint and adds it to your global **`cli.json`**.
It does not need a server-plugin entry. Reopen the terminal client if its command
list has not refreshed.

Manual configuration, preserving other entries:

```json
{
  "plugins": ["@nxxxsooo/opencode-annotate@latest"]
}
```

### Match OpenCode's colors (fork required)

Set `"inheritTheme": true` in the plugin's `options`, alongside `binary`. It requires
the extended color-capable Plannotator fork
([nxxxsooo/plannotator-tui](https://github.com/nxxxsooo/plannotator-tui), branch
`local/opencode`); upstream 0.9.4 does not support it. The same branch adds `[ui].doc_width`
to cap the text column on wide terminals (proposed upstream in
[plannotator/plannotator-tui#108](https://github.com/plannotator/plannotator-tui/pull/108)). See [TUI theme integration](docs/tui-theme.md).

Each review uses OpenCode's current resolved colors for the canvas, text, Markdown,
borders, highlights, cursor and selection. The plugin asks the chosen binary for its
effective configuration, copies it into that review's private directory, and validates
the themed copy before taking over the terminal. Your original settings stay intact.
Launchers must honor an existing `PLANNOTATOR_TUI_CONFIG`.

## Browser review (optional)

Requirements: macOS and Chrome 116+, plus Node 22+ for the native host.

1. Clone this repository and load its `browser/` directory as an unpacked extension in
   `chrome://extensions`. Allow file URL access if reviewing local HTML.
2. Run `npm run install:bridge` in the clone to register the native host. It allows only this
   companion's fixed extension ID and resolves Node absolutely. The host starts on demand and
   opens no HTTP port.
3. Reopen the OpenCode terminal client; the shared service needs no restart.

Run `/annotate-web` in a target session, then open the Chrome extension. A sole live
session is shown automatically; with several sessions, choose one once. Click the
destination beside **To** to change or refresh it. Its title stays visible beside Send,
including while disconnected, with its directory available on hover and in the chooser.
A sole target is only preselected: no binding or model turn occurs until
the user clicks **Send & continue**. A disconnected destination never silently switches to another session.

Choose **Pick element** or select text, then write a comment or question. The composer
appears for that selection. **Send N notes & continue** saves the current feedback and
sends pending notes in one action; **Add note** collects feedback locally for a batch.
Cmd/Ctrl+Enter adds a note or saves an edit. This sends pending notes to that captured
session and starts a normal model turn; pairing and saving notes make no model call.
Switching terminal tabs never changes the paired target. Revoke with `/annotate-web off`.

The numbered queue matches the page markers. Click a note's quoted target to show it
on the page without activating the element; **Edit** changes the feedback, and **Undo**
restores a deleted note. The delivery bar shows the round's note count and destination.

Each send closes a review round: delivered notes leave the list and the panel is ready
for the next round. **Restore last round** returns the most recent delivered notes to the
list; the last ten rounds per page are kept.

Delivery has two modes, shown beside the destination. With a **Live** session the primary
button is **Send N notes**, and the copy icon beside it copies the round instead. When the
session is **Offline**, or none is connected, the button is **Copy N notes**: it copies the
round as Markdown for any agent and closes it the same way. Run `/annotate-web` in a
session to switch back to Send. If a session drops during Send, the notes are kept and the
panel switches to Copy.
**More review options** contains a non-closing Markdown copy, JSON export, and a preview
of the current round.

After a page reload or same-site navigation, the panel reconnects its page tools
automatically. If Chrome has withdrawn access (for example after moving to another site),
the panel asks you to click the extension icon once; saved notes are kept.

### Explicit routing

`/annotate`, `/annotate-pick` and `/annotate-selection` always use the TUI; Markdown and
plain-text files do too. Only `/annotate-web` enters the browser workflow; passing a URL or
HTML file to `/annotate` points you there. A reply containing HTML links or code fences does
not change the default.

### Browser safeguards and limitations

Written drafts autosave locally and restore after panel reload or a return to the same URL,
including SPA routes. Selecting another target with unfinished feedback offers **Add/Save
& switch**, **Keep editing**, or **Discard & switch**. Storage failures keep the input and
offer a retry; competing panels require an explicit choice of draft. Saved-note revision
checks likewise prevent stale tabs overwriting newer feedback. Full JSON/Markdown exports include
redacted URLs, exact selected text/context, verified selector hints, styles and accessibility.
Missing/changed/ambiguous targets are labeled in the sidebar instead of silently rebound.
Comments and drafts live in extension-owned UI/storage; the page receives only selection
metadata and numbered markers, not your written feedback.

Native delivery requires an open, paired local TUI. If the receiver closes, feedback stays
pending. A failed batch retains its original target and ID for safe retry; if that target
is permanently gone, export the notes before starting a new review. **Retry N notes &
continue** retries that original batch; newly composed feedback stays local for the next
send. Copying a round instead supersedes a failed batch.
Clipboard failures expose a selectable preview and keep the round open. Browser-internal pages, PDF,
cross-origin iframes, Canvas and remote SSH TUI clients are outside this version's scope.
Page Context is retired only after exporting its drafts and verifying this replacement.

See [implementation plan](docs/annotate-html-integration-plan.md) and
[shipped-artifact evaluation](docs/annotate-html-evaluation.md), plus
[browser provenance](browser/UPSTREAM.md). `npm test`, `npm run test:smoke`, and
`npm run test:browser` verify each layer; the browser test uses an existing Playwright installation
(`PLAYWRIGHT_MODULE`) and browser executable (`CHROMIUM_PATH`) in an isolated profile.

### Reload after browser companion updates

After updating the unpacked `browser/` files, open `chrome://extensions` and click
**Reload** for **OpenCode Annotate**. Return to the target webpage and open Annotate
using its extension icon or **Alt+Shift+A**.

A newly opened sidebar can load the updated `panel.mjs` while Chrome still runs an
older `worker.mjs`. The panel detects this protocol mismatch and shows **Annotate was
updated** with a **Reload Annotate** button; reopen the panel afterwards.
Saved extension-local data survives an extension reload.

For diagnosis, compare the running worker's source (DevTools/CDP
`Debugger.getScriptSource`) with `browser/worker.mjs` in the loaded checkout.
The manifest version alone cannot identify edits to an unpacked extension.

## Review and send

1. Run `/annotate` or `/annotate path/to/file.md` in a session.
2. Select text by dragging, or press `v` and use movement keys.
3. Press `c` to comment, `a` for “looks good,” or `d` to request deletion.
   Without a selection, `c` comments on the current block. Enter saves a comment.
4. Press **`q`** to return to OpenCode.
5. Choose **Send and continue** to submit the annotations. Escape or **Cancel**
   cancels.

The upstream **`E`** action copies to the clipboard. This adapter's automatic
delivery path is **q → confirm** and does not need clipboard access.

With the [fork](#match-opencodes-colors-fork-required) (branch `local/opencode`; proposed
upstream in [plannotator/plannotator-tui#109](https://github.com/plannotator/plannotator-tui/pull/109)),
**`q`** with notes returns and submits them without the OpenCode dialog. **`Ctrl+S`**
does the same mid-comment, saving the comment first, and also works while a Chinese
input method is active. The header's **Send N back (q)** button does the same.
**`Ctrl+C`** returns without sending, and OpenCode asks whether to send. `E` and `S` send as well,
following any `[keys]` rebinding, and the clipboard copy and Review menu (resend, finish, archive) are hidden
because OpenCode owns delivery. Upstream binaries ignore the handoff and keep
**q → confirm**.

Opening a review makes no model call. Confirming sends a normal user prompt and
resumes the **original session**, even if the active tab changes. Empty and
cancelled reviews submit nothing.

## What it reviews

**Replies:** the latest completed text reply, with paginated history lookup.
Reasoning, in-progress messages and tool-call commentary are excluded.
Pass a positive integer to select the Nth most recent eligible reply: `1` is the
default, `2` is the previous reply, and so on. If there are too few replies, the
plugin reports that instead of opening another reply.

**Documents:** local UTF-8 `.md`, `.mdx`, `.markdown` and `.txt` files up to 2 MiB.
Relative paths resolve against the captured session's working directory, not the
directory from which the terminal client happened to start. Absolute and `~/`
paths work too. The file must exist on the machine running the terminal client.

The TUI reads a fixed snapshot and does not edit the original document. Feedback
includes the original path and snapshot hash, with instructions to re-read the
current file before applying suggestions. Document review works even before the
session has an assistant reply.

## Updates and uninstall

`@latest` selects the npm release channel. OpenCode caches installed packages;
it does not follow this repository's commits. Update just this plugin with:

```sh
opencode plugin update @nxxxsooo/opencode-annotate@latest
```

Reopen your terminal client to load updated package code. No shared background
service restart is required. Check the installed version with `opencode plugin list`.

To remove it:

```sh
opencode plugin remove @nxxxsooo/opencode-annotate@latest
```

## Configuration

Set `binary` if Plannotator TUI is installed outside the terminal client's PATH:

```json
{
  "plugins": [
    {
      "package": "@nxxxsooo/opencode-annotate@latest",
      "options": { "binary": "/path/to/plannotator-tui" }
    }
  ]
}
```

The adapter launches Plannotator TUI in the current terminal, not through Herdr;
`[herdr]` placement and popup dimensions do not affect `/annotate`. Layout is
owned by the selected binary, while font family and size belong to the terminal.
The adapter supplies `PLANNOTATOR_TUI_THEME` to follow OpenCode's light/dark mode,
overriding Plannotator TUI's configured theme. Use `binary` to select a custom
build or launcher without replacing the system installation.

## Draft recovery

Each review has its own private temporary source and annotation store. Successful,
empty and cancelled reviews are cleaned up. Failures and archived notes retain the
store, and a status message gives its directory.

`review.json` records the session, original source and relative `snapshot` path.
`feedback.md` holds exported feedback when available. To recover a retained review:

```sh
PLANNOTATOR_DATA_DIR="<retained-directory>/data" \
  plannotator-tui "<retained-directory>/<snapshot>"
```

Use the `snapshot` value from `review.json`. Press `H` to restore archived notes,
then `E` to copy them for pasting into OpenCode. An upstream **E → F** archive is
preserved even when `--export` reports “No annotations.”

## Development

```sh
npm ci
npm run check
npm run test:smoke
```

Unit tests use the real upstream annotation/export binary. The optional smoke test
also requires Python 3, tmux and OpenCode. It runs a detached terminal, verifies
commands and feedback through the actual API, then removes its test session.
Its submission uses `resume: false`, so it makes no model call or visible window.

Set `ANNOTATE_TUI_BINARY` to test a custom binary or launcher through the plugin's
real configuration path. For a build with a centered 120-column viewport, also
set `ANNOTATE_EXPECT_MARGIN=10` to assert blank margins in the 140-column smoke
terminal. These variables configure the test, not the shipped plugin.

For development loading, run `npm run install:plugin` to replace the npm entry in
`cli.json` with this checkout's absolute directory. It backs up the CLI preferences and
keeps `options.binary` and unrelated settings. Use only one installation at a time.

See [release instructions](docs/releasing.md) and [changelog](CHANGELOG.md).

## 中文速用

这是**非官方 OpenCode 批注插件**：文本用 Plannotator TUI，网页用 Chrome 伴随扩展。

- `/annotate`：批注上一条完整回复。
- `/annotate 文档.md`：批注文档，支持中文、空格和相对路径。
- `/annotate-pick`：从最近的回复和运行中的进度说明里选一条批注。
- `/annotate-selection`：先在会话里拖选文字，再批注包含这段文字的消息。
- `/annotate-last`：固定批注最新一条完整回复，忽略附带参数。
- `/annotate-web`：配对 Chrome；`/annotate-web 页面.html`、`/annotate-web https://…` 批注网页；`/annotate-web off` 撤销配对。
- 选中文字 → `c` 写批注 → Enter 保存 → `q` 返回 →「Send and continue」。
- 用 fork 时：有批注时按 `q` 直接返回并发送；写批注中途按 `Ctrl+S`，一步保存、返回并发送（中文输入法开着也有效）；`Ctrl+C` 不发送，返回后由 OpenCode 询问。
- 文档采用独立快照，反馈附原文件路径，确认后发回发起批注的会话。
- 更新：`opencode plugin update @nxxxsooo/opencode-annotate@latest`，然后重新打开终端客户端。

MIT licensed. The annotation UI is maintained upstream by the Plannotator project.
