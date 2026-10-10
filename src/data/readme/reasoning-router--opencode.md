# reasoning-router

English | [简体中文](README_CN.md) | [日本語](README_JA.md) | [한국어](README_KO.md)

[![CI](https://github.com/robertn702/reasoning-router/actions/workflows/ci.yml/badge.svg)](https://github.com/robertn702/reasoning-router/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/%40reasoning-router%2Fproxy?label=%40reasoning-router%2Fproxy)](https://www.npmjs.com/package/@reasoning-router/proxy)
[![MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**Keep the quality. Spend less reasoning.** `reasoning-router` asks a
classifier how much reasoning each step of a coding session needs, so one
strong model handles quick edits and hard debugging without you switching
effort levels by hand. It works in OpenCode, Pi, Codex CLI, and any client
that can talk to a local proxy, with the classifier you choose.

![Illustrative effort routing: a classifier lowers effort for a rename and keeps it high for debugging a race condition.](assets/readme.gif)

![Core comparison: both arms solve 44 of 44; Jev averages 20.2% less input, 14.3% less output, and 8.7% less time than fixed high.](eval/results/router-core-comparison.svg)

Across the tested GPT-6 Astra task mix, Jev-routed effort and fixed `high`
effort each solved **44/44 attempts**, and Jev used **14% fewer output tokens**
(including reasoning) and finished **9% faster** on average. Results on other
workloads, models, and classifiers may differ.
[See the evaluation](eval/results/router-consolidated-2026-09-25.md).

> **Status: alpha.** Install the packages below from npm as described in each
> package README.

## Quick start

Pick your harness. Each example uses Jev with a
[TypeSafe](https://typesafe.ai/) key; see [Classifiers](#classifiers) for the
others.

**OpenCode** — add the plugin to `opencode.json`
([full guide](packages/opencode)):

```jsonc
{
  "plugins": [{ "package": "@reasoning-router/opencode", "options": {
    "classifier": { "provider": "jev", "apiKey": "{env:REASONING_ROUTER_CLASSIFIER_API_KEY}" },
    "wrap": { "openai": ["openai/gpt-6-astra"] }
  }}],
  "model": "reasoning-router/gpt-6-astra"
}
```

**Pi** — Claude models only ([full guide](packages/pi)):

```bash
export REASONING_ROUTER_CLASSIFIER_API_KEY=<typesafe-key>
pi install npm:@reasoning-router/pi
pi --model reasoning-router/claude-opus-5-5
```

**Codex CLI or any Responses/Messages client** — run the local proxy and point
the client at `http://127.0.0.1:4320/v1` ([full guide](packages/proxy)):

```bash
REASONING_ROUTER_CLASSIFIER_API_KEY=<typesafe-key> \
REASONING_ROUTER_UPSTREAM_BASE_URL=https://api.openai.com/v1 \
REASONING_ROUTER_UPSTREAM_AUTH=bearer \
REASONING_ROUTER_UPSTREAM_API_KEY=<openai-key> \
npx @reasoning-router/proxy
```

For Codex, add the proxy as a provider in `~/.codex/config.toml`. The
classifier picks the effort, so Codex's own effort setting is ignored:

```toml
model = "gpt-6-astra"
model_provider = "reasoning-router"

[model_providers.reasoning-router]
name = "reasoning-router"
base_url = "http://127.0.0.1:4320/v1"
wire_api = "responses"
```

If the classifier is slow or unavailable, the request still runs, at the
fallback effort (`high` by default).

## How it works

For each primary request, the router:

1. Sends a bounded summary of the recent conversation to the classifier, which
   picks a reasoning effort (for example `low` for a rename, `high` for a
   failing test).
2. Adds that effort to the request as an OpenAI `configuration_update` item or
   an Anthropic effort-only system message. Earlier updates stay in place, so
   the prompt prefix stays cacheable.
3. Sends the request to your model endpoint and streams the response back
   unchanged.

## What is sent where

- **To the classifier:** bounded excerpts of recent user and assistant text, up
  to 8 recent tool results (with tool names and error flags), a short failure
  summary, and the model ID. Hosted-tool and computer-use payloads are not
  sent. Laya, Kev, and CLM run on your own server.
- **To your endpoint:** the full request, with the effort update added.
- **Logged:** metadata only (IDs, model, effort, latency, token counts), and
  only to the proxy's stdout or a decision log you enable. Prompts, tool
  output, credentials, and raw errors are never logged.

See [docs/behavior.md](docs/behavior.md) for the details.

## Why

A single model at low effort and at max effort can differ as much as separate
model tiers do, in both capability and price.

You could route easy steps of a coding session to a cheaper model, but
switching models invalidates the prompt cache. On a long session, rebuilding
that context can cost more than the cheaper model saves.

Models that let you change reasoning effort mid-conversation keep the cache,
so a session can stay on one strong model. It can use low effort for simple
edits and tool calls and save high or max for architecture and hard debugging.
`reasoning-router` picks the effort for each step.

## Alpha limitations

- **Tested with:** Node.js 24.x, OpenCode V2 2.0.18, Pi 1.0.4, and Codex CLI
  0.159.0 (through the proxy). Other versions may work but are untested.
- **Models:** only those listed under [Supported models](#supported-models).
  Other models are rejected locally. Pi routes Claude models only.
- **Classifiers:** the router asks the configured classifier and applies its
  answer; it makes no claim about how well any classifier picks effort for
  your workload.
- **Proxy:** for trusted local use only; see its
  [trust model](packages/proxy/README.md#trust-model).

Report vulnerabilities as described in [SECURITY.md](SECURITY.md).

## Intent

`reasoning-router` asks a classifier how much reasoning each step of an agent
session needs, then applies that effort to the outgoing model request without
breaking the prompt cache.

- **Any classifier.** [Jev](https://typesafe.ai/) is one of several decision
  models that can classify how much reasoning a step needs, and more are being
  released. Which classifier to use is configuration, not a dependency:
  `reasoning-router` must not depend on Jev or any single provider.
- **Any harness.** The same routing runs inside OpenCode, Pi, or any client
  that can talk to the standalone proxy.

The packages are:

- [`@reasoning-router/core`](packages/core): the shared, harness- and
  classifier-independent router.
- [`@reasoning-router/opencode`](packages/opencode): the OpenCode V2 plugin.
- [`@reasoning-router/classifiers`](packages/classifiers): the
  classifiers (Jev, Cloudflare Clef, Laya, Kev, OpenAI Decisions, and CLM),
  selected by `classifier.provider`.
- [`@reasoning-router/pi`](packages/pi): the Pi extension (Claude models
  only, for now).
- [`@reasoning-router/proxy`](packages/proxy): the standalone
  Responses/Messages proxy (command `reasoning-router`).

See [docs/architecture.md](docs/architecture.md) for the problem statement,
the package plan, and the open questions, and
[docs/behavior.md](docs/behavior.md) for the router's wire behavior.

## Classifiers

Pick a classifier with `REASONING_ROUTER_CLASSIFIER` (proxy and Pi) or the
plugin's `classifier.provider` option (OpenCode). The examples below use the
proxy; the OpenCode plugin takes the same settings as `classifier.apiKey`,
`classifier.baseUrl`, `classifier.accountId`, and `classifier.model`, and
falls back to these environment variables. See
[docs/environment.md](docs/environment.md) and
[`@reasoning-router/classifiers`](packages/classifiers) for every setting.

### Jev (default)

[Jev](https://typesafe.ai/) is a hosted decision model from TypeSafe. Get a
TypeSafe API key, then:

```bash
REASONING_ROUTER_CLASSIFIER=jev \
REASONING_ROUTER_CLASSIFIER_API_KEY=<typesafe-key> \
reasoning-router
```

To use a Vercel AI Gateway key instead, also set
`REASONING_ROUTER_CLASSIFIER_BASE_URL=https://ai-gateway.vercel.sh/typesafe`.

### Cloudflare Clef

[Clef](https://developers.cloudflare.com/workers-ai/models/clef/) runs on
Cloudflare Workers AI. Create a Cloudflare API token with Workers AI
permissions, then:

```bash
REASONING_ROUTER_CLASSIFIER=clef \
REASONING_ROUTER_CLASSIFIER_API_KEY=<cloudflare-token> \
REASONING_ROUTER_CLASSIFIER_ACCOUNT_ID=<cloudflare-account-id> \
REASONING_ROUTER_CLASSIFIER_MODEL=clef \
reasoning-router
```

Set `REASONING_ROUTER_CLASSIFIER_MODEL` to `clef` or `clef-flash`. It is
required.

### Laya

[Laya](https://huggingface.co/convaiinnovations/laya) is an open-source,
Jev-compatible decision model that you run yourself. The router only calls
it over HTTP; it never installs or loads the model. Start Laya's
`laya-serve`, then point the router at it:

```bash
pip install "laya[serve]"
LAYA_HOST=127.0.0.1 LAYA_PRELOAD=1 laya-serve   # http://127.0.0.1:8000
REASONING_ROUTER_CLASSIFIER=laya reasoning-router
```

The default base URL is `http://127.0.0.1:8000`. A remote server must use
HTTPS. Set `REASONING_ROUTER_CLASSIFIER_API_KEY` only if the server sets
`LAYA_API_KEY`, and set `REASONING_ROUTER_CLASSIFIER_MODEL` to choose a
checkpoint (`english`, `multilingual`, or `typed-decisions`).

### Kev

[Kev](https://github.com/jaredpalmer/kev) is an open-source, Jev-compatible
family of decision models that you run yourself with its `kev.serve`. The
router only calls it over HTTP:

```bash
uv run --extra serve python -m kev.serve --run jaredpalmer/kev-4b@v1.0   # http://127.0.0.1:8008
REASONING_ROUTER_CLASSIFIER=kev reasoning-router
```

See [docs/proposals/kev.md](docs/proposals/kev.md) for the pinned version,
the confirmed HTTP contract, auth, limits, and what is not yet verified.

### OpenAI Decisions

The `openai-decisions` classifier calls OpenAI's Decisions API (public beta,
model `gpt-6-luna`) with your own OpenAI API key:

```bash
REASONING_ROUTER_CLASSIFIER=openai-decisions \
REASONING_ROUTER_CLASSIFIER_API_KEY="$OPENAI_API_KEY" \
reasoning-router
```

It is tested against mocked responses only; live compatibility and
effort-selection quality are unverified. See
[packages/classifiers](packages/classifiers/README.md#openai-decisions-provider-openai-decisions)
for the privacy boundary, regional endpoints, and cost.

### CLM

[CLM](https://github.com/Contrastive-LM/CLM) is a decision model that you run
yourself with its `clm-serve`. `clm-serve` needs a separate pooling backend
(Qwen3-8B embeddings, for example vLLM) that you also run. The router only
calls `clm-serve` over HTTP:

```bash
vllm serve Qwen/Qwen3-8B --served-model-name qwen3-8b --runner pooling --max-model-len 2048 --host 127.0.0.1 --port 8090
clm-serve --host 127.0.0.1 --no-ui   # http://127.0.0.1:8700
REASONING_ROUTER_CLASSIFIER=clm reasoning-router
```

The default base URL is `http://127.0.0.1:8700`. Set
`REASONING_ROUTER_CLASSIFIER_API_KEY` only if the server sets `CLM_API_KEY`,
and `REASONING_ROUTER_CLASSIFIER_MODEL` to choose a CLM head (the server
defaults to `clm-latest`). See [docs/classifiers/clm.md](docs/classifiers/clm.md)
for the pinned version, the pooling backend, and the 2,048-token truncation.
Only API compatibility has been verified. Effort-decision quality has not.

## Supported models

The router rejects any other model locally. Whether your upstream account can
use a model is a separate question.

| Model | ID | API | Efforts | Base effort | Pi |
| --- | --- | --- | --- | --- | --- |
| GPT-6 Astra | `gpt-6-astra` | Responses | low–max | medium | No |
| GPT-6 Luna | `gpt-6-luna` | Responses | none–max | medium | No |
| GPT-6 Sol | `gpt-6-sol` | Responses | none–max | medium | No |
| GPT-6.1 Sol | `gpt-6.1-sol` | Responses | low–max | medium | No |
| Claude Fable 5.1 | `claude-fable-5-1` | Messages | low–max | high | Yes |
| Claude Mythos 5.1 | `claude-mythos-5-1` | Messages | low–max | high | No (Pi 1.0.4) |
| Claude Opus 5.5 | `claude-opus-5-5` | Messages | low–max | medium | Yes |
| Claude Opus 5 | `claude-opus-5` | Messages | low–max | high | Yes |
| Claude Sonnet 5.5 | `claude-sonnet-5-5` | Messages | low–max | medium | Yes |

Efforts run in the order none, low, medium, high, xhigh, max. Base effort is
the model's default request-level effort, which `REASONING_ROUTER_BASE_EFFORT`
overrides. When classification fails, the router uses the fallback effort,
`high` by default for every model; set it with
`REASONING_ROUTER_FALLBACK_EFFORT` or the plugin's `fallbackEffort` option.
See [docs/behavior.md](docs/behavior.md) and
[docs/classification-policy.md](docs/classification-policy.md). The registry
lives in
[`packages/core/src/models.ts`](packages/core/src/models.ts).

## Development

Requires Node.js 24.x.

```bash
npm ci
npm run check   # typecheck + lint + test
```

See [AGENTS.md](AGENTS.md) for the full command list and repo conventions.

Reversible design and tooling decisions are recorded in
[docs/architecture.md](docs/architecture.md#decisions).

## License

[MIT](LICENSE)
