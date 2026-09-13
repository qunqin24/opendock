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

### OpenCode v1 (1.x, tuple syntax)

```jsonc
// opencode.jsonc
{
  "plugin": [
    ["opencode-fetch-writer@0.1.0", {
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

### OpenCode v2 (object syntax)

```jsonc
{
  "plugins": [
    {
      "package": "opencode-fetch-writer@0.1.0",
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

## Options

| Option | Type | Default | Description |
|---|---|---|---|
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
