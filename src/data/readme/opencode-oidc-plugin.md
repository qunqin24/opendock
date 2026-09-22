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

opencode resolves package names in the plugin list of `opencode.json` by installing them
from the public npm registry itself at startup — there's no `npm install` step for the end
user. (An absolute path to a built checkout's `dist` directory also works, which is handy
for testing a build before publishing: `["/path/to/opencode-oidc-plugin/dist", { ... }]`.)

That means this package has to be published to npm before the config below will resolve.
Releases are cut by `.github/workflows/release.yml` on every push to `main`, versioned by
[svu](https://github.com/caarlos0/svu) from the [conventional commits](https://www.conventionalcommits.org/)
since the last `v*` tag: `fix:` bumps the patch, `feat:` the minor, `feat!:` or a
`BREAKING CHANGE:` footer the major. When a bump is due, the workflow pushes the tag, stamps
the version into `package.json` for the tarball (the committed version is a placeholder),
stages it on npm and creates a GitHub release. Pushes with only `docs:`, `chore:`, etc.
publish nothing.

The workflow authenticates with npm trusted publishing, so no token is stored in the repo,
and it only ever runs `npm stage publish`: a release sits on the registry unpublished until
a maintainer approves it with 2FA. The run's summary shows the commands:

```sh
npm stage list opencode-oidc-plugin
npm stage approve <stage-id>
```

The trusted publisher is set up on npmjs.com under the package's *Settings → Trusted
publishing* (GitHub Actions, repository `hauke-cloud/opencode-oidc-plugin`, workflow
`release.yml`) with only stage publishing allowed — equivalently
`npm trust github opencode-oidc-plugin --repo hauke-cloud/opencode-oidc-plugin --file release.yml --allow-stage-publish`.

Once `opencode-oidc-plugin` exists on the registry, using it is just the `opencode.json`
below — no separate install command. Pin a version in the config (`"opencode-oidc-plugin@1.0.0"`)
if you don't want opencode picking up a new release automatically.

## How it fits together

This plugin targets the opencode **v2** plugin API (`@opencode/plugin`, opencode 2.x). For
opencode 1.x, use `opencode-oidc-plugin@0.1`.

- On load, the plugin registers an OAuth sign-in method on the integration named by
  `options.provider`. opencode links a provider to the integration with the same id, so
  `provider` must exactly match the key of the provider it authenticates in the `provider`
  block of the same config.
- Once registered, that provider only shows up as available after you've signed in.
- Signing in (`opencode auth login llama-swap`) drives the browser flow; opencode stores the
  resulting credential itself.
- Whenever opencode resolves a model from that provider, it checks the stored token and asks
  this plugin to refresh it if it expires within the next five minutes, then passes the
  access token to the provider's SDK as its API key — `@ai-sdk/openai-compatible` sends that
  as `Authorization: Bearer <token>`. Concurrent refreshes share a single `refresh_token`
  grant, so IdPs that rotate refresh tokens (Keycloak does) don't kill the session.
- opencode v2 refuses to load two plugins with the same id, so list this package **once**.
  To authenticate several providers, pass them under a `providers` array (see below).

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

Run `opencode auth login llama-swap` and finish the login in the browser tab that opens.
`opencode auth list` shows the signed-in account.

The `[name, options]` tuple form above is opencode 1.x syntax that opencode 2.x still accepts
and migrates. The native 2.x form is:

```jsonc
{
  "plugins": [
    {
      "package": "opencode-oidc-plugin",
      "options": { "provider": "llama-swap", "issuer": "https://id.hauke.cloud/realms/cloud", "clientId": "prod-llama-swap-opencode" }
    }
  ]
}
```

### Several providers

```jsonc
["opencode-oidc-plugin", {
  "providers": [
    { "provider": "llama-swap", "issuer": "https://id.hauke.cloud/realms/cloud", "clientId": "prod-llama-swap-opencode" },
    { "provider": "other", "issuer": "https://auth.example.com", "clientId": "opencode", "callbackPort": 51122 }
  ]
}]
```

Each entry takes the options below.

### Model discovery

With `"discoverModels": true`, the plugin lists the provider's models from
`<baseURL>/models` using the signed-in account's token and adds every model the config
doesn't already define — so the `models` block can shrink to just the entries you want to
adjust, or go away entirely:

```jsonc
"plugin": [
  ["opencode-oidc-plugin", {
    "provider": "llama-swap",
    "issuer": "https://id.hauke.cloud/realms/cloud",
    "clientId": "prod-llama-swap-opencode",
    "discoverModels": true
  }]
],
"provider": {
  "llama-swap": {
    "npm": "@ai-sdk/openai-compatible",
    "options": { "baseURL": "https://llama.llm.hauke.cloud/v1" },
    "models": {
      // Only what the listing can't tell opencode.
      "qwen3.8-27b-q4": { "limit": { "context": 196608, "output": 32768 } }
    }
  }
}
```

- Names come from the listing's `name` field (llama-swap sends one), falling back to the id.
- The listing carries no limits or modalities, so discovered models get opencode's defaults
  (200K context, 32K output, text in and out, tool calling on). A same-named entry under the
  provider's `models` is applied on top, which is how to correct limits or enable image input.
- A config entry without a `name` (e.g. one that only sets `limit`) still gets the listed name.
- Models the config defines stay listed even if the server doesn't report them.
- Discovery runs at startup and when you sign in, sign out or switch accounts — not on token
  refreshes. Discovered models belong to the account that listed them, so another account's
  sign-in never shows the previous account's models.
- If a listing fails (server down, 5xx), the last good list is kept and a warning goes to
  stderr of opencode's server process.

## Plugin options

| Option | Required | Default | Notes |
| --- | --- | --- | --- |
| `provider` | yes | — | Must equal the provider's key in `opencode.json`. |
| `issuer` | yes | — | OIDC issuer base URL; `<issuer>/.well-known/openid-configuration` must resolve. |
| `clientId` | yes | — | Public client id registered above. |
| `scope` | no | `"openid profile email offline_access"` | Space-separated. Drop `offline_access` only if you're fine re-authenticating whenever the access token expires. |
| `callbackPort` | no | `51121` | Loopback port opencode's browser redirect lands on. Must match the client's registered redirect URI. |
| `callbackPath` | no | `"/callback"` | Loopback path, same constraint. |
| `loginTimeoutSeconds` | no | `300` | How long the browser login may take before the attempt is abandoned. |
| `discoverModels` | no | `false` | Add the models `<baseURL>/models` lists for the signed-in account (see above). |

## Development

```sh
npm install
npm run build       # tsc -> dist/
npm run typecheck   # tsc --noEmit
npm test            # build, then node's built-in test runner
```

No runtime dependencies — `@opencode/plugin` is only used for its TypeScript types and is a
`devDependency`; everything else is Node built-ins (`node:http`, `node:crypto`) and the global
`fetch`.

## License

MIT
