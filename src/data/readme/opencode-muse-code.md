# opencode-muse-code

[![npm version](https://img.shields.io/npm/v/opencode-muse-code.svg)](https://www.npmjs.com/package/opencode-muse-code)
[![license](https://img.shields.io/npm/l/opencode-muse-code.svg)](./LICENSE)

Use a **Muse Code** (Meta) subscription in [OpenCode](https://opencode.ai).

The plugin reads the login the [`muse`](https://api.meta.ai/muse-launcher.sh) CLI
already stored on your machine, registers a `muse-code` provider that talks to
`https://api.meta.ai/v1`, and discovers the available Muse models on startup and
every 30 minutes. Model requests are metered by Meta against your Muse Code
subscription — OpenCode needs no API key in its own configuration.

```text
OpenCode  ──▶  https://api.meta.ai/v1  ──▶  Muse Code subscription
                    ▲
    minted API key from the muse CLI login
```

## Features

- Zero configuration once the `muse` CLI is signed in.
- Live model discovery with real context/output limits, tool support, input
  types, and reasoning-effort variants.
- Reads credentials from the macOS keychain (or `~/.config/muse/auth.json`),
  with `META_API_KEY` / `MUSE_API_KEY` and an explicit `key` option as
  fallbacks.
- Never writes credentials to OpenCode configuration or the repository.

## Requirements

- OpenCode V2 (tested on 2.0.8).
- The `muse` CLI installed and signed in — run `muse` once if you have not.
- An active Muse Code subscription. Check with the `muse` CLI or the
  [Muse Code page](https://accountscenter.meta.com/muse_code/).

## Install

```sh
opencode plugin add opencode-muse-code
```

Or add it to the `plugins` list in `opencode.jsonc` yourself:

```jsonc
{
  "plugins": ["opencode-muse-code"]
}
```

Pin a version if you prefer:

```jsonc
{
  "plugins": ["opencode-muse-code@0.1.2"]
}
```

Restart the service after changing configuration:

```sh
opencode service restart
```

<details>
<summary>Install from source instead</summary>

```sh
git clone https://github.com/swalker326/opencode-muse-code.git
```

```jsonc
{
  "plugins": ["/absolute/path/to/opencode-muse-code"]
}
```

Or copy the folder to `~/.config/opencode/plugins/muse-code/`, where plugin
directories load automatically.
</details>

## Use

Pick a model with `/models` in the TUI, or run one directly:

```sh
opencode run --model muse-code/muse-spark-1.3 "Summarize this repository"
```

### Models

Models are discovered from Meta's catalog, so the list follows your account.
Current models include:

| Model | Notes |
| --- | --- |
| `muse-spark-1.3` | Newest general model |
| `muse-spark-1.3-contributor` | Same model; content may be used for product improvement |
| `muse-spark-1.2` / `muse-spark-1.2-contributor` | Previous generation |

### Reasoning effort

Append a variant to choose a reasoning effort:

```sh
opencode run --model muse-code/muse-spark-1.3#max "Plan this migration"
```

Variants: `minimal`, `low`, `medium`, `high`, `xhigh`, `max`. The default comes
from the model metadata returned by Meta.

## How it works

1. **Find the login.** Credentials are resolved in order: the plugin `key`
   option, then `META_API_KEY` / `MUSE_API_KEY`, then the macOS keychain item
   `ai.meta.dev.credentials` (account `meta`), then `~/.config/muse/auth.json`.
2. **Get an API key.** It uses the stored API key, or mints one from the OAuth
   token by calling `POST https://api.meta.ai/muse-code/key`. Minting is
   idempotent: the same account always gets the same key back.
3. **Discover models.** It reads `GET https://api.meta.ai/muse-code/models`,
   keeping tool-capable text models.
4. **Register the provider.** OpenCode receives a provider definition with ID
   `muse-code`, the OpenAI-compatible runtime, endpoint
   `https://api.meta.ai/v1`, the minted key, and one model entry per Muse
   model. Variants map to the `reasoning_effort` request field.
5. **Stay fresh.** Every 30 minutes it re-reads the login, re-fetches the
   catalog, and reloads the provider. On unload it stops the timer and removes
   its registration.

If the credential lookup or the first catalog fetch fails, the plugin still
lists a fallback model and logs a warning; the next refresh repairs it.

## Options

Pass a key explicitly instead of reading the CLI login:

```jsonc
{
  "plugins": [{ "package": "opencode-muse-code", "options": { "key": "..." } }]
}
```

| Option | Type | Description |
| --- | --- | --- |
| `key` | string | Muse API key. Wins over every other credential source. |

| Environment variable | Description |
| --- | --- |
| `META_API_KEY` | Muse API key (the variable the muse CLI itself understands) |
| `MUSE_API_KEY` | Alias, checked second |

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `Unauthorized` | Run `muse` and sign in again, then `opencode service restart`. Make sure no stale stored account is shadowing the plugin. |
| Models missing | The first refresh failed; check network access to `api.meta.ai` and restart the service. A fallback model list is registered meanwhile. |
| Models missing on Linux | Muse CLI credential storage differs by platform. Set `META_API_KEY` or use the `key` option. |
| Keychain prompt on macOS | Approve the request once; OpenCode reads the same keychain item the muse CLI created. |

## Security and privacy

- Credentials are read from the operating system credential store at runtime;
  they are never written to OpenCode config files, repositories, or logs.
- The plugin talks only to `https://api.meta.ai` — the same endpoint the muse
  CLI uses.
- No telemetry is collected by the plugin.

## Compatibility

| Platform | Credential source |
| --- | --- |
| macOS | Login keychain (`ai.meta.dev.credentials`) |
| Linux | `~/.config/muse/auth.json`, `META_API_KEY`, or the `key` option |
| Windows | `META_API_KEY` or the `key` option |

## Disclaimer

This is an unofficial community plugin. It is not affiliated with, endorsed by,
or supported by Meta or the OpenCode team. Muse Code and Muse Spark are
trademarks of Meta. Use at your own risk and follow the terms of your Muse Code
subscription.

## Contributing

Issues and pull requests are welcome at
[swalker326/opencode-muse-code](https://github.com/swalker326/opencode-muse-code).

## License

[MIT](./LICENSE)
