# opencode-fetch-writer

[![CI](https://github.com/tonydeng/opencode-fetch-writer/actions/workflows/ci.yml/badge.svg)](https://github.com/tonydeng/opencode-fetch-writer/actions/workflows/ci.yml)

OpenCode plugin that rewrites the **User-Agent** and adds/removes **HTTP headers** on outgoing provider requests — for any provider, configured purely through plugin options.

**中文文档：[README.zh-CN.md](./README.zh-CN.md)**

## Why

Two common failure modes when pointing OpenCode at a custom or enterprise model gateway:

1. **Your configured `User-Agent` is silently ignored.** Some SDKs merge their own default UA *after* your `provider.options.headers`, so the gateway never sees the UA you configured.
2. **The gateway rejects the request** because of the default client fingerprint (UA or headers added by intermediate layers).

This plugin solves both by wrapping the provider's `options.fetch` through the official `config` hook. `options.fetch` is the final outbound choke point — headers set there cannot be overridden by SDK defaults.

## Install

Pick the syntax matching your OpenCode version — run `opencode --version`:

- **v1 (1.x)** → tuple syntax
- **v2 (2.x)** → object syntax

Edit your OpenCode config file (global `~/.config/opencode/opencode.jsonc`, or per-project `.opencode/opencode.jsonc`). Requires **opencode-fetch-writer 0.1.1+** — 0.1.0 is rejected by OpenCode's plugin loader.

### OpenCode v1 (1.x, tuple syntax)

```jsonc
// opencode.jsonc
{
  "plugin": [
    ["opencode-fetch-writer@0.2.0", {
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
  "plugins": [
    {
      "package": "opencode-fetch-writer@0.2.0",
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

### Local development

```jsonc
{
  "plugin": ["file://./src/index.ts"]
}
```

## Verify installation

Three checks, fastest first:

1. **Activation line** — restart OpenCode and watch the terminal where it starts (stderr):

   ```
   [fetch-writer] patched options.fetch for provider "my-provider"
   ```

2. **Live rewrite log** — start OpenCode with `FETCH_WRITER_DEBUG=1` and send one request through the provider:

   ```
   [fetch-writer] user-agent: opencode/1.18.2 ai-sdk/provider-utils/2.1.0 → my-app/1.0.0
   ```

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
  "plugin": [
    ["opencode-fetch-writer@0.2.0", {
      "providers": {
        "corp-gateway": { "uaTarget": "my-corp-agent/2.1", "headersToStrip": ["x-unwanted-header"] },
        "partner-gw": { "uaTarget": "partner-client/1.0" }
      }
    }]
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
| `providerId` | `string` | — | Provider ID (key in your `provider` map). **Required** — the plugin stays inactive without it. |
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

- **Marker guard**: the plugin marks the wrapped fetch and refuses to wrap twice. If the plugin gets loaded through both auto-discovery and an explicit config entry, your requests are still wrapped exactly once.
- **Activation log**: on startup, the plugin always prints `[fetch-writer] patched options.fetch for provider "…"` to stderr so you can confirm it took effect.
- **Both fetch call shapes** supported: `fetch(url, init)` and `fetch(new Request(...))`.

## Troubleshooting

- **No activation line at all** — the plugin failed to load. Search the OpenCode log for `failed to load plugin` (see [Verify installation](#verify-installation)). Also confirm you're on **0.1.1+**: 0.1.0 ships a non-function export and is rejected by the loader.
- **Plugin not taking effect** — check that `providerId` matches the key in your `provider` map exactly (case-sensitive).
- **UA still overridden** — make sure no other plugin or provider option also sets a custom `fetch` after this one.
- **Double patching** — the marker guard handles it; if you see the activation line twice, you have two *different* fetch wrappers active, not this plugin twice.

## Development

```bash
bun install
bun run typecheck
bun run build
bun test
```

## License

[MIT](./LICENSE)
