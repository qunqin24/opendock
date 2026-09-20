# opencode-oidc-plugin

A generic OAuth 2.0 Authorization Code + PKCE login plugin for [opencode](https://opencode.ai)
custom model providers.

opencode's built-in providers (GitHub Copilot, Codex, Claude Pro/Max, ...) each ship their own
hardcoded OAuth flow. Custom OpenAI-compatible providers don't get one — they only support a
static `apiKey`. This plugin fills that gap for *any* OIDC issuer (Keycloak, Authelia, Auth0,
Zitadel, ...): it opens a browser to your identity provider, runs the PKCE exchange, and injects
a fresh `Authorization: Bearer <token>` on every request opencode makes to that provider,
refreshing it in the background before it expires.

## Installation

opencode resolves plugins named in the `plugin` array of `opencode.json` by fetching them
from the public npm registry itself (via Bun, at startup, cached under
`~/.cache/opencode/node_modules/`) — there's no `npm install` step for the end user, and no
support for git URLs or local paths in that config array.

That means this package has to be published to npm before the config below will resolve:

```sh
npm install
npm run build
npm publish --access public
```

Once `opencode-oidc-plugin` exists on the registry, using it is just the `opencode.json`
below — no separate install command. Bump `version` in `package.json` and re-run
`npm publish` for updates; pin a version in the config (`"opencode-oidc-plugin@0.2.0"`)
if you don't want opencode picking up a new release automatically.

## How it fits together

- opencode calls this plugin once per `[name, options]` entry in your `opencode.json` `plugin` array.
- `options.provider` must exactly match the key of the provider it authenticates in the `provider` block of the same config.
- Signing in (`opencode auth login`, pick the provider) drives the browser flow; afterwards opencode calls this plugin's `loader()` on every request, which refreshes the token when it's close to expiry and sets the header.

## Identity provider setup

Register a client on your OIDC issuer with:

- **Client type**: public (no client secret — the browser-based PKCE flow never holds one).
- **Flow**: standard/authorization code, with **PKCE required, method S256**.
- **Valid redirect URI**: `http://127.0.0.1:51121/callback` (or whatever `callbackPort`/`callbackPath` you configure — see below). This has to match exactly; loopback wildcard ports aren't assumed.
- **Scopes**: `openid profile email offline_access`. `offline_access` is what gets you a `refresh_token` at all — without it the session dies the moment the short-lived access token expires, which for a CLI used a few times a day is every session.
- If the API behind the provider checks the token's `aud` claim (e.g. an Envoy Gateway `SecurityPolicy` JWT rule), add a client scope with an **audience mapper** for that value — the authorization request in this plugin doesn't pass an `audience` parameter, since that's an Auth0-ism, not part of the OIDC/Keycloak way of doing it.

## opencode.json

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    ["opencode-oidc-plugin", {
      "provider": "llama-swap",
      "issuer": "https://id.hauke.cloud/realms/cloud",
      "clientId": "prod-llama-swap-opencode"
    }]
  ],
  "provider": {
    "llama-swap": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "Llama-swap (self-hosted)",
      "options": {
        "baseURL": "https://llama.llm.hauke.cloud/v1"
      },
      "models": {
        "your-model-id": { "name": "Your Model" }
      }
    }
  }
}
```

Run `opencode auth login`, pick `llama-swap`, and finish the login in the browser tab that opens.

## Plugin options

| Option | Required | Default | Notes |
| --- | --- | --- | --- |
| `provider` | yes | — | Must equal the provider's key in `opencode.json`. |
| `issuer` | yes | — | OIDC issuer base URL; `<issuer>/.well-known/openid-configuration` must resolve. |
| `clientId` | yes | — | Public client id registered above. |
| `scope` | no | `"openid profile email offline_access"` | Space-separated. Drop `offline_access` only if you're fine re-authenticating whenever the access token expires. |
| `callbackPort` | no | `51121` | Loopback port opencode's browser redirect lands on. Must match the client's registered redirect URI. |
| `callbackPath` | no | `"/callback"` | Loopback path, same constraint. |
| `refreshSkewSeconds` | no | `30` | How long before actual expiry `loader()` proactively refreshes. |

## Development

```sh
npm install
npm run build       # tsc -> dist/
npm run typecheck   # tsc --noEmit
npm test            # build, then node's built-in test runner
```

No runtime dependencies — `@opencode-ai/plugin` is only used for its TypeScript types and is a
`devDependency`; everything else is Node built-ins (`node:http`, `node:crypto`) and the global
`fetch`.

## License

MIT
