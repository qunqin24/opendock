# usage-limits

[![npm version](https://img.shields.io/npm/v/opencode-usage-limits?color=blue)](https://www.npmjs.com/package/opencode-usage-limits)
[![npm downloads](https://img.shields.io/npm/dw/opencode-usage-limits)](https://www.npmjs.com/package/opencode-usage-limits)
[![license](https://img.shields.io/npm/l/opencode-usage-limits)](./LICENSE)
[![OpenCode v2](https://img.shields.io/badge/OpenCode-v2-6E56CF)](https://opencode.ai/v2/docs/)

> Show your subscription usage limits (5-hour / weekly / monthly) in the OpenCode sidebar.

[简体中文](./README.md) · [English](./README.en.md)

An [OpenCode](https://opencode.ai/v2/docs/) **V2 TUI plugin**. When the selected model belongs
to **OpenCode Go** or **ClinePass**, a usage block appears automatically in the sidebar, showing
the percentage, a progress bar and the reset countdown for three rolling windows.

```text
▾ USAGE · OpenCode Go
5 hours                          0%
░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
↻ 5h

Weekly                           1%
░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
↻ 6d 4h

Monthly                         60%
███████████████████░░░░░░░░░░░░░░░░░
↻ 7d 14h

deepseek-v4.1-flash         $80/$160
```

## Features

- **Two usage sources**: OpenCode Go and ClinePass, switched automatically by the current model.
- **Three windows**: rolling 5 hours / weekly / monthly, with percentage, bar and reset countdown.
- **Green / yellow / red**: < 50% green, 50–79% yellow, ≥ 80% red (thresholds live in `core.ts`).
- **Spend display**: ClinePass shows `used / limit` (caps read live from `/users/me/plan`, $10 / $25 / $50);
  OpenCode Go shows percentages only, with the selected model's allowance (e.g. `$80/$160`) noted at the bottom
  as a reference.
- **Collapsible**: click the title row to collapse to a single line; the state is persisted.
- **Unobtrusive**: nothing is rendered for any other provider, so it never takes up space.
- **Rate-limit backoff**: 429 / 5xx / network failures back off exponentially (capped at 5 minutes) and show `retry in Ns`.
- **Stale-data warning**: once a reading is older than ~75 seconds (2.5 polling intervals) the title row
  shows its age in yellow; while the data is fresh nothing is shown, so there is no constant noise.
- **Key safety**: the API key is read live through OpenCode's credential API (v2 keeps credentials in
  its database), with `auth.json` as a fallback; the plugin stores nothing.

## Supported sources

| Provider ID | Name | Usage endpoint | Spend shown |
| --- | --- | --- | --- |
| `opencode-go` | [OpenCode Go](https://opencode.ai/zh/go) | `GET https://opencode.ai/zen/go/v1/usage` | No (percentages only; the model's allowance is noted at the bottom) |
| `cline-pass` | [ClinePass](https://docs.cline.bot/getting-started/clinepass) | `GET https://api.cline.bot/api/v1/users/me/plan/usage-limits` | Yes (plan caps read live from `/users/me/plan`) |

> Cline's public documentation is at [Cline API](https://docs.cline.bot/api/overview).

## Requirements

- [OpenCode](https://opencode.ai/v2/docs/) **v2.0.0 or newer**
- An **OpenCode Go** or **ClinePass** subscription connected via `/connect`
- Network access to the matching usage endpoint (see the table above)

## Install

**From npm (recommended)**:

```sh
opencode plugin add opencode-usage-limits
```

Restart the TUI afterwards. A Git specifier works too:

```sh
opencode plugin add github:GamingNowEdward/opencode-usage-limits
```

**From a local directory**: add the plugin directory to OpenCode's CLI config `cli.json`
(global path: `~/.config/opencode/cli.json`):

```jsonc
{
  "plugins": [
    {
      "package": "C:/path/to/opencode-usage-limits",
      "options": { "refreshMs": 30000 }
    }
  ]
}
```

CLI plugins run inside the local TUI process, so they can call OpenCode's credential API and reach
the network directly, and they stay active even when the CLI is connected to a remote server. See the
[CLI plugin documentation](https://opencode.ai/v2/docs/build/plugins/cli).

## Usage

- Select any model from `opencode-go` or `cline-pass` and the matching block appears in the sidebar.
- **Click the title row** to collapse/expand, or search **Toggle usage panel** in the command palette.
- Switch to another provider and the block disappears.

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `refreshMs` | number | `30000` | Polling interval in milliseconds |
| `limits` | object | — | ClinePass fallback only, used when the plan read fails, e.g. `{ "cline-pass": { "hour5": 10, "weekly": 25, "monthly": 50 } }` |

Thresholds and colours live in the source: `WARN_AT` / `DANGER_AT` in `core.ts`, `readPalette` in `tui.tsx`.

## How it works

In `setup()` the plugin does three things:

1. **Registers a sidebar slot**: `context.ui.slot({ prepend: "sidebar.content", ... })`.
2. **Reads the current model**: `context.ui.model.current()?.providerID` (reactive).
3. **Fetches usage per provider**: resolves the key through `context.client.credential.list()`
   (OpenCode v2's authoritative store), calls the usage endpoint with `Authorization: Bearer`,
   polls every 30 seconds and ticks the countdown every second.

Key resolution order: the `<PROVIDER>_API_KEY` environment variable →
`context.client.credential.list()` → `~/.local/share/opencode/auth.json`. OpenCode v2 keeps login
credentials in the `credential` table of `opencode.db`; `auth.json` is the legacy path only.

When the host exposes `GET /api/experimental/usage/limits`, OpenCode Go uses that payload directly
and needs no key at all.

## File layout

| File | Purpose |
| --- | --- |
| [`tui.tsx`](./tui.tsx) | The TUI plugin itself |
| [`core.ts`](./core.ts) | Auth, API client, formatting, thresholds (pure logic, no JSX) |
| [`index.ts`](./index.ts) | Server entrypoint (no-op) |
| [`tui.ts`](./tui.ts) | Discovery entrypoint, re-exports `tui.tsx` |
| [`preview.mjs`](./preview.mjs) | Offline preview script |
| [`AGENTS.md`](./AGENTS.md) | Development conventions |
| [`CHANGELOG.md`](./CHANGELOG.md) | Changelog |

## Offline preview

Verify the API and layout without starting the TUI (it reads your real local key):

```powershell
node preview.mjs             # both sources
node preview.mjs cline-pass  # a single source
```

## Troubleshooting

1. Make sure the current model belongs to `opencode-go` or `cline-pass`.
2. Plugin files **hot reload on save** — no restart needed. Only adding or removing an imported file requires restarting the TUI.
3. Check the log: `~/.local/share/opencode/log/opencode.log`, filter by `role=cli` and `plugin`.
4. If the panel shows **API key not found**, check the login first:

   ```sh
   opencode auth list
   ```

   When it says `stored` but the panel still fails, the host release is too old to expose the
   credential API. As a workaround, set the `<PROVIDER>_API_KEY` environment variable (for example
   `OPENCODE_GO_API_KEY`) and restart the TUI.

## See also

- [OpenCode V2 documentation](https://opencode.ai/v2/docs/)
- [Building plugins](https://opencode.ai/v2/docs/build/plugins) · [CLI plugins](https://opencode.ai/v2/docs/build/plugins/cli)
- Similar community plugin: [leleor/opencode-usage-limits-sidebar](https://github.com/leleor/opencode-usage-limits-sidebar)

## License

[MIT](./LICENSE) © 2026 GamingNowEdward