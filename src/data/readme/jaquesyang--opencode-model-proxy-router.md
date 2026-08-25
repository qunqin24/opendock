# opencode-model-proxy-router

English | [简体中文](./README.zh-CN.md)

An [Opencode](https://opencode.ai) plugin that routes model API requests to different proxies by wrapping `fetch`, with hot-reload support.

## Features

- Route requests by exact model id, wildcard prefix, or catch-all default
- Per-route proxy selection with automatic fallback to direct
- Learn provider base URLs at runtime (`chat.params`) for URL-based routing
- Hot-reload: config changes are picked up without restarting
- No runtime dependencies

## Install

### From npm (Recommended)

```bash
npm install @jaquesyang/opencode-model-proxy-router
# or
bun add @jaquesyang/opencode-model-proxy-router
pnpm add @jaquesyang/opencode-model-proxy-router
yarn add @jaquesyang/opencode-model-proxy-router
```

Then add the plugin to your `opencode.json` (project root or `~/.config/opencode/opencode.json`):

```json
{
  "plugin": ["@jaquesyang/opencode-model-proxy-router"]
}
```

No build step is needed — Opencode (Bun) loads the `.ts` file directly.

### Local plugin (single file)

Copy the single file `model-proxy-router.ts` into your plugins directory:

- Project-level: `.opencode/plugins/`
- Global: `~/.config/opencode/plugins/`

No other files are needed.

### Options

Override the config path via the tuple form (works for both npm and local installs):

```json
{
  "plugin": [
    ["@jaquesyang/opencode-model-proxy-router", { "configPath": "/absolute/path.json" }]
  ]
}
```

## Config

Default location: `~/.config/opencode/model-proxy-router.json`

```json
{
  "proxies": {
    "http1": "http://user:pass@host:port",
    "http2": "http://user:pass@host:port"
  },
  "default": "direct",
  "routes": {
    "opencode-go/muse-spark-1.2-contributor": "http1",
    "opencode/muse-spark-1.2-contributor-free": "http2",
    "opencode-go/*": "http1"
  }
}
```

See `model-proxy-router.json.example`.

- **`proxies`** — named proxy entries. Keys are arbitrary labels; values are proxy URLs. This plugin only supports HTTP proxies (`http://` / `https://`). SOCKS proxies (`socks4://` / `socks5://`) are not supported — requests routed to a socks URL fail with `UnsupportedProxyProtocol`.
- **`default`** — proxy name used when no route matches, or `"direct"` (the default) to skip the proxy.
- **`routes`** — map route keys to proxy names or inline proxy URLs:
  - `"provider/model"` — exact match for `provider/model` and its bare model id `model`
  - `"prefix/*"` — wildcard match for any model starting with `prefix/`
  - matching order: exact → wildcard → `default`

Requests whose URL starts with a learned provider base URL (e.g. `https://opencode.ai/zen/...`) are routed by provider first (`provider/*` → `provider/model` → bare `model`).

## Debug

```bash
MODEL_PROXY_ROUTER_DEBUG=1 opencode
```

Logs the resolved proxy for each routed request and the provider base URLs learned at runtime.

## Test

```bash
npm test
# or
node --test test.mjs
```
