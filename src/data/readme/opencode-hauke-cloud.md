# opencode-hauke-cloud

hauke.cloud for [opencode](https://opencode.ai), in one plugin:

- **Sign-in**: an OAuth 2.0 Authorization Code + PKCE browser login against the hauke.cloud
  Keycloak (`id.hauke.cloud`). The access token is refreshed in the background and sent as
  `Authorization: Bearer <token>` on every model request.
- **Models**: the plugin defines the `hauke-cloud` provider (the llama-swap endpoint at
  `llama.llm.hauke.cloud`) and lists its models from the server, for the signed-in account.
- **Memory**: long-term memory through the self-hosted mem0 service, authenticated with the
  same login. Tools to search, add, list and delete memories, plus automatic recall into the
  system prompt and capture of durable facts from what you write.

Everything defaults to hauke.cloud, so this is a complete `opencode.json`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-hauke-cloud"]
}
```

Then run `opencode auth login hauke-cloud` and finish the login in the browser tab that opens.
`opencode auth list` shows the signed-in account. The provider and its models show up once
you're signed in.

## Installation

opencode resolves package names in the plugin list of `opencode.json` by installing them
from the public npm registry itself at startup — there's no `npm install` step for the end
user. (An absolute path to a built checkout's `dist` directory also works, which is handy
for testing a build before publishing: `["/path/to/checkout/dist", { ... }]`.) Pin a version
(`"opencode-hauke-cloud@2.0.0"`) if you don't want opencode picking up a new release
automatically.

This plugin targets the opencode **v2** plugin API (`@opencode/plugin`, opencode 2.x).
opencode v2 refuses to load two plugins with the same id, so list it **once**.

## Releases

Releases are cut by `.github/workflows/release.yml` on every push to `main`, versioned by
[svu](https://github.com/caarlos0/svu) from the [conventional commits](https://www.conventionalcommits.org/)
since the last version tag: `fix:` bumps the patch, `feat:` the minor, `feat!:` or a
`BREAKING CHANGE:` footer the major. When a bump is due, the workflow pushes the tag, stamps
the version into `package.json` for the tarball (the committed version is a placeholder),
stages it on npm and creates a GitHub release. Pushes with only `docs:`, `chore:`, etc.
publish nothing.

The workflow authenticates with npm trusted publishing, so no token is stored in the repo,
and it only ever runs `npm stage publish`: a release sits on the registry unpublished until
a maintainer approves it with 2FA. The run's summary shows the commands:

```sh
npm stage list opencode-hauke-cloud
npm stage approve <stage-id>
```

The trusted publisher is set up on npmjs.com under the package's *Settings → Trusted
publishing* (GitHub Actions, repository `hauke-cloud/opencode-oidc-plugin`, workflow
`release.yml`) with only stage publishing allowed — equivalently
`npm trust github opencode-hauke-cloud --repo hauke-cloud/opencode-oidc-plugin --file release.yml --allow-stage-publish`.

## How it fits together

- On load, the plugin defines the integration and provider named by `provider`
  (`hauke-cloud`), registers an OAuth sign-in method on the integration, and points the
  provider at `baseURL` through `@ai-sdk/openai-compatible`.
- The provider's activation stays automatic: it only shows up as available once you've
  signed in. A `provider.hauke-cloud` block in `opencode.json` is still applied on top of
  what the plugin defines, e.g. for request timeouts:

  ```jsonc
  "provider": {
    "hauke-cloud": { "options": { "timeout": false, "chunkTimeout": 300000 } }
  }
  ```

- Signing in (`opencode auth login hauke-cloud`) drives the browser flow; opencode stores the
  resulting credential itself.
- Whenever opencode resolves a model from that provider, it checks the stored token and asks
  this plugin to refresh it if it expires within the next five minutes, then passes the
  access token to the provider's SDK as its API key. Concurrent refreshes share a single
  `refresh_token` grant, so IdPs that rotate refresh tokens (Keycloak does) don't kill the
  session.

## Models

The plugin lists the provider's models from `<baseURL>/models` using the signed-in account's
token and adds every model the config doesn't already define. Set `"discoverModels": false`
to only use models from the config.

- Names come from the listing's `name` field (llama-swap sends one), falling back to the id.
- The listing carries no limits or modalities, so discovered models get opencode's defaults
  (200K context, 32K output, text in and out, tool calling on). The plugin's `models` option
  corrects them, keyed by model id or by a pattern where `*` matches anything. Patterns apply
  in the order they're written, then the exact id, so the most specific entry wins:

  ```jsonc
  ["opencode-hauke-cloud", {
    "models": {
      "*-vl-*": { "capabilities": { "input": ["text", "image"] } },
      "qwen3.8-27b-q4": { "limit": { "context": 196608, "output": 32768 } }
    }
  }]
  ```

  Each entry can set `name`, `capabilities` (`tools`, `input`, `output`) and `limit`
  (`context`, `output`); anything left out keeps its default.
- A same-named entry under the provider's `models` in `opencode.json` is still applied on top
  by opencode.
- A config entry without a `name` (e.g. one that only sets `limit`) still gets the listed name.
- Models the config defines stay listed even if the server doesn't report them.
- Discovery runs at startup and when you sign in, sign out or switch accounts — not on token
  refreshes. Discovered models belong to the account that listed them, so another account's
  sign-in never shows the previous account's models.
- If a listing fails (server down, 5xx), the last good list is kept and a warning goes to
  stderr of opencode's server process.

## Memory

Memory uses the mem0 service at `memory.baseURL` with the same login's access token; the
server decides whose memories they are from the token, so there's no second login and no API
key. The Keycloak client needs an audience mapper for the mem0 audience (see below).

- **Tools**: `memory_search`, `memory_add` (scope `project` or `global`), `memory_list` and
  `memory_delete` are always available to the model.
- **Recall**: before each model request, the memories most relevant to your latest message
  are added to the system prompt — once per message, so the prompt stays stable across the
  agent's tool rounds.
- **Capture**: each message you write (from `captureMinChars` on, not slash commands) is sent
  to mem0 in the background; mem0's extraction model keeps only durable facts and merges them
  with what it already knows.
- **Projects**: memories are tagged with the repository's `owner/repo` from its `origin`
  remote (or the directory name), so the same repo checked out elsewhere shares them.
- **Local models**: recall and capture call mem0's models, which run in llama-swap in an
  exclusive group. With a local model loaded that isn't in that group, touching them would
  evict it, so both are skipped while the session uses a model from `localProviders` that
  isn't in `sharedModels`. The tools always work — calling one is an explicit choice.
- Not signed in, recall and capture stay silent; the tools answer with a sign-in hint.

`"memory": false` turns all of it off; an object overrides single settings:

```jsonc
"plugin": [
  ["opencode-hauke-cloud", { "memory": { "autoCapture": false, "recallLimit": 3 } }]
]
```

## Identity provider setup

The Keycloak client (`clientId`) needs:

- **Client type**: public (no client secret — the browser-based PKCE flow never holds one).
- **Flow**: standard/authorization code, with **PKCE required, method S256**.
- **Valid redirect URI**: `http://127.0.0.1:51121/callback` (or whatever `callbackPort`/`callbackPath` you configure). This has to match exactly; loopback wildcard ports aren't assumed.
- **Scopes**: `openid profile email offline_access`. `offline_access` is what gets you a `refresh_token` at all — without it the session dies the moment the short-lived access token expires, which for a CLI used a few times a day is every session.
- **Audiences**: the APIs check the token's `aud` claim (e.g. an Envoy Gateway `SecurityPolicy` JWT rule), so add client scopes with **audience mappers** for both llama-swap and mem0 — the authorization request doesn't pass an `audience` parameter, since that's an Auth0-ism, not the Keycloak way of doing it.

## Plugin options

All optional; the tuple form `["opencode-hauke-cloud", { ... }]` passes them.

| Option | Default | Notes |
| --- | --- | --- |
| `provider` | `"hauke-cloud"` | Id of the provider and integration the plugin defines. |
| `name` | `"hauke.cloud"` | Display name of the provider and integration. |
| `baseURL` | `"https://llama.llm.hauke.cloud/v1"` | OpenAI-compatible endpoint of the models. |
| `issuer` | `"https://id.hauke.cloud/realms/cloud"` | OIDC issuer; `<issuer>/.well-known/openid-configuration` must resolve. |
| `clientId` | `"prod-llama-swap-opencode"` | Public client id registered above. |
| `scope` | `"openid profile email offline_access"` | Space-separated. |
| `callbackPort` | `51121` | Loopback port of the browser redirect. Must match the client's registered redirect URI. |
| `callbackPath` | `"/callback"` | Loopback path, same constraint. |
| `loginTimeoutSeconds` | `300` | How long the browser login may take before the attempt is abandoned. |
| `discoverModels` | `true` | List the models `<baseURL>/models` reports for the signed-in account. |
| `models` | `{}` | Capabilities and limits of discovered models, by id or `*` pattern (see [Models](#models)). |
| `memory` | `{}` | `false` turns memory off; otherwise the settings below. |

`memory` settings:

| Option | Default | Notes |
| --- | --- | --- |
| `baseURL` | `"https://mem0.llm.lab.hauke.cloud"` | mem0-server base URL. |
| `agentID` | `"opencode"` | `agent_id` memories from opencode are filed under. |
| `autoRecall` | `true` | Add relevant memories to the system prompt. |
| `autoCapture` | `true` | Send your messages to mem0 for fact extraction. |
| `recallLimit` | `6` | Memories recalled per message. |
| `recallThreshold` | mem0's default | Minimum similarity of a recalled memory. |
| `recallTimeoutMs` | `15000` | Recall is skipped rather than holding up the request longer. |
| `localProviders` | `["ollama", <provider>]` | Providers whose models share llama-swap with mem0's models. |
| `sharedModels` | `["qwen3.8-27b-q4"]` | Local models that run beside mem0's models without being evicted. |
| `captureMinChars` | `20` | Shorter messages aren't captured. |

## Development

```sh
npm install
npm run build       # tsc -> dist/
npm run typecheck   # tsc --noEmit
npm test            # build, then node's built-in test runner
```

No runtime dependencies — `@opencode/plugin` is only used for its TypeScript types and is a
`devDependency`; everything else is Node built-ins (`node:http`, `node:crypto`,
`node:child_process`) and the global `fetch`.

## License

MIT
