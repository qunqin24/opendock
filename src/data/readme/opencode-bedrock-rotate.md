# opencode-bedrock-rotate

An [opencode](https://opencode.ai) plugin that rotates **multiple Amazon Bedrock
bearer tokens** (API keys, one per AWS account) and automatically retries the
same request with the next token when Bedrock **throttles**.

Useful when a single Bedrock account keeps hitting `ThrottlingException` /
`Too many tokens, please wait before trying again` and you have several accounts
to spread the load across.

It works with the released `opencode` binary — **no rebuild required**. The
plugin injects a wrapping `fetch` into the provider via the auth `loader` hook.

## How it works

- Reads a list of Bedrock bearer tokens (from an env var or plugin options).
- Round-robins across them, one token per request.
- When a response is throttling (`HTTP 429`, `ThrottlingException`,
  `ServiceQuotaExceededException`, `too many tokens`, `too many requests`,
  `rate exceeded`), it retries the same request with the next token before
  failing.
- Rotates the token into whichever auth header the SDK uses:
  `Authorization: Bearer` for `@ai-sdk/amazon-bedrock` (native runtime) or
  `x-api-key` for `@ai-sdk/anthropic` (Bedrock Mantle Anthropic path).

## Install

```json
// opencode.json
{
  "plugin": ["opencode-bedrock-rotate"]
}
```

Provide your tokens via env (comma-separated):

```sh
export AWS_BEARER_TOKENS_BEDROCK="ABSK...token1,ABSK...token2,ABSK...token3"
```

> Each token is an [Amazon Bedrock API key](https://docs.aws.amazon.com/bedrock/latest/userguide/api-keys.html)
> (the `AWS_BEARER_TOKEN_BEDROCK` value) from a different AWS account.

### Required: stored auth for the provider

opencode only runs the plugin's `loader` when there is a **stored credential**
for the target provider. Register one once:

```sh
opencode auth login amazon-bedrock
```

(Any of your bearer tokens works as the stored key — the plugin overrides the
per-request token anyway.)

## Configuration

Pass options as `[name, options]`:

```json
{
  "plugin": [
    ["opencode-bedrock-rotate", {
      "provider": "amazon-bedrock",
      "tokensEnv": "AWS_BEARER_TOKENS_BEDROCK"
    }]
  ]
}
```

| Option      | Type       | Default                       | Description                                                        |
| ----------- | ---------- | ----------------------------- | ------------------------------------------------------------------ |
| `provider`  | `string`   | `"amazon-bedrock"`            | Provider id to attach to.                                          |
| `tokensEnv` | `string`   | `"AWS_BEARER_TOKENS_BEDROCK"` | Env var with comma-separated tokens. Falls back to `AWS_BEARER_TOKEN_BEDROCK`. |
| `tokens`    | `string[]` | –                             | Inline tokens (overrides the env var). Avoid committing secrets.   |

### Multiple providers / custom provider ids

A single plugin instance attaches to one provider id. If you use custom Bedrock
provider ids (e.g. a native-runtime provider and a Mantle provider), list the
plugin once per provider:

```json
{
  "plugin": [
    ["opencode-bedrock-rotate", { "provider": "bedrock-runtime-anthropic" }],
    ["opencode-bedrock-rotate", { "provider": "bedrock-mantle-anthropic" }]
  ]
}
```

> **Only target providers that actually exist in your config/catalog.** See
> Troubleshooting below.

## Troubleshooting

### `JSON Parse error: Unexpected identifier "undefined"` on startup / `opencode models`

opencode fails to list providers with something like:

```
Error: Unexpected error
JSON Parse error: Unexpected identifier "undefined"
    at Provider.list (...)
    at ConfigHttpApi.providers (...)
```

Cause: opencode registered auth for a `provider` id that is **not present** in
your config/catalog, **and** there is a stored credential (`auth.json` entry)
for that id. opencode then evaluates `toPublicInfo(undefined)` for that provider
and throws. (This is an opencode-core limitation, not something a plugin can
intercept once auth is registered.)

This plugin mitigates it: at startup it checks your resolved config and, if the
target `provider` isn't defined there (and isn't a known catalog id like
`amazon-bedrock`), it prints a warning and registers nothing instead of causing
the crash. The check fails open — if the config can't be read it still
registers — so also follow the fixes below when using custom provider ids:

- Only set `provider` to ids that exist in your `opencode.json` `provider`
  block (or standard catalog ids like `amazon-bedrock`).
- If you previously ran `opencode auth login <id>` for a provider you later
  removed/commented out, remove that leftover entry from
  `~/.local/share/opencode/auth.json`.

## Notes on Claude Fable 5 / Mythos 5

Those models require account-level `provider_data_share` data retention. This
plugin does **not** change that — enable it per account with the Bedrock data
retention API before use. See
[AWS: Data retention](https://docs.aws.amazon.com/bedrock/latest/userguide/data-retention.html).

## License

MIT
