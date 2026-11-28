# opencode-runway

`opencode-runway` adds a button to the session header of OpenCode Desktop. It shows how long the session has been open and how much of your subscription quota is left for the model you are using.

The quota follows the model selected in the composer. With a ChatGPT model it shows your ChatGPT plan, and with a Claude model it shows your Claude plan. For a model that does not run on a subscription (an API key, for example), only the session age is shown.

## What it shows

- The session age and the weekly quota in the button, for example `1d 9h · GPT 30%`.
- In the panel, the 5-hour and weekly windows with a bar, the time until each one resets, and the reset date.
- A warning color from 80% used and a danger color from 95%.
- A switch for showing percentage used or remaining. The choice is stored.

## Requirements

- OpenCode Desktop 2.4.2 or later. The GUI plugin API is experimental and may change between releases.
- A ChatGPT or Claude subscription connected in OpenCode.

## Install

```sh
opencode plugin add opencode-runway
```

Or add it to your global `opencode.json` or `opencode.jsonc`. OpenCode Desktop reads plugins from this file, not from `cli.json`.

```jsonc
{
  "plugins": ["opencode-runway"]
}
```

To update or remove it:

```sh
opencode plugin update opencode-runway
opencode plugin remove opencode-runway
```

## Where the numbers come from

The plugin never calls a provider on its own and never reads or stores your credentials. It only reads quota data that arrives with the responses OpenCode already receives:

| Subscription | Source |
| --- | --- |
| ChatGPT | `x-codex-*` response headers and `codex.rate_limits` WebSocket events |
| Claude (Claude Agent) | The rate limit reported with each model step |
| Claude (API connection with a subscription login) | `anthropic-ratelimit-unified-*` response headers |

These are not documented, stable APIs, so a provider can change them. When no reading is available the panel says so and links to the provider's usage page.

A reading appears after the first reply from that provider. Readings older than 15 minutes are marked as stale, and a window is hidden once its reset time has passed.

## Limits

- The data reflects the last response from each provider. Usage from other apps shows up only after your next reply here.
- Only the built-in local OpenCode server is read. Remote servers show the session age only.
- The 5-hour window can be absent: some plans report only a weekly limit.

## Development

```sh
npm install
npm run typecheck
npm test
npm run build
```

The server part (`src/index.ts`) listens to responses and exposes the readings over a typed RPC. The Desktop part (`src/gui.tsx`) renders the button and the panel and is built to `dist/gui-experimental.cjs` with the preset from `@opencode/plugin/gui/vite`.

To try a local checkout, add its absolute path to `plugins` in your global `opencode.json`. Keep the checkout outside `~/.config/opencode/plugins/`: OpenCode auto-discovers every folder there and loads only its server part, so the Desktop button would not appear.

## License

[MIT](LICENSE)
