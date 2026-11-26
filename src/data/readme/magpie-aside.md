# magpie-aside

A magpie provider plugin that makes **Aside** subscription models available to every agent as
`aside/<model>`. It talks to Aside's own AI gateway (`https://api.aside.com/ai/v1`), reads the
signed-in Aside browser account, and routes each model to the endpoint it actually speaks.

> Status: v0.1.6. 81 unit tests green. Live checks on 2026-11-25 passed for chat streaming, tool
> calls, Anthropic Messages, OpenAI Responses and image input. See [CHANGELOG.md](./CHANGELOG.md).

## Install

```bash
magpie plugin add ./magpie-aside        # a local folder
magpie plugin add magpie-aside          # npm, once published
```

In the app: **Plugins -> Add plugin** -> paste the folder path or package name.

## Sign in

`magpie plugin login aside` offers three methods:

| Method                               | Needs                            | What it does                                                                                                                                                       |
| ------------------------------------ | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Sign in with Google**              | the Aside app installed          | returns immediately if a fresh session already exists; otherwise opens Aside so you can finish the Google sign-in there, then adopts the new session automatically |
| **Read the signed-in Aside account** | the Aside browser signed in once | reads `~/.aside/accounts.json` (or `ASIDE_HOME`), refreshes the token if needed, and validates it against the gateway                                              |
| **Paste an Aside access token**      | an access token (JWT)            | validates the token with a 1-token request; useful for a quick check or a non-standard install                                                                     |

In the first two methods the key prompt accepts `auto` (the default) meaning "read the local
account". Typing a token there behaves like the paste method.

### About the Google method

Aside's Google OAuth is brokered by its local daemon: every tRPC call, including
`accounts.auth.startGoogleOAuth` and the `/auth/callback/*` endpoints, resolves to
`http://127.0.0.1:21420`, and the daemon only accepts a session token signed by the browser
extension. A plugin cannot register a redirect URI or sign that challenge, so it cannot complete the
consent flow by itself. The plugin therefore launches Aside, lets the app do the Google sign-in, and
adopts the session it writes.

## Use

```
aside/gpt-6-luna            # OpenAI Responses
aside/claude-haiku-5-5      # Anthropic Messages
aside/gemini-4-argon        # Chat Completions
aside/glm-5.3-flash         # Chat Completions
```

The catalog is fetched from `/ai/catalog/v2` (no auth, 60 second cache) and filtered by the
account's plan (`free` < `pro` < `max`) and by `visibleModelIds`. A 2026-11-25 snapshot is built in
as a fallback for the signed-out state and for catalog outages.

| Family               | Endpoint                  | SDK                                            |
| -------------------- | ------------------------- | ---------------------------------------------- |
| `openai-responses`   | `/ai/v1/responses`        | `@ai-sdk/openai` (per-model override)          |
| `anthropic-messages` | `/ai/v1/messages`         | `@ai-sdk/anthropic` (per-model override)       |
| chat                 | `/ai/v1/chat/completions` | `@ai-sdk/openai-compatible` (provider default) |

The plugin's loader rewrites every request URL from the configured origin, so credentials only ever
go to the host you configured.

## Quota card

The plugin reads the real subscription credit from `GET /billing/subscription` with the account
token. The card shows:

- the plan, the account email and the renewal date,
- the monthly credit window: remaining and granted amount, percent used and reset date
  (for example `$17.99 / $18.00 left`, resets 2026-12-24),
- an add-on credit window when the account has one,
- a display-only session window with the remaining access-token lifetime
  (for example `Access token valid for 52m`), so a long task can be watched across a token refresh.

Results are cached for 60 seconds. If the billing call fails, the card falls back to the plan plus
the session window, so a temporary outage never hides the account. No `used` or `limit` value is
invented.

## Token handling

- The access token lasts one hour. The plugin refreshes it when less than five minutes remain.
- The refresh token is **not** rotated by the gateway. Two refreshes with the same refresh token
  both returned 200 and an identical `refreshToken`, so a refresh does not sign the browser out.
- A successful refresh is written back to `accounts.json` atomically. The write is skipped if the
  file changed underneath, so a token refreshed by the Aside daemon is never overwritten.
- The file is read on each use with a 3 second cache; the loader retries a request once after a 401
  when the file has picked up a newer token.
- Every successful refresh writes a `token refreshed: expires <iso> (written)` line to magpie's
  plugin log, so a long run can be audited after the fact.

## Options

The plugin declares its defaults in `package.json`, so **Plugins -> installed -> Options** shows a
raw JSON editor. The CLI equivalent is `magpie plugin options aside '<json>'`. The editor starts from:

```json
{
  "lang": "auto",
  "showHiddenModels": false,
  "allowRefresh": true,
  "dataDir": "",
  "baseOrigin": "https://api.aside.com",
  "debug": false
}
```

If nothing is saved, the plugin's built-in defaults apply.

| Option             | Default                 | Meaning                                                                                                                                                                    |
| ------------------ | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `baseOrigin`       | `https://api.aside.com` | upstream origin                                                                                                                                                            |
| `dataDir`          | `""`                    | Aside data dir or `accounts.json` path; empty means `ASIDE_HOME` then `~/.aside`                                                                                           |
| `lang`             | `auto`                  | UI language: `auto` follows the system locale, or pin `zh` / `en`                                                                                                          |
| `allowRefresh`     | `true`                  | refresh an expired token with `/auth/token/refresh`; set to `false` to only read the file                                                                                  |
| `showHiddenModels` | `false`                 | also expose the 6 catalog models that `visibleModelIds` hides, including the 1M-context `glm-5.3`, `glm-5.3-flash`, `deepseek-v4-flash`, `deepseek-v4-pro` and `kimi-k3.1` |
| `debug`            | `false`                 | verbose `console.error` logging, field names only, never values                                                                                                            |

## Troubleshooting

Run the probe first. It prints the account, the token expiry and the live catalog, and it never
prints the token:

```bash
npm run probe
npm run probe -- --live      # adds a 1-token chat request
```

| Symptom                                          | Likely cause                                      | What to do                                                                          |
| ------------------------------------------------ | ------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `Aside 登录已失效` / `The Aside sign-in expired` | the token expired and refresh failed              | open Aside, or use **Sign in with Google**                                          |
| `The Aside app was not found`                    | Aside is not installed in a standard location     | install it from `aside.com/download`, or use the paste method                       |
| `403` with `error code: 1010`                    | Cloudflare rejected the User-Agent                | check that no host setting overrides the plugin's `User-Agent`                      |
| `426`                                            | the model was sent to the wrong endpoint          | update the plugin; endpoint selection is per model family                           |
| Quota card shows `Access token expired`          | the file token is stale and `allowRefresh` is off | re-enable refresh or sign in again                                                  |
| A refresh write fails                            | `accounts.json` is read-only                      | the plugin keeps using the refreshed token in memory; fix permissions to persist it |

## Security

- The access token is sent only to the configured `baseOrigin`; request URLs are rebuilt from that
  origin, never from the incoming URL.
- Redirects are refused (`redirect: "error"`).
- Tokens never appear in logs or error messages; `debug` logs field names only.
- `accounts.json` is read-only for the plugin except for the atomic, compare-and-set write-back of a
  refreshed session.
- The Google method launches only the Aside binary found under `%ProgramFiles%\Aside\Application`
  (or `/Applications/Aside.app`); it never runs a user-supplied command.

## Limitations

- Google sign-in requires the Aside app, because the consent flow lives inside it.
- The card covers the subscription credit window and token lifetime; per-request usage is not
  surfaced.
- The catalog has no modality field; every model is advertised as text plus image. Image input was
  verified on `gemini-4-argon`; a text-only model will surface its own error.
- The plugin is an unofficial integration and is not affiliated with Aside.

## Development

```bash
npm test                       # unit tests, offline
ASIDE_E2E=1 npm test           # adds the live gateway test
npm run e2e                    # live E2E, writes a local report
npm run probe                  # read-only protocol probe
```

Chinese README: [README.zh-CN.md](./README.zh-CN.md).

## License

MIT. See [LICENSE](./LICENSE) and [NOTICE](./NOTICE).
