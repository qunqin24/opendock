# opencode-jev-router

[![CI](https://github.com/robertn702/opencode-jev-router/actions/workflows/ci.yml/badge.svg)](https://github.com/robertn702/opencode-jev-router/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/%40robertn702%2Fopencode-jev-router)](https://www.npmjs.com/package/@robertn702/opencode-jev-router)
[![MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**Keep the quality. Spend less reasoning.** An [OpenCode](https://opencode.ai)
plugin that asks [Jev](https://typesafe.ai/) how much reasoning each step
needs, so one model handles quick edits and hard debugging without you
switching effort levels by hand.

![On pytest #5262, Jev used 42% fewer output tokens and 40% less time than fixed high, with both solving 6/6. On a separately selected hard case, Jev solved 5/5 versus 1/5 for fixed medium; that exploratory result does not establish a general reliability benefit.](readme-token-savings.svg)

Across the tested GPT-6 Astra task mix, Jev and fixed `high` effort each solved
**44/44 attempts**, and Jev used **14% fewer output tokens** (including
reasoning) and finished **9% faster** on average. Results on other workloads
may differ. [See the evaluation](eval/results/router-consolidated-2026-09-25.md).

## How it works

For each primary request to a wrapped model, the plugin:

1. Sends a bounded summary of the recent conversation to Jev, which picks a
   reasoning effort (for example `low` for a rename, `high` for a failing test).
2. Adds that choice to the request as an OpenAI
   [`configuration_update`](https://developers.openai.com/api/docs/guides/reasoning#change-reasoning-mid-conversation)
   item, or as an Anthropic effort-only system message; earlier updates stay in
   place so the prompt prefix stays cacheable.
3. Sends the request to your model endpoint and streams the response back
   unchanged.

If Jev is slow or unavailable, the request continues at a fallback effort
(`high` by default).

## Requirements

- **OpenCode V2 2.0.4 or newer** (tested with 2.0.4 and 2.0.18). V1 users can pin
  `@robertn702/opencode-jev-router@0.5` or use the standalone proxy.
- **A Jev key**, from either:
  - [TypeSafe](https://typesafe.ai/) (direct), or
  - [Vercel AI Gateway](https://vercel.com/docs/ai-gateway/sdks-and-apis/typesafe)
    (a Gateway key, used with Vercel's TypeSafe-compatible endpoint).

  Each routed request makes one classification call, billed by that provider.
- **A Responses API-compatible endpoint** that serves GPT-6 Astra, Luna, or Sol
  and accepts `configuration_update` input items, plus its API key. The OpenAI
  API (`https://api.openai.com/v1`) works; so does any gateway that exposes the
  same `POST /v1/responses` interface, including a gateway such as
  [CLIProxyAPI](https://github.com/router-for-me/CLIProxyAPI) that serves a
  ChatGPT subscription (see [Quick start](#quick-start)).
- **For Claude instead:** an Anthropic Messages API endpoint serving one of the
  five models below, with access to the mid-conversation output-config beta.

Node.js 24.x is needed only for the [standalone proxy](#standalone-proxy-optional)
and for development.

## Quick start

**1. Export your keys** in the shell that launches OpenCode (or load them from
a secret manager):

```bash
export JEV_API_KEY=...   # TypeSafe key or Vercel AI Gateway key
export OPENAI_API_KEY=...       # key for your Responses API endpoint
```

**2. Add the plugin** to your OpenCode config: `~/.config/opencode/opencode.json`
for all projects, or `opencode.json` in a project root:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [{ "package": "@robertn702/opencode-jev-router", "options": {
    "jevApiKey": "{env:JEV_API_KEY}",
    "jevBaseUrl": "https://ai-gateway.vercel.sh/typesafe",
    "wrap": { "openai": ["openai/gpt-6-astra"] },
    "decisionsLogPath": "/tmp/jev-decisions.jsonl"
  }}],
  "model": "jev-router/gpt-6-astra"
}
```

- **Using a direct TypeSafe key?** Delete the `jevBaseUrl` line. A key only
  works with its own endpoint.
- **Source auth:** `OPENAI_API_KEY` or an API key saved with `opencode auth login`
  supplies the wrapped OpenAI model. If your OpenCode catalog lacks the model
  (for example, offline or with 2.0.4's built-ins), declare it under
  `providers.openai.models` without replacing the built-in provider package.
- **Using another gateway?** Define it as an OpenCode provider and wrap its
  model. For example, alongside the plugin config:

  ```jsonc
  "providers": {
    "mygateway": {
      "package": "@opencode/ai/providers/openai/responses",
      "settings": { "baseURL": "https://gateway.example/v1", "apiKey": "{env:GATEWAY_KEY}" },
      "models": { "gpt-6-astra": { "name": "Gateway Astra" } }
    }
  }
  // Set "wrap": { "openai": ["mygateway/gpt-6-astra"] }.
  ```
  Plain `http://` is accepted only for loopback endpoints.
- **Using a ChatGPT subscription?** Run
  [CLIProxyAPI](https://github.com/router-for-me/CLIProxyAPI) with your Codex
  login and set one of its client API keys. Define it as a gateway provider as
  above, with CLIProxyAPI's `/v1` endpoint as `baseURL` and that client key as
  `apiKey`, then wrap its GPT-6 model. Usage counts against your subscription;
  Jev calls are billed separately.
- `{env:NAME}` reads an environment variable; `{file:~/path}` reads a file
  instead, if you prefer to keep keys on disk.

OpenCode installs the npm plugin on startup; there is nothing else to install
or run. To pin a version, use `@robertn702/opencode-jev-router@<version>`.

**3. Restart OpenCode** and confirm the model shows as `jev-router/gpt-6-astra`
(or pick one with `/models`).

**4. Check that routing works.** Send any prompt, then:

```bash
tail -n 1 /tmp/jev-decisions.jsonl
```

You should see a `JevDecision` event with `"effort"` set (for example
`"low"`) and `"fallback": null`. A non-null `fallback` means Jev wasn't
reached; see [Troubleshooting](#troubleshooting). Remove `decisionsLogPath`
once you're satisfied, or keep it for metrics.

A copy of this config is in [`examples/opencode.jsonc`](examples/opencode.jsonc).

## Models

The plugin registers `jev-router/<profile>` only for profiles listed in `wrap`.
Use `"anthropic": ["anthropic/claude-opus-5-5"]` for Claude. The source
model must use `@opencode/ai/providers/anthropic`; OpenAI sources may use
`@opencode/ai/providers/openai` (the built-in) or
`@opencode/ai/providers/openai/responses`. Primary requests must use the
corresponding `/messages` or `/responses` route; other paths fail locally.
Source models
remain untouched; aliases inherit source route, settings, headers, limits and
cost, but have no manual effort variants.

| OpenCode model | Efforts Jev can choose |
| --- | --- |
| `jev-router/gpt-6-astra` | `low`, `medium`, `high`, `xhigh`, `max` |
| `jev-router/gpt-6-luna` | `none`, `low`, `medium`, `high`, `xhigh`, `max` |
| `jev-router/gpt-6-sol` | `none`, `low`, `medium`, `high`, `xhigh`, `max` |
| `jev-router/gpt-6.1-sol` | `low`, `medium`, `high`, `xhigh`, `max` |
| `jev-router/claude-fable-5-1` | `low`, `medium`, `high`, `xhigh`, `max` |
| `jev-router/claude-mythos-5-1` | `low`, `medium`, `high`, `xhigh`, `max` |
| `jev-router/claude-opus-5-5` | `low`, `medium`, `high`, `xhigh`, `max` |
| `jev-router/claude-opus-5` | `low`, `medium`, `high`, `xhigh`, `max` |
| `jev-router/claude-sonnet-5-5` | `low`, `medium`, `high`, `xhigh`, `max` |

See OpenAI's [Astra](https://developers.openai.com/api/docs/models/gpt-6-astra),
[Luna](https://developers.openai.com/api/docs/models/gpt-6-luna),
[Sol](https://developers.openai.com/api/docs/models/gpt-6-sol), and
[6.1 Sol](https://developers.openai.com/api/docs/models/gpt-6.1-sol) pages to choose
between them. Your endpoint must grant access to the model you select.

For GPT-6, only standard, single-agent mode is supported: pro models, other
`reasoning.mode` values, and `truncation: "auto"` are rejected locally.
OpenCode's own reasoning-effort variants are ignored for this provider, since
Jev picks the effort. The response reports the base effort (`medium`), not
the effort Jev selected; use the decision log to see the selection. Claude
defaults to a fixed top-level effort of `medium` for Opus 5.5 and Sonnet 5.5,
and `high` for the others; per-turn changes use the Anthropic beta header and
an effort-only system message before the newest user message, including tool
results. Thinking is pinned to adaptive (caller `display` is preserved). See
[behavior and unverified limitations](docs/behavior.md#effort-updates-and-cache-lineage).
Anthropic requests do not follow upstream redirects; a 3xx response is returned
to the caller rather than forwarding credentials to a different origin.
Source credentials pass through unchanged. A resolved source `settings.apiKey`
is inherited by the alias without resolving the integration; only when no wire
auth header is present is a stored or environment-integration key
injected as OpenAI `Authorization: Bearer` or Anthropic `x-api-key` before
classification. Built-in ChatGPT and Claude subscription OAuth sources are
unsupported: use an API key, or a key-authenticated gateway such as CLIProxyAPI
that serves a subscription. Auxiliary title, compaction, and generate calls and non-generation
routes bypass Jev but still receive the source key. `jev-router` requires HTTP
transport; do not override `providers["jev-router"].settings.transport` to websocket.

OpenCode 2.0.4 reads a model's top-level transport before the provider setting;
the alias pins both to HTTP. A websocket handshake guard fails closed if a
host nevertheless selects websocket, rather than silently bypassing Jev.

## What is sent where

- **To Jev (TypeSafe or Vercel):** bounded excerpts of recent user and assistant
  text, up to 8 recent tool results (with tool names and error flags), a short
  failure summary, and the model ID. Hosted-tool and computer-use payloads are
  not sent.
- **To your endpoint:** the full OpenCode request, with the effort update added.
- **Stored locally:** nothing by default. With `decisionsLogPath`, metadata
  only (IDs, model, effort, latency, token counts). Prompts, tool output,
  credentials, and raw errors are never logged.

## Configuration

Plugin options go in `options` of a `plugins` entry.

| Option | Default | Purpose |
| --- | --- | --- |
| `jevApiKey` | `JEV_API_KEY` env | Jev classifier key. Required. |
| `jevBaseUrl` | `https://api.typesafe.ai` | Set to `https://ai-gateway.vercel.sh/typesafe` for a Vercel key. No other values are accepted. |
| `wrap` | none | Required nonempty object with `openai` and/or `anthropic` arrays of `provider/model` source refs. |
| `decisionsLogPath` | off | Absolute path for metadata-only `JevDecision` JSONL. |
| `baseEffort` | `medium` | Request-level effort reported by responses. |
| `jevTimeoutMs` | `4000` | Total classification budget, including retries. |
| `maxRetries`* | `1` | Extra attempts after transient Jev errors. |
| `fallbackMode`* | `fixed` | `fixed`, `previous`, or `error` (fail the request). |
| `fallbackEffort`* | `high` | Effort used when classification fails. |
| `maxRequestBytes` | `1048576` | Largest request body. |
| `maxInFlight` | `32` | Concurrent requests. |
| `upstreamHeaderTimeoutMs` | `10000` | Wait for endpoint response headers. |
| `upstreamIdleTimeoutMs` | `60000` | Longest gap between streamed chunks. |

\* Available from 0.3.0. Retry and fallback behavior is
detailed in
[`docs/classification-policy.md`](docs/classification-policy.md).

Setup-shape errors (missing/empty `wrap`, unknown groups, malformed refs and
removed options) appear as `failed to load plugin` in the OpenCode log. Source
registry errors (missing source, unsupported profile/package, duplicate alias)
are collected; any error rejects every alias request with all invalid refs as
`jev-router: ...` in the CLI. Consult the OpenCode log if an invalid alias
instead appears as `Model unavailable`.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `fallback` is `jev_error` with `jev_error_category: "http_auth"` | The Jev key doesn't match the endpoint. Vercel keys need `jevBaseUrl`; TypeSafe keys must omit it. |
| `fallback` is `jev_timeout` | Jev was slow or unreachable; requests still ran at the fallback effort. Raise `jevTimeoutMs` if it happens often. |
| OpenCode log says `failed to load plugin` | Check `wrap` syntax and remove old plugin upstream options. |
| 401/403/404 from the model | The endpoint's response is passed through unchanged. Check the source provider key and model. |
| Local 400 mentioning `reasoning.mode`, `truncation`, or the model | The request uses an unsupported mode or model; see [Models](#models). |
| `alias requires /responses` or `/messages` | The source package and generation route do not match the alias group. |
| V2: `Model unavailable: jev-router/...` | The plugin did not load. Check the `plugins` entry and the OpenCode log for a `jev-router` setup error. |
| `uses OAuth` or `has no API key` | Use an API-key source provider or a key-authenticated gateway such as CLIProxyAPI; built-in subscription OAuth is not supported. |
| Websocket provider error | Remove `providers["jev-router"].settings.transport` override. |
| Config changes have no effect | Restart OpenCode; it loads plugins at startup. |

## Standalone proxy (optional)

The same router can run as a local HTTP proxy for any Responses API client. It
needs Node.js 24.x.

> [!NOTE]
> The `JEV_ROUTER_*` variable names below apply from 0.3.0. Earlier versions
> use unprefixed names; see [`CHANGELOG.md`](CHANGELOG.md).

Create a `.env` in the directory you'll run from (or export the variables):

```dotenv
JEV_API_KEY=your-jev-key
# JEV_BASE_URL=https://ai-gateway.vercel.sh/typesafe   # Vercel keys only
JEV_ROUTER_UPSTREAM_BASE_URL=https://api.openai.com/v1
JEV_ROUTER_UPSTREAM_AUTH=bearer
JEV_ROUTER_UPSTREAM_API_KEY=your-endpoint-key
```

Then start it:

```bash
npx --yes @robertn702/opencode-jev-router
```

It listens on `http://127.0.0.1:4320`. Check it with:

```bash
curl --fail http://127.0.0.1:4320/ready
curl http://127.0.0.1:4320/v1/responses \
  -H 'content-type: application/json' -H 'authorization: Bearer unused' \
  -d '{"model":"gpt-6-astra","input":[{"role":"user","content":"Say hi"}]}'
```

For Anthropic, set `JEV_ROUTER_ANTHROPIC_UPSTREAM_BASE_URL` (for example
`https://api.anthropic.com/v1`) and, with bearer auth,
`JEV_ROUTER_ANTHROPIC_UPSTREAM_API_KEY`. Send Claude requests to
`POST /v1/messages`; without that base URL the route returns 404. The proxy
supplies `anthropic-version` and merges the mid-conversation beta header.
Point your client at `http://127.0.0.1:4320/v1`. Each request prints a metadata
record to stdout; set `JEV_ROUTER_DECISIONS_LOG_PATH` to an absolute path to
also write `JevDecision` JSONL.

**Upstream auth.** With `bearer`, the router replaces the client's credential
with `JEV_ROUTER_UPSTREAM_API_KEY`; the endpoint must be HTTPS or loopback.
With `forward` (the default), it passes the client's `Authorization` header
(and `x-api-key` on Anthropic) through, and only to a loopback endpoint. Bearer
mode sends the configured Anthropic key as `x-api-key` to the Anthropic endpoint.

Run `npx @robertn702/opencode-jev-router --help` for every variable, and see
[`.env.example`](.env.example) for defaults. For health probes, shutdown
behavior, and resource limits, see [`docs/behavior.md`](docs/behavior.md).

## Further reading

- [`docs/behavior.md`](docs/behavior.md): request validation, effort updates
  and cache lineage, classification, logging, limits, and forwarding.
- [`docs/verification.md`](docs/verification.md): live compatibility and cache
  checks.
- [`docs/cache-validation.md`](docs/cache-validation.md): reproducing the cache
  comparison.
- [`eval/`](eval/): task-level evaluations behind the results above.

## Development

```bash
npm ci
npm run check           # typecheck + offline tests
npm run build           # compile to dist/
npm run smoke:package   # pack, install, and start the packaged CLI
npm run smoke:plugin:v2 # install the packed plugin in an isolated OpenCode 2.0.18
```

The plugin smoke needs `openssl` and an existing `/tmp/opencode`. It packs the
plugin and installs `@opencode/cli@2.0.18` unless `OPENCODE_V2_BIN` is set.
Set `OPENCODE_V2_VERSION` to smoke another V2 version.

Tests use a fake upstream and a mocked Jev; they need no keys. To run the proxy
from source, `cp .env.example .env`, fill in the keys, then `npm run build &&
npm start`. See [`CONTRIBUTING.md`](CONTRIBUTING.md) before opening a PR.

### Releasing

CI runs on pull requests and pushes to `main`. To release, add user-facing
changes to `CHANGELOG.md`, bump the version in `package.json` and
`package-lock.json`, merge to `main`, then push a matching `v<version>` tag.
The tag workflow re-runs the checks, smoke-tests the packed tarball, and
publishes it to npm with provenance.

## Prior art

The design is informed by
[0xNatoshi/jev-codex-router](https://github.com/0xNatoshi/jev-codex-router) and
[mejiasd3v/pi-jev-router](https://github.com/mejiasd3v/pi-jev-router). No code
was copied from either project.

## License

[MIT](LICENSE)
