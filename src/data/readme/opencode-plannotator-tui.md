# Plannotator TUI for OpenCode

[![npm](https://img.shields.io/npm/v/opencode-plannotator-tui)](https://www.npmjs.com/package/opencode-plannotator-tui)
[![CI](https://github.com/nxxxsooo/opencode-plannotator-tui/actions/workflows/ci.yml/badge.svg)](https://github.com/nxxxsooo/opencode-plannotator-tui/actions/workflows/ci.yml)
[![MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

**Annotate an AI reply or a document in your terminal, then send the feedback straight back to OpenCode.**

This is an **unofficial OpenCode adapter** for [Plannotator TUI](https://github.com/plannotator/plannotator-tui).
Plannotator TUI provides the annotation interface. This plugin supplies the commands,
session targeting, terminal handoff and confirmed feedback delivery. It is not an
official OpenCode or Plannotator release.

```text
/annotate                         Review the last completed assistant reply
/annotate docs/plan.md            Review a Markdown document
/annotate "docs/release plan.md"  Review a path containing spaces
/annotate ~/Documents/notes.txt   Review a plain-text document
```

`/annotate-last` is an alias with the same optional file argument.

## Install

Requires **OpenCode 2.0.22+** and a separately installed `plannotator-tui` on your PATH.
Tested with OpenCode 2.0.24 and Plannotator TUI 0.9.4 on macOS; unit tests also run on
Linux. Windows terminal handoff has not been verified.

Install the upstream TUI on macOS or Linux:

```sh
brew install plannotator/tap/plannotator-tui
```

Homebrew 6 may first require `brew trust plannotator/tap`. Alternatively, use
`cargo install plannotator-tui --locked` or the upstream
[prebuilt binaries](https://github.com/plannotator/plannotator-tui/releases).

Then install the adapter:

```sh
opencode plugin add opencode-plannotator-tui@latest
```

OpenCode detects its TUI-only entrypoint and adds it to your global **`cli.json`**.
It does not need a server-plugin entry. Reopen the terminal client if its command
list has not refreshed.

Manual configuration, preserving other entries:

```json
{
  "plugins": ["opencode-plannotator-tui@latest"]
}
```

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
opencode plugin update opencode-plannotator-tui@latest
```

Reopen your terminal client to load updated package code. No shared background
service restart is required. Check the installed version with `opencode plugin list`.

To remove it:

```sh
opencode plugin remove opencode-plannotator-tui@latest
```

## Configuration

Set `binary` if Plannotator TUI is installed outside the terminal client's PATH:

```json
{
  "plugins": [
    {
      "package": "opencode-plannotator-tui@latest",
      "options": { "binary": "/path/to/plannotator-tui" }
    }
  ]
}
```

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

For development loading, add this checkout's absolute directory to `cli.json`
instead of the npm package. Use only one installation at a time.

See [release instructions](docs/releasing.md) and [changelog](CHANGELOG.md).

## 中文速用

这是 **Plannotator TUI 的非官方 OpenCode 适配插件**。

- `/annotate`：批注上一条完整回复。
- `/annotate 文档.md`：批注文档，支持中文、空格和相对路径。
- `/annotate-last`：同义入口，也可带文件路径。
- 选中文字 → `c` 写批注 → Enter 保存 → `q` 返回 →「Send and continue」。
- 文档采用独立快照，反馈附原文件路径，确认后发回发起批注的会话。
- 更新：`opencode plugin update opencode-plannotator-tui@latest`，然后重新打开终端客户端。

MIT licensed. The annotation UI is maintained upstream by the Plannotator project.
