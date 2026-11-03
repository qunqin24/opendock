# opencode-usage-report

[![npm version](https://img.shields.io/npm/v/opencode-usage-report)](https://www.npmjs.com/package/opencode-usage-report)
[![CI](https://github.com/kaanchinar/opencode-usage-report/actions/workflows/ci.yml/badge.svg)](https://github.com/kaanchinar/opencode-usage-report/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/npm/l/opencode-usage-report)](./LICENSE)

See how much of your AI subscriptions you have left, right inside [opencode](https://opencode.ai).

Adds a `/usage` dialog, a sidebar panel and a `usage_report` tool that show your plan's quota windows and how full the current session's context is.

```text
Context
Kimi K2 (High) · 42,318 / 200,000 tokens (21.2%)
Auto-compacts at 180,000 · 137,682 headroom        $0.42 spent

Kimi Code (kimi.ai)
5h limit      █████████░░░░░ 62% resets in 2h 14m
Weekly limit  ████░░░░░░░░░░ 31% resets in 4d 6h

GitHub Copilot
Monthly limit ██░░░░░░░░░░░░ 12% resets in 18d 3h
```

## Features

- Quota windows with progress bars and reset countdowns
- Context breakdown by category, with auto-compaction headroom and session cost
- `/usage` runs locally and costs no model tokens
- Low-quota toasts in the TUI
- Disk cache, with a local estimate when a provider API is unreachable

## Supported providers

| Provider             | ID                      | Usage API        |
| -------------------- | ----------------------- | ---------------- |
| Kimi Code (kimi.ai)  | `kimi-code-plan-global` | `api.kimi.ai`    |
| Kimi Code (kimi.com) | `kimi-code-plan-cn`     | `api.kimi.com`   |
| OpenCode Go          | `opencode-go`           | `opencode.ai`    |
| GitHub Copilot       | `github-copilot`        | `api.github.com` |
| ChatGPT              | `openai`                | `chatgpt.com`    |

## Installation

Requires opencode 1.18.29 or later, including 2.x.

```sh
opencode plugin -g opencode-usage-report
```

Omit `-g` to install for the current project only. Restart opencode afterwards.

<details>
<summary>Manual installation</summary>

The plugin has two entrypoints, so add it to both config files:

```jsonc
// opencode.json: usage_report tool, low-quota warnings
{ "plugin": ["opencode-usage-report"] }
```

```jsonc
// tui.json: /usage dialog, sidebar panel
{ "plugin": ["opencode-usage-report"] }
```

Use the bare package name in both files. A subpath such as `opencode-usage-report/tui` silently loads nothing.

</details>

## Usage

### `/usage`

Opens the report dialog. Providers without a credential are skipped.

| Key   | Action                   |
| ----- | ------------------------ |
| `r`   | Refresh now              |
| `tab` | Cycle provider scope     |
| `j`   | Toggle the raw JSON view |
| `esc` | Close                    |

Press `ctrl+shift+u` to refresh the sidebar panel.

### `usage_report` tool

The same report for agents and headless runs.

| Argument   | Type      | Description                        |
| ---------- | --------- | ---------------------------------- |
| `provider` | `string`  | Report one provider, by exact ID   |
| `json`     | `boolean` | Return raw `ProviderReport[]` JSON |
| `refresh`  | `boolean` | Bypass the disk cache              |

### Context accuracy

- **Exact:** the total, percentage, free space, compaction point and cost. The total is the prompt size (`input + cache.read + cache.write`), so it reads slightly lower than opencode's own sidebar, which also counts the completion.
- **Estimated:** the per-category rows, because opencode records no per-message token counts. They use `characters / 4`, then scale to match the exact total.
- **`(derived)`:** the system prompt size could not be measured, so the row is the remainder of the total.

## Configuration

Pass options with the tuple form. Each entrypoint reads its own options, so set them in `opencode.json`, `tui.json`, or both.

```jsonc
{
  "plugin": [["opencode-usage-report", { "thresholdPercent": 75 }]],
}
```

| Option                   | Type               | Default | Entrypoint | Description                                                 |
| ------------------------ | ------------------ | ------- | ---------- | ----------------------------------------------------------- |
| `thresholdPercent`       | `number`           | `80`    | both       | Warn when a window reaches this percentage                  |
| `cacheTtlSeconds`        | `number`           | `120`   | both       | How long a cached API result stays fresh                    |
| `providers`              | `string[] \| null` | `null`  | both       | Providers to report; `null` means all                       |
| `fallback`               | `boolean`          | `true`  | server     | Use a local estimate when the API fails and no cache exists |
| `refreshIntervalSeconds` | `number`           | `60`    | TUI        | Refresh cadence, clamped to 5–3600                          |
| `barWidth`               | `number`           | `14`    | TUI        | Progress bar width in cells, clamped to 4–40                |

Invalid values are ignored and the default is kept.

## Credentials and privacy

Run `opencode auth login` to sign in. The plugin reads credentials in this order:

1. `OPENCODE_USAGE_<ID>_KEY`, where `<ID>` is the provider ID in uppercase with non-alphanumeric characters replaced by `_`, for example `OPENCODE_USAGE_KIMI_CODE_PLAN_GLOBAL_KEY`. For ChatGPT, also set `OPENCODE_USAGE_OPENAI_ACCOUNT_ID`.
2. `~/.local/share/opencode/auth.json`. Set `$OPENCODE_DATA_HOME` to use another data directory.

Keys are never logged, cached or rendered, and adapter errors are redacted before output. The plugin contacts only the usage APIs listed above. Cached reports and plugin state live in `<data-home>/usage-report/`, and the local estimate reads `opencode.db` read-only. The plugin stores the size of your system prompt, never its text.

## Troubleshooting

**`/usage` is missing.** The command comes from the TUI entrypoint. Check that `tui.json` lists the bare package name, then restart opencode. Running `opencode plugin opencode-usage-report` should print `Detected server + tui targets`.

**No providers are reported.** No credential could be resolved. Run `opencode auth login` or set `OPENCODE_USAGE_<ID>_KEY`.

**An old version keeps loading.** opencode caches packages in `~/.cache/opencode/packages/<name>@latest/`. Re-run `opencode plugin opencode-usage-report` or delete that directory.

**Numbers show `(stale)` or `(est)`.** `(stale)` is a cached result past its TTL. `(est)` is a local estimate used because the API was unreachable. Press `r` in the dialog to refetch.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup and adding a provider, and [CHANGELOG.md](./CHANGELOG.md) for release history. Report vulnerabilities as described in [SECURITY.md](./SECURITY.md).

## License

[MIT](./LICENSE) © [Kaan Chinar](https://github.com/kaanchinar)
