# magpie-muse-auth

Muse (Meta) provider plugin for [Magpie](https://github.com/yetone/magpie) and OpenCode, written in the shape of the Nous Portal plugin (`@magpie-community/opencode-nous-auth`).

Sign-in is Meta's device-code OAuth — the same flow CLIProxyAPI uses — then an API key is minted from the DCA token and every chat request goes to Meta's Responses API. The plugin is deliberately thin: Magpie's gateway already translates whatever the agent sent into the API the model speaks, and `npm: "@ai-sdk/openai"` makes that the OpenAI Responses API, so the request this plugin's `fetch` receives IS a Responses request. It only signs it, normalizes two fields Meta is strict about, and passes the answer back untouched. No hand-rolled protocol translation: the gateway's own translation handles messages, tools, images, reasoning summaries and structured output.

## Install

```sh
magpie plugin add <path-to-this-folder>
# or, once published:
magpie plugin add magpie-muse-auth
```

Then sign in from Magpie (`magpie plugin login muse`, the Plugins page, or `magpie accounts add`). Two ways in: **device code** — open the Meta URL it shows, confirm the device code in your browser, and the sign-in finishes automatically; or **import** — paste a CLIProxyAPI Meta auth file (its whole JSON) or just its `dca_token`, and the plugin mints a fresh API key from that DCA token to prove it still works. Minting does not rotate the DCA token, so CLIProxyAPI keeps working alongside Magpie. The minted API key and DCA token are stored by Magpie in `plugin-auth.json`; this plugin never writes credential files itself.

Verify with one tiny request per API (runs in a sandbox with its own `HOME` so the real Magpie is never touched):

```sh
magpie provider test muse
magpie quota   # the usage hook: plan + account
```

## Models

| Model | Context | Max output |
|---|---|---|
| `muse-wonder-1.0` | 1,007,997 | 128,000 |
| `muse-wonder-full-1.0` | 1,007,997 | 128,000 |
| `muse-spark-1.3` | 1,048,576 | 65,536 |
| `muse-spark-1.2` | 1,048,576 | 65,536 |
| `muse-spark-1.1` | 1,048,576 | 65,536 |

Every model except Spark 1.1 also ships as a `-contributor` variant. Reasoning effort is selectable per model through the `minimal` … `max` variants (the gateway then sends `reasoning: {effort, summary: "auto"}` on the Responses request); with nothing selected, Meta's default applies.

## How it works

```
device-code OAuth (auth.meta.com, client_id of Muse CLI)
  -> DCA token (dca:...)
  -> mint API key (api.meta.ai/muse-code/key)
  -> Bearer api_key -> POST api.meta.ai/v1/responses
```

- `oauth.mjs` — device flow, key minting, refresh (re-mint from the stored DCA token), sign-in persistence through the host.
- `index.mjs` — the plugin hooks: `config`, `provider.models`, `auth.loader` (custom `fetch`), `auth.refresh`, `auth.usage`, `auth.methods`. The custom `fetch` only ever talks to `https://api.meta.ai/v1/responses` (any other destination is refused before a token is read), strips auth-ish headers, sets `Authorization: Bearer <minted key>` plus Meta's build user-agent and `X-Client-Id: tbh:tui`, normalizes the request (drops `client_metadata` and four other fields Meta refuses, ensures `instructions` exists), and retries once after a 401 with a freshly minted key. `searches: true` is set on the provider, so a client's web search reaches Meta's own hosted search instead of Magpie's.

## Risks and limits — read before using

- **Terms of service.** This signs in with Meta Muse CLI's own OAuth client and calls Meta's Model API directly, outside the CLI. Meta's terms say a Muse Code subscription is for use with the Muse Code CLI. Using it can risk a 403 (`client_attestation_denied`) or an account action, the same risk CLIProxyAPI's Meta support carries. If that risk matters more than having a gateway-routable provider, use the `muse serve` path instead (`opencode-muse`, which keeps auth inside the official CLI).
- **Contributor lane.** The `-contributor` models bill through Meta's Contributor lane (data may be used for training). Do not route them at code you do not want trained on.
- **No live catalog.** Meta exposes no model list for this API; the models above are a static registry mirroring CLIProxyAPI's.
- **If Meta 400s a request:** the first suspect is `store: false`, which the gateway always sends on Responses requests. The fix is one line in `index.mjs`'s `normalizeRequest`: `delete out.store`.

## Tests

```sh
npm test
```

All offline: the sign-in and request-path tests mock `fetch`.

## Changelog

- **0.1.5** — Second sign-in method: import a CLIProxyAPI Meta auth file. Paste the whole JSON (or just its `dca_token`) into the prompt Magpie shows; the plugin mints a fresh API key from that DCA token to prove it still works, and the file's account details fill in whatever the mint response does not say. A bare API key (`LLM|…`) is refused — without the DCA token there is nothing to mint the next key from. Minting does not rotate the DCA token, so CLIProxyAPI keeps working alongside Magpie (unlike a Codex import, which spends the refresh token). Magpie itself has no import hook for plugin-owned providers (its file-upload import is built-in-only), so this prompt is the plugin-side equivalent.
- **0.1.4** — Refresh the client fingerprint to Muse Code 1.4.14: the build User-Agent is now `muse-build/1.4.14 (non-interactive; <host platform>; build dec7d749...)`, the values CLIProxyAPI v8.0.63 captured from the real 1.4.14 CLI (version and build hash move together; the platform is the host's own, gateway requests are non-interactive), and `X-Client-Id` moves from `tbh:tui` to `tbh:exec` to match. The OAuth User-Agent stays `muse-code/1.0.2`, unchanged upstream.
- **0.1.3** — Fix the missing provider icon: the auth hook declared `icon: "meta"`, which matches no bundled icon Magpie ships (only `metaai-color` exists), and the host only keeps https/data picture URLs, so the provider fell back to the default picture. The Meta AI mark is now vendored as `icon.svg` and wired into the auth hook and `package.json`'s `magpie.icon`.
- **0.1.2** — Fix refresh after the stamped DCA deadline passes: a successful mint now moves the stored `expires` forward (the minted key is the usable credential; minting proves the DCA token still works), instead of keeping the stale deadline and failing every request with `unusable_sign_in`. Only a mint that actually fails with 401/403 ends the sign-in.
- **0.1.1** — Rebuilt thin: the gateway translates to Responses, the plugin only signs + normalizes; dropped the hand-rolled `responses.mjs`.
