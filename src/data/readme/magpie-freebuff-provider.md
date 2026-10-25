# Freebuff provider for magpie & DeepSeek Harness

Freebuff's free models in [magpie](https://usemagpie.ai) and
[DeepSeek Harness](https://github.com/yetone) — through the account's own
browser sign-in, with a multi-account pool that rotates when a daily quota
runs out, and streaming tool calls.

Freebuff is Codebuff's free tier. It costs nothing to use, but the allowance is
small and time-boxed: 5 freebucks buys a one-hour session, one account gets 25
freebucks a day.

Unofficial. Not affiliated with Codebuff or Freebuff.

> **Status: beta (`0.3.0-beta.1`).** The tool-calling path is implemented and
> covered by 38 assertions, and its wire format was checked against Freebuff's
> own client — but it has **not** been exercised end to end against a live
> Freebuff account (the one available during development is suspended).
> Install with `@beta`; the stable tag is held until that test runs.

---

## The three packages

One repo, one protocol core, two thin shells:

```
freebuff-core ──┬──> magpie-freebuff-provider
                └──> dsh-freebuff-provider
```

| Package | What it is | Install into |
|---|---|---|
| [`freebuff-core`](packages/core) | Protocol core: device signing, catalog, session admission, SSE tool-call parsing, message normalization. **Not installed directly** — both shells depend on it. | — |
| [`magpie-freebuff-provider`](packages/magpie) | magpie / OpenCode plugin: exports the `config` / `auth` / `provider` hooks. | magpie, OpenCode |
| [`dsh-freebuff-provider`](packages/dsh) | DSH bundle + local gateway: an OpenAI-compatible endpoint on `127.0.0.1:8937`. | DeepSeek Harness |

**Why two shells and not one package:** magpie wants a plugin object with hooks;
DSH wants an HTTP endpoint it talks OpenAI to. The protocol underneath — device
signature, session admission, account rotation, tool-call parsing — is identical,
so it lives once in `freebuff-core`.

---

## Install

Published to npm, as `@beta`:

| Package | |
|---|---|
| [`freebuff-core`](https://www.npmjs.com/package/freebuff-core) | protocol core, inlined inside both packages — not installed separately |
| [`magpie-freebuff-provider`](https://www.npmjs.com/package/magpie-freebuff-provider) | magpie / OpenCode |
| [`dsh-freebuff-provider`](https://www.npmjs.com/package/dsh-freebuff-provider) | DeepSeek Harness |

### magpie

```sh
magpie plugin add magpie-freebuff-provider@beta
magpie plugin login freebuff
```

Or from a packed tarball:

```sh
npm pack --workspace magpie-freebuff-provider --pack-destination dist
magpie plugin add ./dist/magpie-freebuff-provider-0.3.0-beta.1.tgz
```

### DeepSeek Harness

```sh
dsh plugin --profile desktop add dsh-freebuff-provider@beta
```

The package ships a gateway binary. Start it:

```sh
npx freebuff-gateway
# or
node node_modules/dsh-freebuff-provider/gateway.mjs
```

Then point a DSH provider at it. Add to `~/.dsh/profiles/<name>/cordis.patch.yml`:

```yaml
- id: llm-pi-ai
  name: "@deepseek-ai/dsh-llm-pi-ai"
  config:
    providers:
      freebuff:
        displayName: Freebuff
        apiKeyEnv: FREEBUFF_LOCAL_KEY
        api: openai-completions
        baseURL: http://127.0.0.1:8937/v1
        models:
          - id: freebuff/solar-pro4
            name: Solar Pro 4 · 0fb
            contextWindow: 1048576
            maxTokens: 32768
            input: [text, image]
```

```sh
set FREEBUFF_LOCAL_KEY=local-freebuff
```

`patchEntry()` in `dsh-freebuff-provider` generates this block programmatically
if you would rather not hand-write it:

```js
import { patchEntry } from 'dsh-freebuff-provider'
console.log(JSON.stringify(patchEntry(8937), null, 2))
```

---

## Sign-in

Two ways, both work in magpie and in the gateway:

**Browser sign-in.** Freebuff's own login page opens; sign in and the account is
picked up. Repeat to add more accounts — the pool holds them all.

**Token.** Paste an existing Freebuff `authToken` (a 36-character UUID). Sends
nothing at sign-in, so it works headless. Get it from
`~/.config/manicode/credentials.json` → `default.authToken`, written by the
official CLI after one sign-in.

---

## Models

Captured from the account's catalog at call time, so it follows what Freebuff
actually offers. Locked rows (paid plans) are filtered out.

The four `0fb` models cost no freebucks but still consume one of the day's
session windows. The `5fb`–`20fb` models spend freebucks.

Tool calls stream through: `tools`, `tool_choice` and `parallel_tool_calls` go
to Freebuff; `tool_calls` come back as standard OpenAI deltas.

---

## Quota

1. **5 freebucks = one hour.** Fixed, non-pausable, non-refundable.
2. **25 freebucks a day**, resets at Pacific midnight (≈15:00 Beijing).
   At most **5 sessions per account per day**.
3. **One premium session at a time per account.** Opening a second takes the
   first away.

The plugin never opens a session it cannot pay for: a model priced above the
remaining balance is blocked with a readable reason. `0fb` models stay openable
at zero balance.

---

## Running both hosts at once

**Don't share one Freebuff account between them.** Freebuff allows one session
per account, so magpie and the DSH gateway using the same account will take each
other's session away — you will see a stream of `409`s.

Pick one:

- **One host only.** Disable the other (`magpie plugin off freebuff`, or stop the
  gateway).
- **Two accounts.** Sign a different Freebuff account into each.

There is also a second, quieter cost: each shell generates its own Ed25519 device
key, so one account talking through both looks like two machines. That is one of
the patterns that gets an account flagged.

---

## Keeping the account alive

- **One client per account** — not the plugin, the desktop app and the CLI at once.
- **Do not rebuild the device key.** It is created once and reused; replacing it
  registers a new device.
- **Space out model switches.** Several within a minute is the kind of pattern
  that draws attention.
- **`403 account_suspended` means the account is gone.** Stop; do not keep
  probing. Appeal through the Freebuff account page.

---

## Troubleshooting

| What you see | What it means |
|---|---|
| `403 free_mode_cli_required` | The request did not look like the official CLI's — usually a header set that drifted. |
| `403 account_suspended` | Suspended, not rate-limited. Stop and appeal. |
| `402 Out of credits` | Daily freebucks gone; resets at Pacific midnight. |
| `409 session_model_mismatch` | Session was opened for another model; the plugin re-opens it. |
| `429 rate_limited` | Per-model daily call count; `retryAfterMs` says how long. |
| No models listed | Not signed in yet, or the catalog call failed. |
| `magpie` shows 0 models | `config` did not run, or the static table was overwritten. |

---

## Develop

```sh
npm install          # links the three workspaces
npm test             # 26 assertions across all three packages
npm run pack:all     # tarballs into dist/
```

`scripts/test-installed.mjs` additionally installs the tarballs into a scratch
directory and re-checks them, so packaging mistakes surface before publishing.

---

## Notes on the protocol

Requests are signed with an Ed25519 device key over a six-line payload: version,
method, path, timestamp, body SHA-256, fetch id. The `user` message content is an
array of `{type:"text",text}` parts rather than a bare string, and `role:"tool"`
carries an underscore `tool_call_id` — both match what Freebuff's own client
sends. Sessions are released on the `/attempt` endpoint, which is what the
official client uses; the other one invalidates the whole session chain.

---

## License

MIT. See [LICENSE](LICENSE).
