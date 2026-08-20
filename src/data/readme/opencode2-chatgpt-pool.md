# opencode2-chatgpt-pool

[![CI](https://github.com/davidprokopec/opencode2-chatgpt-pool/actions/workflows/ci.yml/badge.svg)](https://github.com/davidprokopec/opencode2-chatgpt-pool/actions/workflows/ci.yml)
[![npm beta](https://img.shields.io/npm/v/opencode2-chatgpt-pool/beta?label=npm%20beta)](https://www.npmjs.com/package/opencode2-chatgpt-pool)
[![license](https://img.shields.io/npm/l/opencode2-chatgpt-pool)](LICENSE)

Pool multiple ChatGPT Pro/Plus OAuth accounts in
[OpenCode V2](https://opencode.ai/v2/docs/) and move to another account when
one is rate limited.

The plugin deliberately reuses OpenCode's built-in OpenAI login. It does not
copy the OAuth flow or replace the provider implementation:

1. OpenCode logs in and stores its normal active OpenAI credential.
2. The plugin captures each ChatGPT credential into a local pool before the
   next login replaces it in OpenCode's single-credential store.
3. Immediately before a Codex request, the plugin supplies a pooled bearer
   token and the matching `chatgpt-account-id` header.
4. A 429 cools that account. When another account is ready, the plugin removes
   the provider's long `Retry-After`; OpenCode's own retry reissues the request
   through the next account after its normal short backoff.

The default strategy is sticky: an account stays selected until it is limited.
That preserves session affinity and prompt-cache locality better than rotating
every request.

## Install

The V2 plugin API is beta and host-coupled. This version is built and verified
against `@opencode-ai/plugin@0.0.0-beta-17595` (`opencode2 --version` →
`v0.0.0-beta-17595`).

Always install with the explicit `@beta` tag. npm assigned `latest` during the
one-time package bootstrap, but the release workflow never publishes or moves
that tag while OpenCode V2 remains beta.

Install the beta-pinned release in both config files. The server plugin routes
requests and owns the pool; the TUI plugin provides `/chatgpt-pool` and switch
toasts.

```jsonc
// ~/.config/opencode/opencode.jsonc
{
  "plugins": ["opencode2-chatgpt-pool@beta"],
}
```

```jsonc
// ~/.config/opencode/cli.json
// Use the package name only; the TUI resolves its ./tui entrypoint.
{
  "plugins": ["opencode2-chatgpt-pool@beta"],
}
```

OpenCode installs package dependencies into its plugin cache. Restart the
background service after changing plugins:

```sh
opencode2 service restart
```

For development from a local checkout, install its dependencies and point both
OpenCode halves at their source entrypoints:

```sh
cd /path/to/opencode2-chatgpt-pool
bun install
```

```jsonc
// ~/.config/opencode/opencode.jsonc
{
  "plugins": ["/absolute/path/to/opencode2-chatgpt-pool/src/index.ts"],
}
```

```jsonc
// ~/.config/opencode/cli.json
{
  "plugins": ["/absolute/path/to/opencode2-chatgpt-pool/src/tui.ts"],
}
```

## Add accounts

With the plugin running:

1. Use `/connect`, choose **OpenAI**, then **ChatGPT Pro/Plus (browser)** and
   log into the first account. An already-connected account is captured when
   the plugin starts, so this step can be skipped for it.
2. Run `/connect` again and log into another account.
3. Repeat for any additional accounts.

OpenCode still shows only its latest OpenAI connection. The plugin retains the
earlier accounts in its pool.

Run `/chatgpt-pool` to list or remove accounts. The server tools also let other
OpenCode clients ask an agent to manage them. Both interfaces expose only
account IDs, emails, and availability; OAuth tokens never appear. OpenAI must
be disconnected through `/connect` before an account can be removed, otherwise
OpenCode could capture the active credential into the pool again.

When routing changes accounts, the TUI plugin shows a toast without adding
anything to the session or model context.

Accounts are stored at
`$XDG_DATA_HOME/opencode2-chatgpt-pool/accounts.json`, defaulting to
`~/.local/share/opencode2-chatgpt-pool/accounts.json`. The directory and file
are forced to modes `0700` and `0600`. Tokens remain plaintext, like
OpenCode's own local credential store, so protect your user account and
backups.

## Options

```jsonc
{
  "plugins": [
    {
      "package": "/absolute/path/to/opencode2-chatgpt-pool/src/index.ts",
      "options": {
        "strategy": "sticky",
        "rateLimitCooldownMs": 60000,
        "authFailureCooldownMs": 300000,
        "refreshBufferMs": 300000,
        "tools": true,
      },
    },
  ],
}
```

| Option | Default | Behaviour |
| --- | ---: | --- |
| `strategy` | `"sticky"` | `"sticky"` changes account only after a failure; `"round-robin"` advances every request. |
| `rateLimitCooldownMs` | `60000` | Fallback cooldown when a 429 has no usable retry header. |
| `authFailureCooldownMs` | `300000` | Cooldown after refresh failure, 401 or 403. |
| `refreshBufferMs` | `300000` | Refresh a token this long before expiry. |
| `tools` | `true` | Expose `chatgpt_pool_list` and `chatgpt_pool_remove`. Disable to save request schema tokens. |

Provider retry headers override the configured rate-limit fallback. If every
account is cooling down, the plugin preserves the provider's original retry
delay and lets OpenCode handle it normally.

## Development

Requires Bun:

```sh
bun install
bun run check
```

## Terms

Use only accounts you own and follow OpenAI's applicable terms. The plugin is
not intended to bypass account restrictions or share subscriptions between
people.

## License

MIT
