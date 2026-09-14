# opencode-go-usage

An [OpenCode](https://opencode.ai) TUI plugin that shows your **OpenCode Go
subscription usage** in the sidebar: rolling (5 h), weekly and monthly limits,
with percent consumed, status and time until each reset.

Data comes from the public API — no scraping:

- `GET https://opencode.ai/zen/go/v1/usage` (Bearer API key of your
  `opencode-go` account) → `rolling`, `weekly` and `monthly` percent,
  `ok`/`rate-limited` status and reset date.

## What it looks like

Rendered in the `sidebar.content` slot of every session:

```
┌────────────────────────────────────────┐
│ ⬖ OpenCode Go                ▾         │
│ rolling  █░░░░░░░   0% ✓  ↻ 2h         │
│ weekly   ░░░░░░░░   4% ✓  ↻ 1h         │
│ monthly  ████████ 100% ✕  ↻ 9d         │
└────────────────────────────────────────┘
```

Up to 3 rows (rolling / weekly / monthly) with a usage bar, percent and time
until reset. Auto-refreshes every 5 minutes (no requests are made while the
widget is collapsed). Collapsed, only the header with "▾/▸" remains.

Use **Show or hide the OpenCode Go usage panel** (palette `Ctrl+P`, or slash
`/opencode-go`) to toggle the widget. The state persists across restarts.

## Install

Add the package to `plugins` in your global `~/.config/opencode/opencode.json(c)`:

```jsonc
{
  "plugins": ["@pistonex/opencode-go-usage"]
}
```

For CLI-only behavior against remote servers, add it to `~/.config/opencode/cli.json`
instead:

```jsonc
{
  "plugins": ["@pistonex/opencode-go-usage"]
}
```

Then restart OpenCode.

Requires OpenCode v2 (CLI plugin API).

## How it gets the API key

The plugin reads `~/.local/share/opencode/account.json`, finds the account with
`serviceID === "opencode-go"` and uses its `credential.key`. The key is only
used in memory for the `Authorization: Bearer` request; it is never printed or
written anywhere.

## Language

The plugin is bilingual (ES/EN). Language resolution order:

1. The plugin `language` option (`"es"` or `"en"`) in `opencode.json(c)`
2. A persisted choice (see the slash command below)
3. Auto-detected from your environment (`LANG`/`LC_ALL`)

Override it at any time with the slash command:

- `/opencode-go-lang` — toggle ES/EN
- `/opencode-go-lang en` / `/opencode-go-lang es` — set a specific language

## Options

```jsonc
{
  "plugins": [{ "package": "@pistonex/opencode-go-usage", "options": { "language": "en" } }]
}
```

| Option     | Values    | Description                        |
| ---------- | --------- | ---------------------------------- |
| `language` | `es`, `en`| Force a language, ignoring the rest |

## Configuration

Constants live in `src/opencode-go-usage.tsx`:

- `USAGE_URL` — public usage endpoint (only change if the API changes)
- `REFRESH_MS` — refresh interval (default 5 min)
- `FETCH_TIMEOUT_MS` — request timeout (default 10 s)

## Notes

The **Zen balance** and the **"Use balance"** toggle are not exposed by any
public OpenCode API (they live in the console's database and are read through
browser-session server actions). This plugin shows subscription usage, which
is everything the API offers. See [docs/RESEARCH.md](docs/RESEARCH.md) for the
full investigation.

## Development

```bash
npm install
npm run typecheck
```

The plugin is a single `.tsx` file (`src/opencode-go-usage.tsx`) using the
standard OpenCode v2 CLI plugin contract: `Plugin.define({ id, setup })` from
`@opencode/plugin/tui`, `@opentui/solid` JSX and theme tokens via
`usePlugin()`.

## License

[MIT](LICENSE) © Tony Pistone
