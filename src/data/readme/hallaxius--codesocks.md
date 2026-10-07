# CodeSocks — interceptor proxy for OpenCode V2

[![CI](https://github.com/Hallaxius/codesocks/actions/workflows/ci.yaml/badge.svg)](https://github.com/Hallaxius/codesocks/actions/workflows/ci.yaml)
[![npm version](https://img.shields.io/npm/v/@hallaxius/codesocks.svg)](https://www.npmjs.com/package/@hallaxius/codesocks)
[![license: Apache-2.0](https://img.shields.io/badge/License-Apache--2.0-yellow.svg)](./LICENSE)
[![Node.js >= 24](https://img.shields.io/badge/node-%3E%3D24-brightgreen.svg)](https://nodejs.org)

Maintained by [Hallaxius](https://github.com/Hallaxius).

Native OpenCode V2 plugin (`@opencode/plugin` 2.x) that routes HTTP traffic of selected providers through an explicit HTTP/HTTPS/SOCKS proxy, preserving `baseURL`, body, credentials, and streaming (SSE).

Flow: `prompt → provider http.request hook → local 127.0.0.1 relay → configured proxy → original baseURL`.

> Does not eliminate provider rate limits. What the plugin does is change the egress IP and apply per-provider pacing/queueing (`maxConcurrent`, `minIntervalMs`, `429` backoff honoring `Retry-After`). Account/plan limits still apply.

## Compatibility

- OpenCode V2 (`>=2.0.15 <3`), tested against CLI `2.0.15` and the `anomalyco/opencode` `v2` branch (SHA `6bffe79` in `docs/opencode-analysis.md`).
- Stable local-directory entrypoint: `server.js` re-exports `dist/index.js` (the V2 loader requires a directory, not a file).
- `Plugin.define({ id: "codesocks" })`, `ctx.provider.transform` forces `settings.transport = "http"` on selected providers, `ctx.session.hook("http.request", …, { providerID })` rewrites, `experimental.ws.handshake` fails closed (WebSocket does not go through the relay).

## Installation

```bash
bun install
bun run build
```

In the project (or global) `opencode.jsonc`, register the package directory:

```jsonc
{
  "plugins": [{ "package": "file:///path/to/codesocks" }]
}
```

## Configuration — `codesocks.jsonc`

Lives next to `opencode.jsonc`/`opencode.json` (directly or inside `.opencode/`) for easy maintenance. Deterministic precedence, no merging:

1. Plugin option `configPath` (relative to `ctx.location.directory`) — must exist.
2. `$CODESOCKS_CONFIG` — must exist.
3. Nearest sibling walking up from `directory` to the root: `codesocks.jsonc` next to `opencode.json/jsonc`, directly or in `.opencode/`.
4. Global: `dirname($OPENCODE_CONFIG)` / `$OPENCODE_CONFIG_DIR` / `$XDG_CONFIG_HOME/opencode` / `<home>/.config/opencode`.
5. Absent → plugin disabled (empty maps), no error.

Minimal example (`examples/codesocks.example.jsonc`):

```jsonc
{
  "$schema": "../codesocks.schema.json",
  "enabled": false, // switch to true after configuring a real proxy
  "proxies": {
    // "socks5h://{env:PROXY_USER}:{env:PROXY_PASS}@127.0.0.1:1080"
    "local": "socks5h://127.0.0.1:1080"
  },
  "providers": {
    "openai": {
      "proxy": "local",
      "allowedOrigins": ["https://api.openai.com"],
      "maxConcurrent": 2,
      "minIntervalMs": 0,
      "timeoutMs": 120000,
      "maxQueueWaitMs": 120000
    }
  }
}
```

Rules (fail-closed, never leaking URLs in errors):

- `proxies`: `http`, `https`, `socks4`, `socks4a`, `socks5`, `socks5h` schemes; no path/query/fragment/PAC. Secrets only via `{env:NAME}` in proxy URLs; a missing/empty variable is an error.
- `providers.<id>`: `proxy` must exist in `proxies` (own-key comparison), `allowedOrigins` non-empty, exact `http(s)` origins normalized to `origin` (case/default-port/trailing-slash normalized), no credentials/path.
- Unknown fields, `__proto__`, invalid JSONC, or an unreadable selected file = `ConfigError`.
- The `__proto__` key is rejected by scanning the raw text before parsing; internal maps use null prototypes.

## Relay security

- HTTP relay on `127.0.0.1` only, ephemeral port; rewrite via random 32-byte single-use tickets, 60 s expiry, 1024 pending cap, method check; invalid/replayed ticket = `403`.
- Only `allowedOrigins` origins; an unapproved origin errors before any network happens (credentials never leave for the wrong destination).
- Upstream `3xx` is blocked with a generic `502` (never follows redirects outside the proxy); `429` applies `cooldown` from `Retry-After` (seconds/date, 1 s default, never shortens an existing wait).
- Hop-by-hop and `proxy-*` headers stripped; status/body/SSE preserved; abort/timeout cancel the upstream socket; explicit agents (`http-proxy-agent`/`https-proxy-agent`/`socks-proxy-agent`) with no `HTTP_PROXY/HTTPS_PROXY/NO_PROXY`.
- `socks5h` resolves DNS at the proxy (domain ATYP); end-to-end verified TLS, never disabling verification.

## Verification

```bash
bun run check          # typecheck + build + 37 tests (bun test tests)
bun run smoke:opencode # brings up fake local SSE origin + proxy and runs isolated `opencode run --standalone`
bun audit --production # clean — 0 vulnerabilities (the transitive @opentelemetry/core moderate went away upstream with @opencode/plugin 2.0.22)
npm pack --dry-run     # tarball: dist + server.js + schema + examples + README + LICENSE
```

Expected smoke: `{"result":"PASS","proxyHits":2,"upstreamHits":2,"marker":"CODESOCKS_SMOKE_OK"}`.

## Honest limits

- WebSocket on selected providers is refused (use HTTP). `ctx.generate.text` outside a session does not pass through session hooks.
- Queue capped at 256 per provider; `503` when the queue is unavailable, generic `502` on transport failure.
- Current audit: clean (`bun audit --production` with 0 vulnerabilities; the transitive `@opentelemetry/core` moderate was fixed upstream in `@opencode/plugin 2.0.22`). No high direct dependency after swapping the `proxy-agent` umbrella for explicit agents.
