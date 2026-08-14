# opencode-anthropic-console

[![npm](https://img.shields.io/npm/v/opencode-anthropic-console.svg)](https://www.npmjs.com/package/opencode-anthropic-console)
[![license](https://img.shields.io/github/license/DusKing1/opencode-anthropic-console)](./LICENSE)

A complete Anthropic authentication plugin for OpenCode. One package owns both:

- **Claude.ai Pro/Max OAuth** with automatic, rotation-safe token refresh.
- **Console OAuth API-key creation** that exchanges a browser login for an
  `sk-ant-api03-...` key.
- **Anthropic Console API keys** (`sk-ant-api03-...`) with the Claude Code
  client-attestation transforms required by Enterprise / Claude-Code-scoped keys.

The plugin targets the Claude Code 2.1.220 request profile captured by this
project. It is a community plugin and is not affiliated with Anthropic or the
OpenCode team.

## Scope

The scope changes in `0.3.0`:

- **`0.2.x` and earlier:** an API-key-only companion. It handled strict Console
  key attestation and deliberately deferred Claude.ai OAuth to
  `@ex-machina/opencode-anthropic-auth`.
- **`0.3.0`:** the complete Anthropic auth owner. It keeps the original Console
  API-key path and adds Claude.ai Pro/Max login, token exchange, refresh-token
  rotation, OAuth request transformation, and credential persistence.

`0.3.0` is therefore a replacement for the sibling auth plugin, not a companion
to it. Configure only one `anthropic` auth hook.

### Authentication matrix

| Login method | Stored auth type | Authentication | Request profile |
|---|---|---|---|
| Claude Pro/Max | `oauth` | `Authorization: Bearer ...` | OAuth beta, Claude identity/billing, tool mapping |
| Create an API Key | `api` | Console OAuth exchanged for `x-api-key` | Full API-key attestation including device/session metadata |
| Console API Key | `api` | `x-api-key` | Full API-key attestation including device/session metadata |

The profiles are intentionally separate. OAuth does not read `~/.claude.json`
or send API-key-only `x-app`, device metadata, Claude session headers, cache
normalization, temperature stripping, or the captured Opus harness.

## Requirements

- OpenCode with the v1 plugin API
- Node.js 20 or newer
- A Claude.ai Pro/Max account for OAuth, or access to an Anthropic Console
  organization for API-key creation/manual entry
- For strict API-key attestation only: Claude Code run once on the machine, or
  `OPENCODE_ANTHROPIC_CONSOLE_USER_ID` set to its 64-character device ID

## Install

Configure **only this Anthropic auth plugin**:

```jsonc
// ~/.config/opencode/opencode.json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-anthropic-console"]
}
```

Remove `@ex-machina/opencode-anthropic-auth` or any other plugin that registers
an `anthropic` auth hook. OpenCode resolves duplicate provider auth hooks by
plugin order; they do not compose safely.

For a local checkout:

```bash
npm install
npm run build
```

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["file:///D:/GitHub/opencode-anthropic-console"]
}
```

Restart OpenCode after changing plugin configuration.

## Login

```bash
opencode auth login anthropic
```

Choose one method:

### Claude Pro/Max

1. OpenCode displays a `claude.ai` authorization URL.
2. Complete the browser login.
3. Paste the returned authorization code into OpenCode.
4. OpenCode stores the access token, refresh token, and expiry.

The plugin refreshes five minutes before expiry. Concurrent requests share one
refresh operation. A rotated refresh token is persisted before inference uses
the new access token; if a successful response omits `refresh_token`, the old
one is preserved.

Ambiguous transport, malformed-response, and persistence failures are not
blindly retried because Anthropic may already have consumed the rotating token.
The affected token generation is blocked until credentials change or OpenCode
restarts, preventing repeated `invalid_grant` cascades.

### Create an API Key

1. OpenCode displays a `platform.claude.com` authorization URL.
2. Log in to Anthropic Console and authorize API-key creation.
3. Paste the returned authorization code into OpenCode.
4. The plugin exchanges the temporary OAuth access token for an
   `sk-ant-api03-...` key and stores it as API-key authentication.

Inference then uses `x-api-key` and the Console API request profile. It does not
route inference through Claude.ai OAuth.

### Console API Key

Paste an `sk-ant-api03-...` key from <https://console.anthropic.com/>. The plugin
keeps `x-api-key` authentication and applies the full Claude Code 2.1.220
attestation envelope to `/v1/messages`.

Most regular Console keys do not require strict attestation, but the transform
is intended for Enterprise / Claude-Code-scoped keys that otherwise return:

```text
429 rate_limit_error: "Error"
```

## OAuth safety properties

- PKCE S256 and per-login random state
- One-shot authorization-code exchange
- Current `https://platform.claude.com/v1/oauth/token` endpoint
- Runtime validation of token responses and bounded response size
- One in-flight refresh per loaded provider
- Preservation of omitted refresh tokens and persistence of rotated tokens
- Fail-closed auth-mode changes and unexpected request origins
- Bearer tokens sent only to `api.anthropic.com` or the explicit custom base URL
- No token, authorization code, or PKCE verifier logging

OpenCode does not expose a cross-process credential lock. Do not run multiple
OpenCode processes with the same expired Claude credential at the same time.

## API-key identity source

Strict API-key attestation resolves the Claude Code device ID in this order:

1. `OPENCODE_ANTHROPIC_CONSOLE_USER_ID`
2. `userID` in `~/.claude.json`

OAuth mode does not require either source.

## Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `OPENCODE_ANTHROPIC_CONSOLE_USER_ID` | - | Override the API-key device ID |
| `OPENCODE_ANTHROPIC_CONSOLE_CLAUDE_JSON` | `~/.claude.json` | Override the Claude config path used by API-key mode |
| `OPENCODE_ANTHROPIC_CONSOLE_TOOL_PREFIX` | `1` | Set to `0` to disable outgoing `mcp_` tool prefixes |
| `ANTHROPIC_BASE_URL` | - | Route inference requests through an explicit HTTP(S) proxy/gateway |

`ANTHROPIC_BASE_URL` never changes the OAuth authorization or token endpoint.

## Troubleshooting

### Login succeeds but refresh later fails

- Ensure no second Anthropic auth plugin is configured.
- Stop other OpenCode processes sharing the credential.
- Run `opencode auth logout anthropic`, then log in again once to replace a
  refresh token already invalidated by an older plugin.

### OAuth request rejected

Confirm the installed package matches this repository's current Claude Code
profile. Anthropic can change compatibility checks without notice.

### API key returns `429 rate_limit_error: "Error"`

Confirm that the API-key identity source is a valid 64-character Claude Code
device ID and that the current `CLAUDE_CODE_VERSION` still matches real traffic.

## Development

```bash
npm install
npm run typecheck
npm run build
```

To inspect the loaded plugins and confirm there is only one Anthropic auth owner:

```bash
opencode debug info
```

## License

MIT - see [LICENSE](./LICENSE).
