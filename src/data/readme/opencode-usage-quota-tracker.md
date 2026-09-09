# opencode-usage-quota-tracker

[![CI](https://github.com/ranjithrajv/opencode-usage-quota-tracker/actions/workflows/ci.yml/badge.svg)](https://github.com/ranjithrajv/opencode-usage-quota-tracker/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/opencode-usage-quota-tracker)](https://www.npmjs.com/package/opencode-usage-quota-tracker)
[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](LICENSE)

Track live provider quota and usage in [OpenCode](https://opencode.ai) V2 — currently Zen (`opencode`) and Go (`opencode-go`), extensible to other providers. Shares its sidebar building blocks with [opencode-plugin-kit](https://github.com/ranjithrajv/opencode-plugin-kit).

- A **sidebar footer** widget in the TUI shows the current session's token and cost usage, live.
- Quota rows for the 5h / 1w / 1mo windows of your workspace plan, with lean progress bars and reset countdowns.

It works with any supported provider API key (Zen `opencode` or Go `opencode-go` today) — both authenticate against the same workspace usage endpoint.

It only renders into the `sidebar.footer` slot — it never modifies sidebar content and never injects messages into sessions.

## Prerequisites

- OpenCode **V2** (plugin API is beta)
- A **provider API key**: run `opencode2 auth login`. Without one the widget renders nothing.

## Install

Published on [npm](https://www.npmjs.com/package/opencode-usage-quota-tracker).

**Automatic (recommended)** — add it to your OpenCode config (`~/.config/opencode/opencode.json`) and it installs on startup:

```jsonc
{ "plugins": ["opencode-usage-quota-tracker"] }
```

**Manual**:

```sh
npm install opencode-usage-quota-tracker
```

Restart the TUI (or `opencode2 service restart`) after changing the config.

Placement: takes over the **sidebar footer** (replaces the built-in USAGE
block).

## Usage

Once installed and the TUI is restarted, the sidebar footer shows two lines: `go usage <tokens> tok · $<cost>` (current session) and the plan quota `5h <x>% · week <y>% · month <z>%` with reset countdowns. It refreshes every minute — no commands to run. (The `go usage` label reflects the Go provider view; a Zen view is also available — see below.)

## Switching providers

The footer shows one provider view at a time. The **Go** view shows the Go usage line plus the workspace plan quota windows (5h / 1w / 1mo). The **Zen** view shows only Zen-specific data — the Zen usage line and the free-tier per-model breakdown — because the plan quota endpoint aggregates all providers in the workspace and cannot be split.

**Auto-pick:** only providers connected in `/connect` count. The plugin reads the live integration list over the OpenCode client API (falling back to `auth.json` before the first fetch). The view follows what you're actually using: if the current session's latest reply came from a connected provider, that provider's view shows. Otherwise your last chosen view wins; if it's no longer connected, the footer falls back to the first connected view. With just one connected provider, that view shows without any action.

To switch manually:

- Run **`/usage-view`** (alias: `/usage`) — a picker dialog lists every **connected** provider view with the current one marked.
- Or jump directly: **`/usage-view zen`** or **`/usage-view go`**.
- The command also appears in the command palette as **"Usage footer: view provider"**.

The choice is persisted across TUI restarts.

**Auth:** the plugin reads API keys from OpenCode's auth store. It tries the Zen (`opencode`) key first and falls back to the Go (`opencode-go`) key, so having either one logged in via `opencode2 auth login` is enough. Both keys hit the same workspace usage endpoint.

Adding a new provider is a one-place change: append an entry to the `VIEWS` registry in `tui.tsx` with its `rows()` builder (composed from the shared row types — usage lines, window rows, text rows) and any provider-specific data helpers. The picker, slash command, persistence, and the shared footer renderer pick it up automatically.

## Remove

Remove the plugin's entry from the `plugins` array in `opencode.json`.

## Compatibility

Built against the OpenCode V2 plugin API (`@opencode-ai/plugin` `beta`). The plugin API is beta; see each release's notes for compatibility.

## License

GNU Affero General Public License v3.0 — see [LICENSE](LICENSE).

## Releases

Changelog entries use [CHANGELOG_TEMPLATE.md](CHANGELOG_TEMPLATE.md): bullets grouped into semantic categories (Added / Changed / Fixed …) that map 1:1 from Conventional Commit types (`feat` → Added, `fix` → Fixed, …). Breaking changes get a `### Breaking` block and a major bump.
