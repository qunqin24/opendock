# magpie-qwenwork

A magpie provider plugin that makes **QwenWork** desktop subscription models available to every
agent as `qwenwork/<model>`. It adopts the signed-in QwenWork desktop app account, mints a MaaS
access key from the gateway, and routes each model to the endpoint family it speaks.

> Status: v0.3.0. 110 offline tests green on node 20/22/24 and bun. Live checks on 2026-11-27 passed
> for credential adoption, minting, chat streaming, tool calls, Anthropic Messages, the quota card
> and the daily check-in hook.

## Models

| Model key            | Endpoint family         | Credits | SDK                         |
| -------------------- | ----------------------- | ------- | --------------------------- |
| `qwen3.8-flash`      | openai chat-completions | 0.1x    | `@ai-sdk/openai-compatible` |
| `glm-5.3`            | openai chat-completions | 1x      | `@ai-sdk/openai-compatible` |
| `gpt-6.1-sol`        | openai chat-completions | 1x      | `@ai-sdk/openai-compatible` |
| `qwen4-max`          | anthropic messages      | 1.4x    | `@ai-sdk/anthropic`         |
| `qwen3.8-max`        | openai chat-completions | 1.9x    | `@ai-sdk/openai-compatible` |
| `deepseek-flash`     | openai chat-completions | 0.2x    | `@ai-sdk/openai-compatible` |
| `glm-5.3-flash`      | openai chat-completions | 0.2x    | `@ai-sdk/openai-compatible` |
| `kimi-k3.1-pro`      | openai chat-completions | 2.6x    | `@ai-sdk/openai-compatible` |
| `minimax-m3.1-flash` | anthropic messages      | 0.2x    | `@ai-sdk/anthropic`         |

The live catalog comes from `GET /api/desktop/chat-modes` (60 second cache). The catalog contains
duplicate keys across tiers (standard + frontier); the plugin keeps the first enabled entry per key
in server order, which matches the account's tier defaults. A 2026-11-27 snapshot is built in as a
fallback for the signed-out state and for catalog outages, stamped with the
`magpie.fellBack` marker.

## Install

```bash
magpie plugin add ./magpie-qwenwork     # a local folder
magpie plugin add magpie-qwenwork       # npm, once published
```

In the app: **Plugins -> Add plugin** -> paste the folder path or package name.

## Sign in

`magpie plugin login qwenwork` offers two methods:

| Method                    | Needs                                   | What it does                                                                                                                                            |
| ------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Read the desktop app**  | the QwenWork desktop app signed in once | returns immediately if a fresh session exists; otherwise shows the QwenWork sign-in page and adopts the session from `auth-v2.dat` once the app logs in |
| **Paste a session token** | the session token from `auth-v2.dat`    | validates the token by minting a MaaS key (costs no credits); useful for non-standard installs                                                          |

The adopted session is reread from disk on every mint, so as long as the desktop app keeps
`auth-v2.dat` fresh the plugin keeps working without re-login. A disk session is trusted while it
has more than 5 minutes of validity left; adoption during sign-in requires 2 minutes, so a dying
session always gets re-verified by a fresh mint. Nothing is ever written to QwenWork
files, and the refresh-token flow is never called (the app owns it).

## Daily check-in

The plugin exposes Magpie's optional `auth.checkin` hook, mapped to QwenWork's daily-credit-notice
claim (`POST /api/v1/adapter/user/daily-credit-notice/claim`, costs nothing). Outcomes:
`claimed` (`Claimed 20 credits`), `ineligible` (nothing offered today, or the endpoint is not
served on this plan/deployment - the measured Free/global state, cached for the host process
lifetime so it is never retried), or `failed` (server/network trouble, including an expired sign-in, which asks for
a re-login).

## How it works

1. **Session token**: decrypted from `%APPDATA%\QwenWork\auth-v2.dat` (Chromium os_crypt `v10`
   AES-256-GCM; the key is DPAPI-unprotected from `Local State`). Windows only in v1. The paste
   method needs no local decryption.
2. **Mint**: `POST https://gateway.qwenwork.ai/api/desktop-sessions` with the session token and the
   desktop header set returns a 2 hour MaaS access key and a server-selected `base_url`
   (`api1.qwenwork.ai` today). The key is rotated 10 minutes before expiry, in memory only, with a
   single-flight guard.
3. **Model calls**: `{base_url}/v1/chat/completions` and `{base_url}/v1/messages`. The loader always
   rebuilds the request URL from the current mint (the incoming host is never trusted), injects
   `Authorization: Bearer`, and on a 401 re-mints once and retries once before flagging the response
   with `X-Magpie-Sign-In: expired`.
4. **Quota**: the card merges five sources, one call each, cached for 60 seconds:
   `GET /api/v1/adapter/user/balance` on the gateway (precise remaining pool), `GET /api/v2/quota/usage`
   (optional daily/monthly/add-on credit breakdown parsed from `daily_quota`-class keys, when the
   deployment populates them), `GET /user/v2/wallets` on `qwenwork.ai` (the web user-service: real
   per-credit buckets with `valid_from`/`valid_to`, falling back to `/user/wallets` totals; skipped
   after a permanent miss) and `GET /api/v1/adapter/user/account-context` (plan name, refresh date,
   fallback pool). Bucketed credit pools get expiring windows (`Daily 199.95 credits` resetting at
   the wallet's `valid_to`, `Plan`, `Add-on`); the pool still always shows as `699.95 credits
remaining`, plus a display-only minted-key lifetime window.

Credentials travel only to `gateway.qwenwork.ai`, the minted `base_url`, and `qwenwork.ai` (the
web user-service that serves the per-credit wallet buckets). Tokens are never logged
(masked as a sha256 prefix plus length). All requests use `redirect: "error"`.

## Options

`magpie plugin options qwenwork '<json>'` accepts:

```json
{ "lang": "auto", "allowModelKeys": [], "debug": false }
```

- `lang`: `auto`, `en` or `zh` for plugin-facing strings (follows `MAGPIE_LANG` by default).
- `allowModelKeys`: restrict the exposed models to a list of catalog keys.
- `debug`: also print plugin logs to stderr.

Advanced, not exposed in the Options editor: `gatewayOrigin` (option; overrides the gateway origin
for mint/catalog/quota/check-in - leave unset unless you run a mirror deployment, since it moves
where credentials are sent; wallet buckets always come from `qwenwork.ai`), and the
`QWENWORK_HOME` environment variable (points the credential reader at a different QwenWork data
directory; `~` paths are expanded).

## Scripts

```bash
npm test                 # offline units + plugin contract test (node --test)
npm run probe            # local credential summary (masked)
npm run probe -- --live  # adds one mint + live catalog fetch
npm run e2e              # full live pipeline, writes artifacts/e2e-*.json|md
```

`QWENWORK_E2E=1 node --test` additionally runs the live gateway test.

## Limitations

- Windows only in v1 (macOS/Linux QwenWork builds store the session in the system keychain).
- Global build (`gateway.qwenwork.ai`) only; the CN build (`*.qwenwork.cn`) is not targeted.
- Multi-identity installs (`identityVersion > 0`) and business accounts are detected and refused.
- Environments without desktop MaaS enabled return a clear error on mint (HTTP 503).
- Model calls consume QwenWork credits at the per-model multiplier; the quota card shows the
  remaining balance. Model descriptions carry the multiplier.

## Unofficial interop notice

This plugin interoperates with the user's own locally installed QwenWork account. It is not
affiliated with or endorsed by Alibaba/Qwen. No tokens are redistributed. See [NOTICE](./NOTICE).

## License

MIT. See [LICENSE](./LICENSE).
