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

- **0.1.11** — Magpie now shows the Muse allowance. Meta sends it in every response stream as a `response.subscription_usage` event (`weekly` and 5-hour `window`, each with `used_percent` and `resets_at`) — CLIProxyAPI knows the event but strips it and never reads it, so there was no CPA check to copy; the event itself is the source. The plugin watches the stream (a TransformStream that only observes, every chunk passes through unchanged) and caches the latest reading per account; the `usage` hook returns it as two windows (5-hour + Weekly) with the used percent and reset time, so the account card shows a meter instead of "No allowance reported" and routing knows the allowance. Until an account's first request there is no reading (no separate usage endpoint exists). Cost stays 0: Meta publishes no per-token price for Muse and CPA carries none either — the subscription ($50/month Power) is the price, not a per-request cost.
- **0.1.10** — The first expired-item refusal drops ALL reasoning items at once. The named drop (0.1.7/0.1.9) is gone: the refusal only shows up when the account switched mid-conversation (or the vendor's store expired), and then every reasoning item in the history belongs to the old account/store — chasing them one by one just names the next dead id, as three consecutive retries of one real session proved (a different id each time). The turn now heals in two sends. The strip-blob retry (0.1.6), the preemptive bare drop (0.1.8) and the `previous_response_id` fallback stay. Verified against CLIProxyAPI v8.0.32 and v8.0.63: neither handles this error at all (no retry on 400 for Meta, Muse blobs kept as-is), so switching to CPA would fail identically — but its sanitizer taught the mechanism worth trying next: strip the reference (`id`), keep the content (summary), instead of dropping the whole item.
- **0.1.9** — When one dead reasoning reference is not the whole story, stop chasing them one by one. The evidence from a real stuck chat (10/11 evening): the id Meta names changes from attempt to attempt (`rs_6af2fb7e…`, then `rs_6af2ee41…`, then `rs_6af2fadae…` across three consecutive retries of the same session), so the 0.1.7 named drop heals the first item and the next refusal names another. Now a second expired-item refusal drops ALL reasoning items at once, and if Meta still names a dead item with no reasoning left in `input`, the request's `previous_response_id` is dropped too (the reference lives in the previous response, and `input` carries the full history). The retry budget grows to three resends to fit the chain (strip → named drop → drop all). The summaries are the model's notes to itself and the text history stays, so the turn can proceed.
- **0.1.8** — Drop ALL bare reasoning items up front, instead of one per retry. An old session collects one dead reasoning reference per turn, and 0.1.7 only dropped the one Meta named per request — so with two or more dead items the chat stayed stuck on the second one forever (the client's history never changes). Now every reasoning item with nothing sealed in it (no `encrypted_content`) is removed before the first send, unless the request asks the vendor to store the turn (`store: true`, in which case the vendor kept the items and a bare id resolves). A bare item is only a server-side reference and its summary is notes the model never reads back, so dropping it loses nothing the turn needs — and any number of dead items heals in a single request with no 400 spent. Sealed items are kept, and the 0.1.6/0.1.7 retry loop stays as the safety net. Mirrors Magpie's own `withoutBareReasoning` (Codex backend, #1008).
- **0.1.7** — Heal the 400 `Referenced reasoning item 'rs_…' was not found or has expired` that leaves an old chat stuck for good. A reasoning item replayed by bare reference (id only) lapses on Meta's side after a resume gap — and the client replays it on every turn, so every resend 400s. The plugin now reads the id out of the refusal, drops exactly that reasoning item from `input`, and resends in the same turn; the old chat heals on its next message instead of staying broken. The 400 branch is now a bounded loop (at most two resends, three sends total, Magpie's own limit) that heals each of the two reasoning 400s once, in either order — the expired-item drop and the 0.1.6 encrypted_content strip can chain both ways. The quoted id can hold two tokens joined by `:` and there is no evidence which one is the input item's id, so the first token is tried, then the second; if neither matches, the 400 is returned untouched. This mirrors Magpie's own `withoutUnreadable` (Codex backend, #3062), which the plugin path never went through.
- **0.1.6** — Heal the 400 `reasoning encrypted_content was not issued to this caller` on account switches. Meta binds each encrypted reasoning blob to the caller that received it, so when Magpie switches accounts mid-conversation the new account's replay of the old account's blob is refused. The plugin now retries once with `encrypted_content` stripped from every reasoning item (the visible `summary` and item `id` are kept) when Meta answers exactly that 400; other 400s pass through untouched. Same-account conversations keep the replay benefit — the strip only happens after the rejection. (CLIProxyAPI's Meta executor has a sanitizer for malformed blobs, but Muse's own format is opaque to it, so it keeps the blob and the account-switch case still hits this 400 — the rejection itself is the only signal.)
- **0.1.5** — Second sign-in method: import a CLIProxyAPI Meta auth file. Paste the whole JSON (or just its `dca_token`) into the prompt Magpie shows; the plugin mints a fresh API key from that DCA token to prove it still works, and the file's account details fill in whatever the mint response does not say. A bare API key (`LLM|…`) is refused — without the DCA token there is nothing to mint the next key from. Minting does not rotate the DCA token, so CLIProxyAPI keeps working alongside Magpie (unlike a Codex import, which spends the refresh token). Magpie itself has no import hook for plugin-owned providers (its file-upload import is built-in-only), so this prompt is the plugin-side equivalent.
- **0.1.4** — Refresh the client fingerprint to Muse Code 1.4.14: the build User-Agent is now `muse-build/1.4.14 (non-interactive; <host platform>; build dec7d749...)`, the values CLIProxyAPI v8.0.63 captured from the real 1.4.14 CLI (version and build hash move together; the platform is the host's own, gateway requests are non-interactive), and `X-Client-Id` moves from `tbh:tui` to `tbh:exec` to match. The OAuth User-Agent stays `muse-code/1.0.2`, unchanged upstream.
- **0.1.3** — Fix the missing provider icon: the auth hook declared `icon: "meta"`, which matches no bundled icon Magpie ships (only `metaai-color` exists), and the host only keeps https/data picture URLs, so the provider fell back to the default picture. The Meta AI mark is now vendored as `icon.svg` and wired into the auth hook and `package.json`'s `magpie.icon`.
- **0.1.2** — Fix refresh after the stamped DCA deadline passes: a successful mint now moves the stored `expires` forward (the minted key is the usable credential; minting proves the DCA token still works), instead of keeping the stale deadline and failing every request with `unusable_sign_in`. Only a mint that actually fails with 401/403 ends the sign-in.
- **0.1.1** — Rebuilt thin: the gateway translates to Responses, the plugin only signs + normalizes; dropped the hand-rolled `responses.mjs`.
