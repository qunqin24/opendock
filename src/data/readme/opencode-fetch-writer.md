# opencode-fetch-writer

[![CI](https://github.com/tonydeng/opencode-fetch-writer/actions/workflows/ci.yml/badge.svg)](https://github.com/tonydeng/opencode-fetch-writer/actions/workflows/ci.yml)

OpenCode plugin that rewrites the **User-Agent** and adds/removes **HTTP headers** on outgoing provider requests — for any provider, configured purely through plugin options.

**中文文档：[README.zh-CN.md](./README.zh-CN.md)**

## Why

Two common failure modes when pointing OpenCode at a custom or enterprise model gateway:

1. **Your configured `User-Agent` is silently ignored.** Some SDKs merge their own default UA *after* your `provider.options.headers`, so the gateway never sees the UA you configured.
2. **The gateway rejects the request** because of the default client fingerprint (UA or headers added by intermediate layers).

This plugin hooks the last point where request headers are still editable, so nothing downstream can overwrite them. Which hook that is depends on your OpenCode generation:

| OpenCode | Hook | Mechanism |
|---|---|---|
| 1.x (1.18.29+) | `config` | Wraps the provider's `options.fetch` |
| 2.x | `ctx.session.hook("http.request")` | Mutates the assembled `Request` just before dispatch |

One published package serves both. The default export carries a V2 `id` + `setup()` and a V1 `server()`; each host reads only its own half.

## Install

Pick the syntax matching your OpenCode version — run `opencode --version`:

- **v1 (1.x)** → tuple syntax, under `plugin`
- **v2 (2.x)** → object syntax, under `plugins`

Edit your OpenCode config file (global `~/.config/opencode/opencode.jsonc`, or per-project `.opencode/opencode.jsonc`). Which package version supports which OpenCode generation:

| opencode-fetch-writer | OpenCode 1.x | OpenCode 2.x |
|---|---|---|
| 0.1.0 | ❌ (rejected by the plugin loader) | ❌ |
| 0.1.1 – 0.2.x | ✅ | ❌ |
| 0.3.0+ | ✅ (1.18.29+) | ✅ |

From **0.3.0** the same package serves both generations; on OpenCode 1 it additionally requires **1.18.29+** (the release that accepts the object entrypoint).

### OpenCode v1 (1.x, tuple syntax)

```jsonc
// opencode.jsonc
{
  "plugin": [
    ["opencode-fetch-writer@0.3.0", {
      "providerId": "my-provider",
      "uaTarget": "my-app/1.0.0",
      "headersToStrip": ["x-unwanted-header"],
      "headersToInject": {
        "X-Client-Name": "my-app"
      }
    }]
  ]
}
```

> `providerId` is the key of your provider entry inside the same config file's `provider` map.
> **Restart OpenCode** to apply. The first start downloads the package from npm; later starts use the local cache.

### OpenCode v2 (object syntax)

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "opencode-fetch-writer@0.3.0",
      "options": {
        "providerId": "my-provider",
        "uaTarget": "my-app/1.0.0",
        "headersToStrip": ["x-unwanted-header"],
        "headersToInject": {
          "X-Client-Name": "my-app"
        }
      }
    }
  ]
}
```

The option names are identical across both versions; only the config syntax differs.

### Disabling in v2

V2 identifies plugins by ID, so the entry can be turned off without removing it:

```jsonc
{
  "plugins": ["*", "-fetch-writer"]
}
```

### Local development

In v2, a path entry under `plugins` must be a **directory**. To load a single
file, drop it in `.opencode/plugins/`, which is auto-discovered:

```jsonc
// v2 — .opencode/plugins/fetch-writer.ts
export { default } from "../../src/index.js"
```

```jsonc
// v2 — pointing at a local package directory
{ "plugins": [{ "package": "./plugins/fetch-writer", "options": { "providerId": "acme", "uaTarget": "my-app/1.0" } }] }
```

```jsonc
// v1 — a file path is fine
{ "plugin": ["file://./src/index.ts"] }
```

## Verify installation

Three checks, fastest first:

1. **Activation line** — restart OpenCode and watch the terminal where it starts (stderr). The wording tells you which generation loaded:

   ```
   # OpenCode 1
   [fetch-writer] patched options.fetch for provider "my-provider"

   # OpenCode 2
   [fetch-writer] registered http.request hook for provider "my-provider"
   ```

2. **Live rewrite log** — start OpenCode with `FETCH_WRITER_DEBUG=1` and send one request through the provider:

   ```
   [fetch-writer] user-agent: opencode/1.18.2 ai-sdk/provider-utils/2.1.0 → my-app/1.0.0
   ```

   > On v2 the plugin runs inside the OpenCode server, so its stderr only reaches your terminal with `opencode run --standalone --print-logs` (or `opencode serve`). With the default background service, read the log file instead.

3. **Load-failure check** — if neither appears, the plugin may have failed to load (this fails silently). Search the OpenCode log:

   ```bash
   # Linux / macOS
   grep "failed to load plugin" ~/.local/share/opencode/log/opencode.log

   # Windows (PowerShell)
   Select-String -Path "$env:USERPROFILE\.local\share\opencode\log\opencode.log" -Pattern "failed to load plugin"
   ```

   No output = the plugin loaded fine.

## Multiple providers

Since v0.2.0 one plugin entry can manage several providers through the `providers` map (mutually exclusive with the legacy top-level `providerId`):

```jsonc
{
  "plugins": [
    {
      "package": "opencode-fetch-writer@0.3.0",
      "options": {
        "providers": {
          "corp-gateway": { "uaTarget": "my-corp-agent/2.1", "headersToStrip": ["x-unwanted-header"] },
          "partner-gw": { "uaTarget": "partner-client/1.0" }
        }
      }
    }
  ]
}
```

Each provider gets its own rule. `FETCH_WRITER_UA` still applies to providers without an explicit `uaTarget`. Providers missing from your config are skipped (logged in debug mode).

> On versions before 0.2.0 the same effect is achievable by listing the plugin twice with different options — the `providers` map just keeps it to one entry.

## Options

| Option | Type | Default | Description |
|---|---|---|---|
| `providerId` | `string` | — | Legacy single-provider mode: provider ID (key in your `provider` map). Required unless `providers` is set. |
| `providers` | `Record<string, ProviderRule>` | — | Multi-provider mode: map of provider ID → rule (`uaTarget` / `headersToStrip` / `headersToInject`). Mutually exclusive with `providerId`. |
| `uaTarget` | `string` | — | Target User-Agent. Omit to leave the UA unchanged. |
| `headersToStrip` | `string[]` | `[]` | Header names to delete from outgoing requests. |
| `headersToInject` | `Record<string, string>` | `{}` | Headers to inject when missing. **Never overwrites** existing values. |
| `debug` | `boolean` | `false` | Enable debug logging to stderr. |

## Environment variables

| Variable | Description | Default |
|---|---|---|
| `FETCH_WRITER_UA` | Overrides the `uaTarget` option | — |
| `FETCH_WRITER_DEBUG` | Set to `1` to enable debug logging | `0` |

## Behavior notes

- **Marker guard (v1)**: the plugin marks the wrapped fetch and refuses to wrap twice. If the plugin gets loaded through both auto-discovery and an explicit config entry, your requests are still wrapped exactly once. V2 needs no equivalent — hook registrations are scoped and disposed with the plugin.
- **Activation log**: on startup the plugin always prints one line per provider to stderr, so you can confirm it took effect. The wording identifies the generation (see [Verify installation](#verify-installation)).
- **Both fetch call shapes** supported on v1: `fetch(url, init)` and `fetch(new Request(...))`. V2 always receives a `Request`.
- **WebSocket transport (v2)**: registering an `http.request` hook keeps a provider on the HTTP transport, since OpenCode holds websocket routes back to HTTP while a plugin is observing requests. Use `experimental.ws.handshake` if you specifically need to rewrite websocket handshakes instead.
- **Provider IDs are canonical (v2)**: use the V2 provider ID, not a retired V1 one. `azure-cognitive-services` becomes `azure`, and `google-vertex-anthropic` becomes `google-vertex`.

## Troubleshooting

- **No activation line at all** — the plugin failed to load. Search the OpenCode log for `failed to load plugin` (see [Verify installation](#verify-installation)). Also confirm you're on **0.1.1+**: 0.1.0 ships a non-function export and is rejected by the loader.
- **Plugin not taking effect on v1** — check that `providerId` matches the key in your `provider` map exactly (case-sensitive). On v2 the same applies to the key in your `providers` map.
- **UA still overridden** — on v1, make sure no other plugin or provider option also sets a custom `fetch` after this one. On v2 the rewrite happens after every provider package and built-in plugin has run, so this should not occur.
- **Double patching (v1)** — the marker guard handles it; if you see the activation line twice, you have two *different* fetch wrappers active, not this plugin twice.

## Development

```bash
bun install
bun run verify     # typecheck + build + tests + packed-artifact loader check
```

Individually:

```bash
bun run typecheck
bun run build
bun test
bun run verify:package
```

`verify:package` runs the two real loader contracts against `dist/`, which unit tests (importing from `src/`) cannot catch.

## License

[MIT](./LICENSE)
