# opencode-account-quota

[![npm](https://img.shields.io/npm/v/opencode-account-quota)](https://www.npmjs.com/package/opencode-account-quota) [![license](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

OpenCode plugin to check how much quota each connected account has left, get a notice when one runs low, and keep a route order of accounts. Open it with `/quota`.

![Claude Code usage in the /quota modal](docs/claude.png)

> Status: 0.1.0. Tested with OpenCode 2.3.2, 2.4.1 and 2.4.2. ChatGPT and Claude Code readings are experimental and use unofficial endpoints that may change.

## What it shows

| Account | Data | Default |
|---|---|---|
| DeepSeek | Balance per currency (official balance API) and a low-balance notice | On |
| ChatGPT (OpenAI OAuth) | 5 h and weekly usage of the Codex plan | Off: `experimentalCodexUsage` |
| Claude Code | 5 h and weekly usage of the single Claude Code profile (`claude -p /usage`) | Off: `experimentalClaudeUsage` |

`—` means no data, never zero usage. `●` marks the account in use.

The plugin does not switch accounts and does not touch credentials: logging in and changing accounts stay in OpenCode (`/connect`). Only your preferences (route order, notice thresholds) are saved; readings stay in memory. Opening the modal does not query any provider: press `r` to refresh the selected account or `a` for all of them.

## Screenshots

| ChatGPT (experimental, stale data) | DeepSeek balance |
|---|---|
| ![ChatGPT usage marked Experimental and Stale](docs/chatgpt.png) | ![DeepSeek balance with low-balance notice](docs/deepseek.png) |

**Route order** — accounts by preference, with a preview of the next turn:

![Route order with next-turn preview](docs/route-order.png)

Screenshots use sample accounts and values.

## Keys

| Screen | Keys |
|---|---|
| Accounts | `r` Refresh · `a` Refresh all · `o` Route order · `m` Balance notice · `esc` Close |
| Route order | `a` Add account · `Enter` Edit (model, effort, account, move, remove) · `o` Options · `s` Save · `esc` Discard |

## Install

```sh
opencode plugin add opencode-account-quota
```

Or add it to `opencode.json` / `opencode.jsonc` yourself, with options:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "opencode-account-quota@^0.1.0",
      "options": {
        "experimentalCodexUsage": false,
        "experimentalClaudeUsage": false,
        // Seconds ChatGPT and Claude Code usage stays fresh: integer 1–3600, default 150.
        "usageFreshnessSeconds": 150
      }
    }
  ]
}
```

OpenCode installs the package and reloads plugins on save; then run `/quota` (or `Account quota and routing` from `Ctrl+P`). A range such as `@^0.1.0` updates itself within it; a bare name stays on the installed version until `opencode plugin update`.

Without npm, from GitHub: `github:JoelChinoP/opencode-account-quota` (or `#v0.1.0` to pin a tag).

Claude Code usage runs the `claude` binary from `PATH`, or `OPENCODE_CLAUDE_PATH` if set.

## Development

No dependencies are needed to run the tests:

```sh
node --test
```

## License

[MIT](LICENSE)
