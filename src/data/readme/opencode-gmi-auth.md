# opencode-gmi-auth

GMI Cloud provider plugin for [OpenCode](https://opencode.ai) and
[magpie](https://usemagpie.ai), written in OpenCode's v1 plugin shape.

Registers provider `gmicloud` against the OpenAI-compatible
[GMI Cloud API](https://docs.gmicloud.ai/inference-engine/api-reference/llm-api-reference)
(`https://api.gmi-serving.com/v1`), with an API key sign-in and a live
per-account model catalog from `GET /v1/models`.

## Install

In magpie (a folder is loaded where it is; nothing is installed):

```bash
magpie plugin add ./opencode-gmi-auth
```

Once published to npm (or from git):

```bash
magpie plugin add opencode-gmi-auth
```

Or straight from this repository:

```bash
magpie plugin add github:Xuanwo/opencode-gmi-auth
```

In OpenCode, put the package in `plugin` in `opencode.json`, or drop the
folder under `~/.config/opencode/plugins/`.

## Sign in

Create an API key in the
[GMI Cloud console](https://console.gmicloud.ai/user-setting/api-keys), then:

```bash
magpie plugin login gmicloud
```

The key is saved as-is; the first request validates it. A refused key
(GMI answers `401 Invalid API key`) marks the account so magpie asks for a
new sign-in. For multi-organization access, the API accepts an
`X-Organization-ID` header; the loader forwards the organization saved
with the sign-in.

## Models

- The provider id is `gmicloud`, which [models.dev](https://models.dev)
  already lists, so OpenCode and magpie start from its entry.
- After sign-in the plugin fetches the account's own catalog and replaces
  the list. Chat-completion models keep their GMI names (`id`), context
  length and per-token pricing (converted to per-million USD, as OpenCode
  and magpie track costs).
- Non-chat entries (embeddings, image generation, speech) are filtered out.
- Reasoning and multimodal flags are inferred from model ids and names when
  the catalog does not say, and can be overridden in `models.json` /
  `plugins.json` model entries.

## Development

```bash
npm test
```

`npm test` runs unit tests for catalog mapping and plugin hooks
(`node --test`, no dependencies). To try it against a real magpie without
touching your configuration:

```bash
sb=$(mktemp -d)
m() { env HOME=$sb XDG_CONFIG_HOME=$sb/.config XDG_CACHE_HOME=$sb/.cache \
  MAGPIE_ADDR=127.0.0.1:3499 /path/to/magpie "$@"; }
m plugin add ./opencode-gmi-auth
m plugin --json
```

## Security

Plugins run with full local permissions. Review this repository before
installing it on machines you care about.

## License

MIT
