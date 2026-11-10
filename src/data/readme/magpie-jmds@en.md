[中文](./README.md)

# magpie-jmds

A [magpie](https://usemagpie.ai) plugin for paying [jmds](https://api.jmds.dev) users. Sign in with an API key to see subscription windows, extra usage, wallet balance, available models and token prices.

**Reports facts; does not choose your routing.** The single provider is `jmds`. The plugin installs and exports no routing strategy. Its readings are available to magpie's display and the routing mode you choose.

## Install and sign in

Requires **magpie ≥ v0.1.1937**, including routing support for wallets from multiple providers.

```sh
magpie plugin add magpie-jmds
magpie plugin login jmds
```

Alternatively, install `magpie-jmds` from magpie's plugin page and add a `jmds` account.

When using Claude Code through magpie, the plugin restores client identity headers from the request's Claude Code attribution.

Only your API key (`sk-…`) is required. No site address, website password or browser sign-in is needed. The first prompt is an **optional account name**: press Enter to skip it, then paste the key. Each sign-in adds one account; repeat for additional keys.

A supplied name becomes the account's label. Otherwise it is `api.jmds.dev …last4`. Naming is saved on first use, so the initial label may briefly be magpie's default. magpie stores account settings under the name: remove and sign in again to rename. Do not add the same key unnecessarily.

## What magpie shows

| Key or limit | Reading |
|---|---|
| Subscription key | Plan name, expiry, `24 hours` / `7 days` / `30 days` windows and reset times returned by the service |
| Extra usage | `额外用量` used / total granted. When a subscription window is full and the pool has funds left, full subscription windows become display-only and the pool counts for routing. Otherwise the pool is display-only |
| Balance key | Plan `按量付费`, a `余额` wallet window and a dollar balance. magpie can treat a zero wallet as exhausted |
| Key limits | `Key 总额度` and configured `5 hours` / `24 hours` / `7 days` limits, alongside subscription windows |
| Models | Models available to the key as `jmds/<model-id>`. Known token pricing is in USD per million tokens: input, output, cache read and write |

Unlimited windows get no invented limit. Missing reset times are not calculated. Total key quota and the extra pool have no invented duration or reset. A model without token pricing has no cost reported, not a fabricated zero price.

A subscription key shows only its bound group's subscription and **no wallet**. A balance key uses the user's wallet and **shows no subscription**. If you have both kinds, sign in separately. Missing or expired subscriptions show an error; refused keys ask you to sign in again.

Claude models use `/v1/messages`, OpenAI models `/v1/responses`, and others `/v1/chat/completions`. Reasoning levels come first from the service's Codex manifest, then official [models.dev](https://models.dev) entries, then magpie's existing variants. A reasoning model with none of those gets `low` / `medium` / `high`. models.dev also supplies context/output limits and interleaved capabilities, is cached daily, and never blocks discovery when unavailable.

## Choose your routing

Configure accounts or groups in magpie as you prefer: least usage, sequential order, or a cheapest routing group, for example. The plugin does not select a strategy, reorder accounts or create groups. Subscription allowance and wallet money are different readings; a subscription model's listed token price is not a promise that the next request will be charged to a wallet.

Known service refusals are translated into magpie's quota, credit, sign-in or short rate-limit errors. Reset times come only from that account's last usage reading; without a reading the plugin does not guess.

## Address and compatibility

The default is `https://api.jmds.dev`; normal use needs no options. To test another deployment, override the plugin-wide address:

```sh
magpie plugin options magpie-jmds '{"baseURL":"https://api.example.com"}'
```

Usage and prices come from `/v1/sub2api/key-status`. A 404 falls back to the legacy usage endpoint and `/v1/models`. Legacy replies cannot provide all concurrent limits, extra pools, routable wallet readings or prices; only facts they actually return are shown. Other errors do not trigger fallback.

## Development and testing

Requires Node.js ≥ 20 and Docker; no npm dependencies.

```sh
SUB2API_IMAGE=sub2api-fork:key-status ./test/run.sh
SUB2API_IMAGE=weishaw/sub2api:latest ./test/run.sh
```

`SUB2API_IMAGE` is a full image reference. Existing local images are used directly. Tests start an isolated gateway, Postgres, Redis and a fake model upstream, send real requests, and call the plugin hooks. Containers and volumes are reclaimed on exit. Outputs go to `test/artifacts/<image-label>/`.

Manual smoke with real magpie sends a real model request and may incur charges. Configuration and sign-ins are isolated in `.e2e/`:

```sh
JMDS_KEY=sk-... JMDS_NAME=test ./e2e.sh
# Optional JMDS_BASE_URL; MAGPIE selects a binary
```

See [RELEASE.md](./RELEASE.md) for publishing.

## License

MIT. The icon is the jmds site icon.
