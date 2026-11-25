# OpenCode Herdr Tab Title

**Show the current OpenCode session title on its herdr tab.**

[![npm](https://img.shields.io/npm/v/@nxxxsooo/opencode-herdr-tab-title)](https://www.npmjs.com/package/@nxxxsooo/opencode-herdr-tab-title)
[![CI](https://github.com/nxxxsooo/opencode-herdr-tab-title/actions/workflows/ci.yml/badge.svg)](https://github.com/nxxxsooo/opencode-herdr-tab-title/actions/workflows/ci.yml)
[![MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

## Install

Requires the **OpenCode V2 TUI** running inside **herdr 0.9.5 or later**. The plugin uses `herdr` on `PATH`; set `HERDR_BIN_PATH` in the TUI environment to use a different executable. Outside herdr it does nothing.

```sh
opencode plugin add @nxxxsooo/opencode-herdr-tab-title@latest
```

For manual OpenCode installation, add `@nxxxsooo/opencode-herdr-tab-title@latest` to `plugins` in your global `cli.json`. Use `/reload` if an open TUI has not picked up the change.

## How labels work

The plugin follows the current root session, including when you resume or switch sessions. It ignores child sessions and default `New session…` titles. It collapses whitespace, removes a leading date prefix such as `1123｜`, and truncates long labels to 28 characters including the ellipsis.

Manually assigned labels stay put unless they look like a herdr default (digits only), match the last label this instance set, or start with a `Type｜` prefix made of ASCII letters and a full-width separator. Choose a label such as `My workspace` to keep it fixed.

## Update or uninstall

OpenCode caches installed packages; publishing a release does not update your local copy. Update just this plugin:

```sh
opencode plugin update @nxxxsooo/opencode-herdr-tab-title@latest
```

To uninstall:

```sh
opencode plugin remove @nxxxsooo/opencode-herdr-tab-title@latest
```

## Antigravity (agy)

Requires Antigravity CLI 1.5.16, Node.js 24.4 or later on `PATH`, and herdr 0.9.5 or later.

```sh
git clone https://github.com/nxxxsooo/opencode-herdr-tab-title.git
agy plugin install ./opencode-herdr-tab-title
```

The hook uses the conversation title saved by agy. It only renames tabs with one pane, so agy workers in a shared tab leave its label alone.

To update, pull the checkout and install it again. To uninstall, run `agy plugin uninstall herdr-tab-title`.

MIT licensed. Not affiliated with OpenCode, Antigravity, or herdr.
