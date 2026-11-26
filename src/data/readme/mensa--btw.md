# @mensa/btw

[English](https://github.com/susususutie/btw/blob/main/README.md) | [简体中文](https://github.com/susususutie/btw/blob/main/README.zh-CN.md)

A seamless upgrade to OpenCode's built-in `/btw`: same usage as the built-in command, **no core changes**. It adds only two things: **persistent history** and a **sidebar list**.

![Demo](https://raw.githubusercontent.com/susususutie/btw/main/docs/demo-light.gif)

## Install

```sh
opencode plugin add @mensa/btw
```

Disable the built-in command in `~/.config/opencode/cli.json`:

```jsonc
{
  "plugins": ["-opencode.btw", "@mensa/btw"]
}
```

Restart the TUI. OpenCode V2 only.

## What you get

- Every `/btw` question stays in the session's **BTW** sidebar, with status and duration.
- Click a row to reopen the answer; `/btws` filters the history.
- History survives TUI restarts and multiple windows.

The `/btw` prompt and answer dialog are exactly the same as the built-in version.
