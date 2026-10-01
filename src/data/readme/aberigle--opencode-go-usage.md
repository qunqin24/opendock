# opencode-go-usage

A TUI sidebar showing OpenCode Go token usage and cost by model across the rolling, weekly and monthly windows. Requires OpenCode 2.

| expanded | collapsed |
| :---: | :---: |
| ![Go usage sidebar expanded](docs/sidebar-open.png) | ![Go usage sidebar collapsed](docs/sidebar-closed.png) |

Click the `Go usage` header to collapse it; collapsed, it shows the current month totals.

## What it shows

Three blocks — `rolling`, `weekly`, `monthly` — each with the window totals, the countdown to the reset and one row per model, sorted by cost. The block stays hidden until OpenCode records a Go message:

- **tokens** = input + cache read + cache write + output + reasoning
- **cost** = the cost OpenCode already recorded for that message; the plugin never recomputes prices
- both are shortened the same way, `1.2k`, `3.4M`, `5.6B`

## Install

Needs [OpenCode](https://opencode.ai) 2 — tested with 2.0.21. From npm:

```sh
opencode plugin add @aberigle/opencode-go-usage
```

Restart OpenCode and the `Go usage` block appears in the sidebar.

The plugin opens OpenCode's local database read-only and never writes to it. If a Go API key is stored there, it is used for one request — the reset times — and nothing else leaves your machine.

```sh
opencode plugin update @aberigle/opencode-go-usage   # pick up a new version
opencode plugin remove @aberigle/opencode-go-usage   # uninstall
```

### From source

Needs [Bun](https://bun.sh) as well.

```sh
git clone https://github.com/aberigle/opencode-go-usage
cd opencode-go-usage
bun install
bun run build
ln -s "$PWD" ~/.config/opencode/plugins/go-usage
```

`bun run build` is required: the plugin ships compiled, OpenCode does not compile JSX when it loads it.

## How it works

Everything runs locally; the only network call is to fetch reset times.

- **Usage** comes from the OpenCode database, `opencode.db` inside the XDG data dir (`~/.local/share/opencode/` on macOS and Linux, `%USERPROFILE%\.local\share\opencode\` on Windows), opened read-only: it adds up what OpenCode already recorded for Go messages, grouped by model.
- **Windows** follow the real reset time when it's known. Once that reset has passed, the window starts at that moment and grows from zero, so the numbers are never stale. With no API key the rolling and weekly windows end now and the month window is the calendar month.
- **Reset times** come from `GET https://opencode.ai/zen/go/v1/usage`, authenticated with the OpenCode Go key OpenCode already stores locally. That key is read from the local database and only ever used for that one request. The result is cached for 10 minutes, so the countdown can lag that much behind.
- **Refresh** is event-driven, no polling: it re-reads when OpenCode emits `session.usage.updated`.
- **Off the main thread**: every SQLite read and the network call happen in a Worker, so the sidebar never blocks.
- **When it cannot read the database** it says so in the sidebar, `could not read usage, check the logs`.

## License

MIT — see [LICENSE](LICENSE).
