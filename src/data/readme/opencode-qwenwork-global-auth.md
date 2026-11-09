# opencode-qwenwork-global-auth

**QwenWork Global** — the overseas cloud of Alibaba's QwenWork (千问办公国际版,
[qwenwork.ai](https://qwenwork.ai)) — in OpenCode and
[magpie](https://usemagpie.ai).

[`@magpie-community/opencode-qoder-auth`](https://www.npmjs.com/package/@magpie-community/opencode-qoder-auth)
serves four sites: `qoder` (qoder.com), `qoder-cn` (qoder.cn), `qwenwork`
(gateway.qwenwork.cn) and `qwenwork-enterprise`. Its QwenWork support stops at
the **.cn** gateway; a QwenWork account made on the **global** cloud signs in
nowhere in it. This package is that one, forked from **0.2.63** with one site
added:

| Provider id | Site | Accounts | Plugin export | Where from |
|---|---|---|---|---|
| `qwenwork-intl` | gateway.qwenwork.ai (**global**) | phone number or email | `QwenWorkIntlAuthPlugin` | **this package** |
| `qwenwork` | gateway.qwenwork.cn | phone number or email | `QwenWorkAuthPlugin` | upstream, still exported by `index.mjs` |
| `qoder`, `qoder-cn`, `qwenwork-enterprise` | as upstream | as upstream | as upstream | upstream, still exported by `index.mjs` |

The global cloud is the same product on the same protocol — same COSY envelope,
same body codec, same device flow, same `qwork` scene, same RSA key — behind a
different gateway, a different OAuth client id and a different deep-link scheme.
So this is a site preset, not a new protocol: the patch is 4 hunks in
`index.mjs` and 1 export line in `opencode.mjs` ([below](#the-patch)).

## Install

### magpie, from a local checkout (no publish needed)

```sh
magpie plugin add /path/to/opencode-qwenwork-global-auth
magpie plugin login qwenwork-intl   # or Settings → Providers → QwenWork Global
```

`plugin add` takes the **directory** (magpie writes the path into
`~/.config/magpie/plugins.json` and loads its `main` entry by itself). A
packed `.tgz` path is not accepted: magpie imports the file as-is and reports
"exports no OpenCode plugin function". The folder is the install location —
keep it where it is, and `magpie plugin update` won't touch a path spec.

From GitHub (this repository), one command, no clone needed:

```sh
magpie plugin add github:glynrichardson86/opencode-qwenwork-global-auth
magpie plugin login qwenwork-intl
```

OpenCode users can take the same package through npm's git syntax:

```sh
npm i github:glynrichardson86/opencode-qwenwork-global-auth
```

### npm (published)

The package is live on the npm registry as `opencode-qwenwork-global-auth`:

```sh
magpie plugin add opencode-qwenwork-global-auth
```

`magpie plugin update` tracks `@latest` from here.

### OpenCode, or magpie from npm

```sh
npm i opencode-qwenwork-global-auth @magpie-community/opencode-qoder-auth
```

The package exports **only** `QwenWorkIntlAuthPlugin` from its OpenCode 1.x
entry, so it sits **beside** upstream rather than over it: a host that loaded
both would otherwise see `qoder`, `qoder-cn` and `qwenwork` twice. Keep both
installed. To have this package replace upstream instead, `opencode.mjs` says
what to export.

### The provider's picture

Upstream ships no logo (its package is six code/doc files), and magpie's icon
for the .cn `qwenwork` row is magpie's own built-in set, keyed by provider id
— a new id like `qwenwork-intl` gets the generic cube. The supported hook is
magpie's own field (the plugin host's `iconOf`: the auth hook's `icon`, else
`package.json`'s `magpie.icon`; an https URL or a `data:image/` URI, at most
1.5 MB). This package embeds the **global build's own app icon** — the
`icon.icns` of the installed QwenWork.app 1.4.0, green (86,210,106), which is
the same mark qwenwork.ai serves at 192px and a different green from the CN
app's (0,203,94) — as a data URI in `package.json`. magpie re-reads it on
provider refresh; nothing is fetched at runtime.

Signing in is the same on either host: a browser opens the global sign-in;
authorize, and the plugin's poll takes the device token. magpie keeps it in
`~/.config/magpie/plugin-auth.json` under the `qwenwork-intl` provider.

## What differs from the .cn site

Every field below was read out of the global desktop build itself —
`QwenWork.app` 1.4.0 (`com.qwenwork.desktop.mac`, from
`assets.qwenwork.ai/release/latest/qwenwork-darwin-arm64.dmg`) — and then
checked against the live gateway. `QwenWorkCN.app` 1.2.1 is what upstream read
the .cn site out of.

| Field | `qwenwork` (.cn) | `qwenwork-intl` (global) | Where the global one comes from |
|---|---|---|---|
| web / openapi / api | `gateway.qwenwork.cn` | **`gateway.qwenwork.ai`** | `Hn="gateway.qwenwork.ai"` in the build's constants, and the profile's `sources.authBaseUrl` |
| `clientId` | `e883ade2-e6e3-4d6d-adf7-f92ceff5fdcb` | **`cc65e5fc-05bd-4f5d-a4e8-0df19aa3d75a`** | `CONFIGURED_OAUTH_CLIENT_ID`, which `resolveOAuthClientId` prefers over the shared `QWENWORK_CN_CLIENT_ID` |
| `redirect` | `qwenwork-cn://` | **`qwenwork://`** | `brand.deeplinkScheme`, and `Info.plist`'s one URL scheme |
| `cosyVersion` | `1.1.59` | **`1.1.71`** | the agent-sdk worker's `getVersion()` (`UH="1.1.71"`), which `QoderContext` takes as its `cosyVersion` |
| app release in headers | `1.2.1` / `1.2.1-26092107` | **`1.4.0` / `1.4.0-26110205`** | `package.json`'s `version` and `qoderworkUpgradeVersion` |
| `walletsPath` | `/api/v1/adapter/user/wallets` | **none** | the global gateway answers it **404** (the .cn one answers 401 `INVALID_TOKEN`, i.e. serves it) |
| model keys (pre-sign-in list) | `flash` / `pro` / `qwen3.8-max-preview`, Chinese names | **`qwork-auto` / `qwork-advanced` / `qwork-ultimate`** (`Standard｜Qwen3.8-Flash` / `Pro` / `Flagship`) | a signed `/algo/api/v2/model/list` on `gateway.qwenwork.ai` — HTTP 200, scene `qwork` |

Unchanged, because the two builds share them — each one checked rather than
assumed:

- **RSA key**: the global profile's `cosyPublicKey` is `null` and its
  `CONFIGURED_COSY_PUBLIC_KEY` is `""`, so `resolveCosyPublicKey` keeps the
  builtin key — byte-identical to the .cn one.
- **Scene and identity**: `scene==="qwork"` for the model list, and
  `xu()` answers `client_type "6"` and `business_product "qoder_work"` in the
  app context, as on .cn.
- **Usage and user info**: `/api/v1/adapter/user/account-context` answers the
  same 401 `{"errorCode":"INVALID_TOKEN"}` on both gateways.
- **No PAT, no check-in**: `/api/v1/jobToken/exchange` answers 404 on both, so
  `pat: false` and `checkin: false` stand.
- **Device token as the chat token** (`deviceOnly`) with the `"c"` refresh
  target, and `/api/v1/deviceToken/poll` and `/refresh` present on both with
  identical error shapes.

One thing the global build's `getQwenWorkClientHeaders` sends that 1.2.1's did
not, `X-QwenWork-App-Mode`, is left out: its value is resolved at runtime from
a profile this build does not name in the clear, and the global gateway answers
the device flow and the account-context without it.

### Credits shown without wallets

The .cn card reads a personal account's pools (daily / monthly / long-term) from
`/api/v1/adapter/user/wallets` beside the account-context. The global gateway
serves no wallets, so no `walletsPath` is set and `parseAccountContext` gets no
wallets: the card shows the account-context's `remaining` as the balance, with
no pools beside it, and keeps a used / total window where the account reports a
total. Nothing else about usage changes — `parseUsage` is the .cn site's own.

### Model keys

The global cloud's `qwork` scene does **not** carry the .cn keys. A signed
`/algo/api/v2/model/list` to `gateway.qwenwork.ai` (HTTP 200; the COSY envelope
this plugin builds is what the gateway takes — see
[Verified](#verified-and-not)) names:

| key | display_name | notes (from the same listing) |
|---|---|---|
| `qwork-auto` | Standard｜Qwen3.8-Flash | `is_vl: true`, 180K in, windows 200K/400K/1M |
| `qwork-advanced` | Pro | same shape |
| `qwork-ultimate` | Flagship | same shape |

So the site ships its own `QWENWORK_INTL_MODELS` with those keys rather than
upstream's `flash`/`pro`/`qwen3.8-max-preview` — the shipped `models` is what magpie's config offers
**before** a sign-in, and a pre-sign-in request for `flash` would name a key the
global gateway doesn't serve. After sign-in, `listAllModels: true` with
`modelScene: "qwork"` means the account's own listing replaces ids, names and
capabilities anyway. (To the unsigned probe the three came back `enable: false`
— the no-account view; a signed-in real account's own listing was checked to
have all three `enable: true`.)

## Verified, and not

`node scripts/verify.mjs` runs 29 checks that need no account: the preset's
fields, the headers it sends, the plugin it registers, and the device flow's
first step against the live gateway.

Verified live, unauthenticated:

- `gateway.qwenwork.ai/device/selectAccounts` with this site's client id and
  `qwenwork://` answers **302** to
  `qwenwork.ai/oauth2/auth?client_id=qwenwork-desktop-app&…&scope=openid+profile+email+offline_access+qwen_work`.
- **Both** fields are load-bearing, proven by refusal: the .cn client id, and
  the .cn `qwenwork-cn://` scheme, each answer **400**
  `INVALID_DEVICE_FLOW` / `query not_allowed` on the global gateway.
- `/algo/api/v2/service/pro/sse/agent_chat_generation` answers 405 to a GET
  (the endpoint is there, and wants the signed POST), and
  `/algo/api/v2/model/list` answers 403 `Signature invalid` unsigned — as on
  .cn.

- the signed `/algo/api/v2/model/list` — the gateway verifies our COSY
  envelope (the .cn gateway answers a made-up token 401 `code 105`
  "Login expired"; the global one answers **200 with its qwork catalog**,
  which is how the model keys above were read).

Verified **with a real global account** (2026-11-08, a Google sign-in through
the browser — the whole device flow, `scripts/live-e2e.mjs` +
`scripts/live-phase2.mjs`):

- The sign-in completed: the poll answered on the device token, the account
  read back as its own email, and its **biz identity (organization/team) was
  captured** on the credential, which is what the token's refresh asks with.
- **Usage** — the account-context hook returned the real plan
  ("Enterprise Standard"), a used/total credit window (0 / 2000), the plan's
  end date and the balance. No wallets were asked for, as the site sets none.
- **The account's own listing** — all three `qwork` keys came back
  `enable: true` (the anonymous probe's `enable: false` is the no-account
  view), and `provider.models` served exactly `qwork-auto` / `qwork-advanced`
  / `qwork-ultimate` with their real context windows through the plugin's own
  hook.
- **A real chat** — one completion through the loader's fetch: **HTTP 200 in
  2.3 s** from `agent_chat_generation` on `gateway.qwenwork.ai`, exact
  instructed text back, `finish_reason: stop`, and usage with
  `reasoning_tokens` — so the signed body codec, the SSE reply reader and the
  effort plumbing all work on the global gateway.

What stays unexercised: the device-token **refresh** (the issued token is
valid for days, and that path is the .cn site's own, run with this account's
recorded team identity) and the enterprise-flagship VPC domains, which the
global build does not name.

To rerun the account part yourself: `node scripts/live-e2e.mjs` prints the
sign-in URL and polls; the sign-in page's Terms dialog — agreeing to the ToS
of your own account is the one step only its human should click. The token
pair lands in `/tmp/qw-intl-cred.json` (0600; delete it when done).

## The patch

`index.mjs` is upstream 0.2.63's `index.mjs` with four hunks (+65 / −9 lines;
the only upstream code the diff removes is the header factory being
generalised, and the `_internal` export line being extended):

1. **`QWENWORK_INTL_APP`** beside `QWENWORK_APP`, and `qwenworkClientHeaders`
   refactored to `qwenworkHeadersFor(app)` so each site names its own release.
   The .cn headers are unchanged — `qwenworkHeadersFor(QWENWORK_APP)` is the
   same object literal it was.
2. **`SITES["qwenwork-intl"]`**, spread over the existing `QWENWORK_COMMON` and
   overriding `clientId`, `cosyVersion`, `redirect`, `clientHeaders` and the three
   gateway URLs — with no `walletsPath`.
3. **`export const QwenWorkIntlAuthPlugin = makePlugin(SITES["qwenwork-intl"])`**.
4. **`qwenworkIntlClientHeaders` and `QWENWORK_INTL_APP` added to `_internal`**
   (the "for tests" export), so `scripts/verify.mjs` can read them.

`opencode.mjs` exports `QwenWorkIntlAuthPlugin` alone; `opencode2.mjs` and
`LICENSE-CLIProxyAPI` are upstream's bytes, untouched.

### Re-syncing with upstream

`index.mjs` is a vendored copy, because upstream's `exports` map publishes only
`./opencode2.mjs` — its documented extension point, `export const protocol =
{ makePlugin, deviceSignIn, openapi, siteOf }`, and its `_internal.SITES` are
both unreachable from outside the package (`ERR_PACKAGE_PATH_NOT_EXPORTED` on a
deep import), so a thin wrapper has nothing to import. The trade is that this
copy does not pick up upstream's fixes by itself.

To re-sync onto a newer upstream:

```sh
npm pack @magpie-community/opencode-qoder-auth@<version> && tar -xzf *.tgz
diff -u package/index.mjs index.mjs   # expect only the four hunks above
```

Take upstream's new `index.mjs`, re-apply the four hunks, then `npm run verify`.
The hunks touch nothing upstream is likely to rewrite: a constants block, a
`SITES` entry and two export lines. If upstream adds a global QwenWork site of
its own, this package is redundant — check its README's provider table first.

## Credits

The protocol (endpoints, COSY envelope, body codec and device flow), and all of
the QwenWork .cn work this site is a variant of, come from
[`@magpie-community/opencode-qoder-auth`](https://www.npmjs.com/package/@magpie-community/opencode-qoder-auth)
by yetone, which credits
[CLIProxyAPI](https://github.com/ufec/CLIProxyAPI)'s Qoder support. Its MIT
license is in `LICENSE-CLIProxyAPI`. The global build's constants were read from
Alibaba's own published desktop app.
