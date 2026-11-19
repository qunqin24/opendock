# magpie-pollinations

Pollinations (https://pollinations.ai) provider plugin for magpie and OpenCode. It exposes Pollinations' OpenAI-compatible text models through the magpie gateway, with device-code or secret-key sign-in, a live model catalog, and the Pollen wallet balance.

Provider id: `pollinations`.

[![npm version](https://img.shields.io/npm/v/%40sterra-mind/magpie-pollinations)](https://www.npmjs.com/package/@sterra-mind/magpie-pollinations)

## Install

```sh
magpie plugin add @sterra-mind/magpie-pollinations
```

After adding the plugin, sign in from the provider page in magpie. The model list loads automatically once signed in.

## Sign in

- **Device code (recommended):** choose this method in magpie and confirm the short code in the browser page that opens. The plugin uses Pollinations' own publishable client id; no client secret is embedded.
- **Secret key:** paste an `sk_` key from https://enter.pollinations.ai/keys.

For the balance panel to fill in, the key needs the read-only `account:usage` permission. Keys created through the device flow ask for `profile usage` scope; a pasted key must already carry that permission. A key with only a pollen budget still works for generation, but the plugin shows only the budget balance.

## What it provides

- **Live models:** reads `GET /models` and keeps every text model serving `/v1/chat/completions`. Model ids keep their full `publisher/model` form so models from different publishers never collide. Cost and context limits come from the vendor's own catalog.
- **Wallet balance:** publishes total Pollen plus separate Quest and paid buckets when the key has the `account:usage` permission. The figure is a prepaid-wallet balance so magpie's router can prefer accounts with more credit left.
- **Usage:** reads account usage and reports each call to magpie with token counts and the cost Pollinations assigned.

## Pricing

Pollinations prices models in Pollen per token. The plugin converts the vendor's per-token figure to magpie's per-million-token cost. Paid-only models are marked as not free. `1 Pollen ≈ 1 USD`; see the [Pollen FAQ](https://github.com/pollinations/pollinations/blob/main/enter.pollinations.ai/POLLEN_FAQ.md).

## Quest rewards

Quest completion happens on the server as you use the models. Claiming a reward is dashboard-only: https://enter.pollinations.ai/quests. Pollinations publishes no API for claiming, so this plugin does not implement a daily check-in and never reports a reward as claimed.

## Repository layout

- `packages/pollinations/` — plugin source, published to npm as `@sterra-mind/magpie-pollinations`.
- `docs/` — API contract, auth flow, architecture, publishing record, test report, registry entry draft.

## Development

```sh
cd packages/pollinations
bun test
```

Tests use a mock `fetch` and never touch the network.

## License

MIT
