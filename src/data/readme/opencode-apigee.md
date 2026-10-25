# opencode-apigee

Use **Gemini on Vertex AI behind an Apigee gateway** as a model provider in
[OpenCode](https://opencode.ai).

Many companies expose Vertex AI through an Apigee gateway that wants an OAuth
token from its own client-credentials endpoint instead of a Google API key or
gcloud login. OpenCode's Google providers can't do that. This plugin does: it
gets the token with your client id and secret, keeps it fresh, and sends every
request to the gateway with it. Everything else is OpenCode's standard Gemini
support.

## Setup

**1. Add the plugin** to `~/.config/opencode/opencode.json` (or a project's
`opencode.json`), with your gateway's details:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    ["opencode-apigee", {
      "gateway": "my-gw.example.com",
      "project": "my-gcp-project",
      "location": "us-central1",
      "tokenUrl": "https://auth.example.com/oauth/token",
      "clientId": "my-client-id",
      "models": ["gemini-3.8-flash", "gemini-3.1-pro"]
    }]
  ]
}
```

**2. Store the client secret** in OpenCode's credential store:

```bash
opencode auth login
```

Pick **Gemini via Apigee** from the list (type "apigee" to filter) and paste
the client secret where it asks for an API key.

(or set `APIGEE_CLIENT_SECRET` in the environment).

**3. Pick a model**: `/models` in OpenCode → **Gemini via Apigee**, or
`opencode run --model apigee/gemini-3.8-flash "…"`.

### Already using AI Relay?

If you set the gateway up with [AI Relay](https://github.com/Chelayel/ai-relay)
(`airelay gemini setup`), the plugin reads the same values from
`~/.airelay/config.properties` — gateway, project, location, token URL, client
id and secret, and the published models. Then step 1 is just:

```json
{ "plugin": ["opencode-apigee"] }
```

## Options

Each setting comes from, in order: the secret stored with `opencode auth login`
(secret only), the plugin options, an environment variable, then AI Relay's
config.

| Option | Environment | AI Relay key | |
| --- | --- | --- | --- |
| `gateway` | `APIGEE_GATEWAY` | `vertex.endpoint` | Gateway host (`https://` is assumed) or a full URL |
| `project` | `APIGEE_PROJECT` | `vertex.project` | Google Cloud project behind the gateway |
| `location` | `APIGEE_LOCATION` | `vertex.location` | Default `us-central1` |
| `tokenUrl` | `APIGEE_TOKEN_URL` | `apigee.token.url` | OAuth client-credentials endpoint |
| `clientId` | `APIGEE_CLIENT_ID` | `apigee.client.id` | |
| `clientSecret` | `APIGEE_CLIENT_SECRET` | `apigee.client.secret` | Prefer `opencode auth login` over the config file |
| `models` | `APIGEE_MODELS` | `apigee.agents` | Model ids the gateway publishes (array, or comma-separated) |
| `apiVersion` | `APIGEE_API_VERSION` | `vertex.api.version` | Vertex API version in the path, default `v1` (e.g. `v1beta1`) |
| `baseUrl` | `APIGEE_BASE_URL` | `vertex.base.url` | The whole URL up to `/models`, for a gateway that doesn't mount Vertex at the standard path. May use `{project}`, `{location}`, `{version}`; with it, `gateway` isn't needed |
| `providerId` | | | Provider id in OpenCode, default `apigee` |
| `name` | | | Display name, default `Gemini via Apigee` |
| `airelay` | | | `false` to ignore AI Relay's config |

### A gateway with its own path

By default requests go to
`https://<gateway>/<apiVersion>/projects/<project>/locations/<location>/publishers/google/models/<model>:streamGenerateContent`.
A gateway that mounts Vertex under a prefix only needs the prefix in `gateway`
(`"gateway": "https://gw.example.com/genai"`); one on another version sets
`apiVersion`; one with a different shape altogether gives `baseUrl` — everything
before `/models`:

```json
["opencode-apigee", {
  "baseUrl": "https://gw.example.com/ai/{version}/vertex/{project}/{location}",
  "apiVersion": "v1beta1",
  "project": "my-gcp-project",
  "tokenUrl": "https://auth.example.com/oauth/token",
  "clientId": "my-client-id",
  "models": ["gemini-3.8-flash"]
}]
```

A model you describe yourself under `provider.apigee.models` in
`opencode.json` keeps your description; the plugin only adds the rest.

## How it works

- Requests go through OpenCode's own Gemini provider (`@ai-sdk/google`) with
  its base URL set to the gateway's Vertex path,
  `https://<gateway>/v1/projects/<project>/locations/<location>/publishers/google`,
  so each call lands on
  `…/models/<model>:streamGenerateContent` — Vertex's own URL, with the same
  request body.
- The token comes from `POST <tokenUrl>?grant_type=client_credentials` with the
  client id and secret as HTTP Basic auth, and is cached until a minute before
  it expires. Concurrent requests share one token fetch.
- Each request has the provider's API-key header replaced by
  `Authorization: Bearer <token>`. If the gateway answers 401, the token is
  fetched again and the request retried once.

Tested with OpenCode 1.19.4, end to end against a local stand-in for the
gateway and its token endpoint.

## Development

```bash
bun install
bun test
bun run build
```

## License

MIT
