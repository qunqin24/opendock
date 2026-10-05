# opencode-providers-balances

[![npm version](https://img.shields.io/npm/v/opencode-providers-balances.svg?color=blue)](https://www.npmjs.com/package/opencode-providers-balances)
[![license](https://img.shields.io/github/license/fibit/opencode-providers-balances)](LICENSE)

> Show provider account balances in the OpenCode TUI sidebar.

An OpenCode **TUI** plugin. It renders only in the terminal interface; the web
client is not supported.

Providers live entirely in configuration — the plugin ships with no built-in
provider data. List them under the plugin's `options.providers` and each one
renders as a row in the `sidebar.content` slot, refreshed every 5 minutes. A
failed refresh keeps the last-known value and marks it stale with `!`.

## Features

- Any number of providers, configured in `opencode.jsonc` — no code changes.
- Declarative response parsing: `jsonPath`, `prefix`, `prefixFrom`, `require`.
- Keys resolved from the OpenCode credential store, config, or environment.
- Hidden rows for providers without a resolvable key or numeric value.

## Prerequisites

- OpenCode **V2** (the plugin API is beta).
- A key for each provider you configure — via `/connect`, `opencode.jsonc`, or
  an environment variable.

## Install

Add the plugin to `~/.config/opencode/opencode.jsonc` and configure providers:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "opencode-providers-balances",
      "options": {
        "refreshMinutes": 5,
        "providers": [
          {
            "id": "deepseek",
            "label": "DeepSeek",
            "url": "https://api.deepseek.com/user/balance",
            "integration": "deepseek",
            "require": { "path": "is_available", "equals": true },
            "jsonPath": "balance_infos.0.total_balance",
            "prefixFrom": { "path": "balance_infos.0.currency", "map": { "USD": "$" } }
          },
          {
            "id": "openrouter",
            "label": "OpenRouter",
            "url": "https://openrouter.ai/api/v1/credits",
            "integration": "openrouter",
            "jsonPath": "data.total_credits",
            "prefix": "$"
          },
          {
            "id": "aitunnel",
            "label": "AITUNNEL",
            "url": "https://api.aitunnel.ru/v1/aitunnel/balance",
            "configProvider": "aitunnel",
            "jsonPath": "balance",
            "prefix": "₽"
          }
        ]
      }
    }
  ]
}
```

Restart the TUI (or `opencode service restart`) after changing the config.

## Usage

Once installed, the sidebar shows a bold **Balances** heading and one row per
provider:

```
Balances
• DeepSeek $10.01
• OpenRouter $0.00
• AITUNNEL ₽17779.49
```

Each row is `•` normally, or `!` when the last refresh failed but a previous
value is kept.

The three examples show the common shapes: an **integration** key with a
currency-derived prefix (DeepSeek), an **integration** key with a fixed prefix
(OpenRouter), and a **custom provider** key from the config with a ruble
balance (AITUNNEL).

## Configuration

### Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `refreshMinutes` | number | `5` | Minutes between refreshes (minimum 1). |
| `disable` | string[] | `[]` | Provider ids to hide (convenience). |
| `providers` | object[] | `[]` | Providers to display. Empty or missing means no panel. |

### Provider fields

| Field | Required | Description |
| --- | --- | --- |
| `id` | yes | Stable id; used for `disable` and as the default env prefix. |
| `label` | yes | Sidebar label. |
| `url` | yes | Balance endpoint. |
| `jsonPath` | no | Dot path into the JSON body. Numeric segments index arrays, e.g. `balance_infos.0.total_balance`. The value must be a number (or numeric string) and is formatted with two decimals. |
| `prefix` | no | Fixed string prepended to the value (e.g. `"$"`, `"€"`, `"₽"`). |
| `prefixFrom` | no | Derive the prefix from a value: `{ path, map, fallback? }`, e.g. `{ "path": "currency", "map": { "USD": "$" } }`. Takes precedence over `prefix`. |
| `require` | no | Gate the row: `{ path, equals }`; hidden unless the value at `path` strictly equals `equals`. |
| `authScheme` | no | Authorization scheme, default `Bearer`. |
| `env` | no | Env var holding the key, default `<ID>_API_KEY`. |
| `key` | no | Literal key (discouraged — prefer env/integration). |
| `integration` | no | Id in the V2 SQLite `credential` table. |
| `configProvider` | no | Provider id in `opencode.jsonc` whose `settings.apiKey` to use. |

### Key resolution

For each provider, the key is taken from the first source that has one:

1. `key` in the provider spec (literal — discouraged)
2. an integration in the OpenCode V2 SQLite credential store (`integration`)
3. the matching provider's `settings.apiKey` in `opencode.jsonc` (`configProvider`)
4. an environment variable (`env`, default `<ID>_API_KEY`)

## Notes

- A provider whose key cannot be resolved is hidden rather than shown as stale.
- A malformed spec (e.g. a `jsonPath` that resolves to a non-number) hides that
  row instead of failing the plugin.
- OpenAI's prepaid balance is not exposed via API, so it cannot be shown.
- RouterAI's `/credits` value is billed in rubles, hence `₽`. AITUNNEL's
  `/balance` is also in rubles.
- A provider configured directly in `opencode.jsonc` (not via `/connect`) uses
  `configProvider` — see the AITUNNEL example.

## Development

```sh
npm install
npm test
npm run typecheck
```

Runtime dependencies (`@opencode/plugin`, `@opentui/solid`, `solid-js`) are
provided by OpenCode and declared as `peerDependencies`; they are installed
locally only for type-checking.

## License

MIT — see [LICENSE](LICENSE).
