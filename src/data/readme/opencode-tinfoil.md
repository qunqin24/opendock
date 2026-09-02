# opencode-tinfoil

`opencode-tinfoil` adds a Tinfoil-verified provider to
[OpenCode](https://opencode.ai). It injects the verified `fetch` supplied by
Tinfoil's [`SecureClient`](https://www.npmjs.com/package/tinfoil) into
OpenCode's own version-matched OpenAI-compatible provider.

The plugin performs attestation before sending an inference body and uses
Tinfoil's encrypted HTTP body protocol (EHBP) by default. Verification or
transport failure aborts the request; there is no plaintext fallback.

## Configure OpenCode

Add the plugin and at least one model to `opencode.json`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    [
      "opencode-tinfoil@0.1.0",
      {
        "apiKey": "{env:TINFOIL_API_KEY}"
      }
    ]
  ]
}
```

The default provider ID is `tinfoil`, the default API base URL is
`https://inference.tinfoil.sh/v1/`, and the default transport is EHBP. Select a
model from OpenCode's current Tinfoil catalog, such as `tinfoil/glm-5-2`.

OpenCode installs npm plugins automatically. The Tinfoil API key remains an
OpenCode provider credential; it is not passed to the attestation client or
stored by this plugin.

## Reverse proxies

EHBP permits a reverse proxy to authenticate, rate-limit, or relay ciphertext
without receiving the inference body in plaintext. Configure both the API base
URL and the endpoint that relays Tinfoil's attestation bundle:

```jsonc
{
  "plugin": [
    [
      "opencode-tinfoil@0.1.0",
      {
        "providerID": "private-inference",
        "name": "Private Inference",
        "apiKey": "{env:PRIVATE_INFERENCE_API_KEY}",
        "baseURL": "https://proxy.example/v1/",
        "attestationBundleURL": "https://proxy.example/attestation",
        "transport": "ehbp",
        "models": {
          "your-model-id": { "name": "Your model" }
        }
      }
    ]
  ]
}
```

The proxy must relay a genuine Tinfoil attestation bundle and support EHBP. The
plugin does not make an ordinary OpenAI-compatible proxy confidential by
itself.

## Options

| Option | Required | Default | Meaning |
|---|---:|---|---|
| `apiKey` | yes | | Credential OpenCode sends inside the request headers |
| `models` | for custom provider IDs | OpenCode's Tinfoil catalog | Model definitions keyed by upstream model ID |
| `providerID` | no | `tinfoil` | OpenCode provider ID |
| `name` | no | `Tinfoil` | Display name |
| `baseURL` | no | Tinfoil inference API | API endpoint used by OpenCode and `SecureClient` |
| `attestationBundleURL` | no | Tinfoil ATC | Alternate attestation-bundle endpoint |
| `enclaveURL` | no | bundle-selected enclave | Explicit enclave endpoint |
| `configRepo` | no | Tinfoil router repository | Repository used for code-provenance verification |
| `transport` | no | `ehbp` | `ehbp` or direct-enclave `tls` pinning |
| `userCacheSecret` | no | Tinfoil SDK default | Prompt-cache namespace secret |

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
