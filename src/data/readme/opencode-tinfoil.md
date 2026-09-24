# opencode-tinfoil

`opencode-tinfoil` adds a Tinfoil-verified provider to
[OpenCode](https://opencode.ai). The same package supports OpenCode V1
(1.18.29 or later) and V2. It sends inference requests through Tinfoil's
[`SecureClient`](https://www.npmjs.com/package/tinfoil), using each OpenCode
version's own OpenAI-compatible protocol implementation.

The plugin performs attestation before sending an inference body and uses
Tinfoil's encrypted HTTP body protocol (EHBP) by default. Verification or
transport failure aborts the request; there is no plaintext fallback.

## OpenCode V2

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-tinfoil@0.3.0"],
  "providers": {
    "tinfoil": {
      "package": "opencode-tinfoil/provider",
      "settings": {
        "baseURL": "https://inference.tinfoil.sh/v1/",
        "tinfoil": { "baseURL": "https://inference.tinfoil.sh/v1/", "transport": "ehbp" }
      }
    }
  }
}
```

The `tinfoil` provider can retain V2's built-in model catalog and account
connection. Use `/connect` to connect Tinfoil, then `/models` to select a
model. The explicit `package` selects the verified provider runtime: the
ordinary HTTP handler is never used for inference, even when attestation
fails. The plugin also upgrades models marked for Tinfoil in V1-style
configuration. Models marked on an unsupported provider package are removed
rather than left on a plaintext route.

To upgrade an additional OpenAI-compatible provider, mark its settings and
provide its own endpoint and models. Use `defaultProvider: false` if you only
want marked providers:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [{ "package": "opencode-tinfoil@0.3.0", "options": { "defaultProvider": false } }],
  "providers": {
    "private-inference": {
      "package": "opencode-tinfoil/provider",
      "settings": {
        "baseURL": "https://proxy.example/v1/",
        "apiKey": "{env:PRIVATE_INFERENCE_KEY}",
        "tinfoil": {
          "baseURL": "https://proxy.example/v1/",
          "attestationBundleURL": "https://proxy.example/attestation",
          "transport": "ehbp"
        }
      },
      "models": { "your-model-id": { "name": "Your model" } }
    }
  }
}
```

The `tinfoil` settings object accepts the same `baseURL` as the provider
settings (optional when the provider already sets it), plus
`attestationBundleURL`, `enclaveURL`, `configRepo`,
`transport` (`ehbp` by default), and `userCacheSecret`. The provider runtime
checks that the endpoints match when both are given. The `apiKey` remains
managed by OpenCode. Explicit `package` works without relying on plugin
transform order. For migrated V1 config, the plugin instead upgrades each
marked model's package after providers are registered, allowing the same
provider definition on V1 (1.18.29+) and V2.

V2 also normalizes a V1 `plugin` entry (including its package-and-options
tuple) and V1 `provider` definitions, so a single remote configuration can
serve both versions. For hand-authored V2-only configuration, prefer the
`plugins` and `providers` forms shown above. Confirm the plugin is active and
each marked model selects `opencode-tinfoil/provider`: without an active
plugin, a V1-style marked provider may remain on the ordinary HTTP runtime.
A service that uses this transport should reject plaintext inference
independently of the client plugin.

The published package installs its V2 provider-runtime dependencies alongside
the plugin. You do not need to install `@opencode/ai` or `effect` separately.

## OpenCode V1 (1.18.29+)

Add the plugin to create the canonical Tinfoil provider:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-tinfoil@0.3.0"]
}
```

The default provider ID is `tinfoil`, the default API base URL is
`https://inference.tinfoil.sh/v1/`, and the default transport is EHBP. Select a
model from OpenCode's current Tinfoil catalog, such as `tinfoil/glm-5-2`.

Store the API key in OpenCode's credential store:

```bash
opencode auth login --provider tinfoil
```

The equivalent TUI flow is `/connect` followed by **Tinfoil**. OpenCode stores
the key under the provider ID in `~/.local/share/opencode/auth.json`; the plugin
does not read or write that file. OpenCode installs npm plugins automatically.
The key is sent in request headers by the OpenAI-compatible provider and is not
passed to the attestation client or stored by this plugin.

### Non-default providers

A service or another config layer can own its provider definition while this
plugin supplies only the verified transport. Put a `tinfoil` marker inside the
provider's `options`. The same bare plugin entry creates the default `tinfoil`
provider and upgrades every marked provider:

```jsonc
{
  "plugin": ["opencode-tinfoil@0.3.0"],
  "provider": {
    "private-inference": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "Private Inference",
      "options": {
        "baseURL": "https://proxy.example/v1/",
        "tinfoil": {
          "attestationBundleURL": "https://proxy.example/attestation",
          "transport": "ehbp"
        }
      },
      "models": {
        "your-model-id": { "name": "Your model" }
      }
    }
  }
}
```

The plugin consumes `options.tinfoil` at startup and replaces it with a verified
`fetch`; the marker is not passed to the AI SDK. This form composes across
remote, global, and project config. OpenCode may deduplicate the package, but
the one surviving plugin invocation still upgrades every marked provider in
the merged provider map.

A service that supplies only marked providers can suppress the default direct
provider with `["opencode-tinfoil@0.3.0", { "defaultProvider": false }]`. This
loader control is intended for generated service configuration; ordinary users
should need only the bare plugin entry and provider definitions.

## Reverse proxies

EHBP permits a reverse proxy to authenticate, rate-limit, or relay ciphertext
without receiving the inference body in plaintext. The provider-owned form
above lets the proxy's configuration define both its API base URL and the
endpoint that relays Tinfoil's attestation bundle.

The proxy must relay a genuine Tinfoil attestation bundle and support EHBP. The
plugin does not make an ordinary OpenAI-compatible proxy confidential by
itself.

## Options

| Option | Required | Default | Meaning |
|---|---:|---|---|
| `defaultProvider` | no | `true` | Whether the plugin creates the canonical `tinfoil` provider |
| `apiKey` | no | OpenCode auth store | Explicit credential override for noninteractive deployments |
| `models` | for custom provider IDs | OpenCode's Tinfoil catalog | Model definitions keyed by upstream model ID |
| `providerID` | no | `tinfoil` | OpenCode provider ID |
| `name` | no | `Tinfoil` | Display name |
| `baseURL` | no | Tinfoil inference API | API endpoint used by OpenCode and `SecureClient` |
| `attestationBundleURL` | no | Tinfoil ATC | Alternate attestation-bundle endpoint |
| `enclaveURL` | no | bundle-selected enclave | Explicit enclave endpoint |
| `configRepo` | no | Tinfoil router repository | Repository used for code-provenance verification |
| `transport` | no | `ehbp` | `ehbp` or direct-enclave `tls` pinning |
| `userCacheSecret` | no | Tinfoil SDK default | Prompt-cache namespace secret |

Provider-owned definitions put `attestationBundleURL`, `enclaveURL`,
`configRepo`, `transport`, and `userCacheSecret` inside `options.tinfoil`.
Their `baseURL` and optional `apiKey` remain sibling provider options so OpenCode
can supply credentials from its auth store when `apiKey` is absent.

See the [Tinfoil JavaScript SDK](https://docs.tinfoil.sh/sdk/javascript-sdk)
for the security meaning and constraints of the transport options.

## Development

```bash
npm install
npm run check
npm pack --dry-run
```

The runtime dependency on `tinfoil` is pinned exactly. Update it deliberately
after reviewing verifier and transport changes.

## License

MIT
