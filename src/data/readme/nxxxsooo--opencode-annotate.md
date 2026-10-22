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
/annotate 2                       Review the second most recent reply
/annotate 3                       Review the third most recent reply
/annotate docs/plan.md            Review a Markdown document
/annotate "docs/release plan.md"  Review a path containing spaces
/annotate ~/Documents/notes.txt   Review a plain-text document
/annotate page.html              Review the specified local HTML in Chrome
/annotate https://example.com    Review the specified webpage
/annotate web                    Open this session for browser pairing
/annotate web off                Revoke this session's browser pairing
```

`/annotate-last` always reviews the latest completed reply; any supplied argument is ignored.

## Install

Requires **OpenCode 2.0.22+** and a separately installed `plannotator-tui` on your PATH.
Tested with OpenCode 2.1.1 and Plannotator TUI 0.9.4 on macOS; unit tests also run on
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

## Browser review (optional)

Requirements: macOS and Chrome 116+, plus Node 22+ for the native host.

1. Clone this repository and load its `browser/` directory as an unpacked extension in
   `chrome://extensions`. Allow file URL access if reviewing local HTML.
2. Run `npm run install:bridge` in the clone to register the native host. It allows only this
   companion's fixed extension ID and resolves Node absolutely. The host starts on demand and
   opens no HTTP port.
3. Reopen the OpenCode terminal client; the shared service needs no restart.

Run `/annotate web` in a target session, then open the Chrome extension. A sole live
session is shown automatically; with several sessions, choose one once. **Change**
opens the optional session selector. The target title is always visible, with its directory
available on hover. A sole target is only preselected: no binding or model turn occurs until
the user clicks **Send & continue**. A disconnected destination never silently switches to another session.

Pick an element or select text, write feedback, then click **Send & continue**. It saves
the current feedback and sends it in one action; **Save note** remains available for batching.
This sends pending notes to that captured
session and starts a normal model turn; pairing and saving notes make no model call.
Switching terminal tabs never changes the paired target. Revoke with `/annotate web off`.

### Explicit routing

No argument or a reply number always means TUI. Markdown/plain text files also use TUI.
Only explicit `.html`/`.htm` paths, HTTP/HTTPS URLs, HTML file URLs, or `web` enter the browser
workflow. A reply containing HTML links or code fences does not change the default.

### Browser safeguards and limitations

Saved notes survive reloads and are isolated by URL, including SPA routes. Per-note revision
checks prevent stale tabs overwriting newer feedback. Full JSON/Markdown exports include
redacted URLs, exact selected text/context, verified selector hints, styles and accessibility.
Missing/changed/ambiguous targets are labeled in the sidebar instead of silently rebound.
Comments and drafts live in extension-owned UI/storage; the page receives only selection
metadata and numbered markers, not your written feedback.

Native delivery requires an open, paired local TUI. If the receiver closes, feedback stays
pending. A failed batch retains its original target and ID for safe retry; if that target
is permanently gone, export the notes before starting a new review. Sent-note edits become
new revisions. Clipboard failures expose a selectable preview. Browser-internal pages, PDF,
cross-origin iframes, Canvas and remote SSH TUI clients are outside this version's scope.
Page Context is retired only after exporting its drafts and verifying this replacement.

See [implementation plan](docs/annotate-html-integration-plan.md) and
[shipped-artifact evaluation](docs/annotate-html-evaluation.md), plus
[browser provenance](browser/UPSTREAM.md). `npm test`, `npm run test:smoke`, and
`npm run test:browser` verify each layer; the browser test uses an existing Playwright installation
(`PLAYWRIGHT_MODULE`) and browser executable (`CHROMIUM_PATH`) in an isolated profile.

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
- `/annotate 2`：批注倒数第二条，`3`、`4` 依次往前；`1` 等同于默认。
- `/annotate 文档.md`：批注文档，支持中文、空格和相对路径。
- `/annotate-last`：固定批注最新一条完整回复，忽略附带参数。
- `/annotate 页面.html`、`/annotate https://…`、`/annotate web`：在 Chrome 中批注网页；`/annotate web off` 撤销配对。
- 选中文字 → `c` 写批注 → Enter 保存 → `q` 返回 →「Send and continue」。
- 文档采用独立快照，反馈附原文件路径，确认后发回发起批注的会话。
- 更新：`opencode plugin update @nxxxsooo/opencode-annotate@latest`，然后重新打开终端客户端。

MIT licensed. The annotation UI is maintained upstream by the Plannotator project.
