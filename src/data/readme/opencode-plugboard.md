# opencode-plugboard

[![npm](https://img.shields.io/npm/v/opencode-plugboard)](https://www.npmjs.com/package/opencode-plugboard)
[![license](https://img.shields.io/npm/l/opencode-plugboard)](https://github.com/jjjermiah/opencode-plugboard/blob/main/LICENSE)
[![CI](https://github.com/jjjermiah/opencode-plugboard/actions/workflows/ci.yml/badge.svg)](https://github.com/jjjermiah/opencode-plugboard/actions/workflows/ci.yml)
[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/jjjermiah/opencode-plugboard/badge)](https://scorecard.dev/viewer/?uri=github.com/jjjermiah/opencode-plugboard)
<!-- OpenSSF Best Practices: register at https://www.bestpractices.dev first (answers in docs/best-practices.md). Then replace <id> with the project id and uncomment the next line:
[![OpenSSF Best Practices](https://www.bestpractices.dev/projects/<id>/badge)](https://www.bestpractices.dev/projects/<id>)
-->

Plugboard is an OpenCode V2 plugin. It turns your OpenCode server into one HTTP API that OpenAI, Anthropic and Gemini compatible apps can call with their own key.

It is for people who run several tools, such as a Discord bot, n8n and Open WebUI, and want them to share the provider logins already in OpenCode (Claude, ChatGPT, Copilot, OpenCode Go) without giving each one a provider key.

OpenCode never runs your tools.

```
client ──▶ plugboard listener ──▶ OpenCode session ──▶ provider
  ▲                                                        │
  └──── reply; tool calls go back to the caller ◀──────────┘
```

## Endpoints

| API | Endpoint | Typical clients |
| --- | --- | --- |
| OpenAI Chat Completions | `POST /v1/chat/completions` | OpenAI SDKs, n8n, Open WebUI, LangChain, most apps |
| OpenAI Responses | `POST /v1/responses` | `openai` SDK `responses.create`, Vercel AI SDK `openai(id)` |
| Anthropic Messages | `POST /v1/messages`, `POST /v1/messages/count_tokens` | Anthropic SDKs, Claude Code |
| Gemini | `POST /v1beta/models/{model}:generateContent`, `:streamGenerateContent`, `:countTokens` | `@google/genai`, Gemini SDKs |
| Legacy completions | `POST /v1/completions` | Older scripts |
| Models | `GET /v1/models`, `GET /v1/models/{id}` | Any client that lists models |

## Quick start

Tested on OpenCode 2.0.26 and 2.0.27. The peer range `>=2.0.26 <2.1` allows 2.0.x patch releases; only 2.0.26 and 2.0.27 are tested.

**1. Pick a key** for your app, in the environment OpenCode starts from:

```sh
export PLUGBOARD_KEY_MY_APP=choose-a-long-random-string
```

**2. Install it** in your global config, `~/.config/opencode/opencode.jsonc`. Keep it global: every project loads it, and a per-project copy is not needed. OpenCode installs it from npm the first time it loads.

```jsonc
{
  "plugins": [
    {
      "package": "opencode-plugboard@0.26.0",
      "options": {
        "keys": { "my-app": "{env:PLUGBOARD_KEY_MY_APP}" },
        "models": ["anthropic/claude-sonnet-4-6", "github-copilot/*", "opencode-go/glm-5.3-flash"],
        "aliases": { "fast": "opencode-go/glm-5.3-flash" }
      }
    }
  ]
}
```

Every alias target must also be allowed in `models`.

Keep the version pinned. A bare `"opencode-plugboard"` means `latest`, so a cache refresh can load code you have not read. Change the number on purpose, after reading the [changelog](https://github.com/jjjermiah/opencode-plugboard/blob/main/CHANGELOG.md).

**3. Restart OpenCode, then touch the server once.** OpenCode loads no plugin until a client connects, so the port stays closed until then:

```sh
opencode api get /api/agent
```

For an always-on server, run that from the service unit. See [warm-up][warm-up].

**4. Call it.** The listener is on `127.0.0.1:4010`. This prints `pong`:

```sh
curl -s http://127.0.0.1:4010/v1/chat/completions \
  -H "Authorization: Bearer $PLUGBOARD_KEY_MY_APP" \
  -H "Content-Type: application/json" \
  -d '{"model": "fast", "messages": [{"role": "user", "content": "reply with exactly: pong"}]}' \
  | jq -r '.choices[0].message.content'
```

The same call with the OpenAI Python SDK. Only the base URL and the key change:

```python
import os
from openai import OpenAI

client = OpenAI(base_url="http://127.0.0.1:4010/v1", api_key=os.environ["PLUGBOARD_KEY_MY_APP"])
r = client.chat.completions.create(model="fast", messages=[{"role": "user", "content": "reply with exactly: pong"}])
print(r.choices[0].message.content)
```

Next: [client setup](#clients), the [features](#features) below, or the [configuration reference][configuration].

## Features

Each feature lists a minimal config. Every option goes under `options` in the plugin entry. The full list is in the [configuration reference][configuration].

### Access and policy

#### Apps and keys

Give every tool its own key. Traffic, history and usage are then separated by app, and revoking one tool means removing one line.

```jsonc
"keys": {
  "discord-bot": "{env:PLUGBOARD_KEY_DISCORD}",
  "n8n": "{env:PLUGBOARD_KEY_N8N}",
  "open-webui": "{env:PLUGBOARD_KEY_WEBUI}"
}
```

Callers send the key as `Authorization: Bearer <key>` (or `x-api-key` on the Anthropic routes). They never need the OpenCode server password. Removing a key takes effect on the running server at once; see [reloads and restarts][configuration-reload].

#### Model allowlist

Nothing is exposed by accident. A model is callable only if `models` lists it, and `/v1/models` shows only those.

```jsonc
"models": [
  "anthropic/*",                 // every Claude model
  "openai/gpt-5.6-luna#low",     // one ChatGPT variant
  "github-copilot/*",           // every Copilot model
  "opencode-go/glm-5.3-flash"    // one exact model
]
```

A model outside the list gets a 404:

```json
{"error": {"message": "Model openai/gpt-5 is not available", "code": "model_not_found", "type": "not_found_error", "param": "model"}}
```

#### Per-app policy

`apps` fixes an app's behaviour on the server, so the app does not have to be trusted with it. Each policy can narrow the model list, add or replace the system prompt, drop tools, lower the tool cap, cap the output tokens of one answer, or set sampling defaults for requests that do not send them.

```jsonc
"apps": {
  "discord-bot": { "models": ["fast"], "model": "fast", "system": "Answer in two sentences.", "tools": false, "maxOutputTokens": 400, "sampling": { "temperature": 0.2 } },
  "coding": { "models": ["anthropic/*"], "maxTools": 16 }
}
```

The `discord-bot` app always runs on `fast`, whatever model the bot sends (`model` pins it), gets the system prompt added, and has its tools removed. Its answers stop at 400 output tokens, and a request that sends no `temperature` gets `0.2`. The request still succeeds, and the response says what changed:

```
x-plugboard-policy: tools-stripped
```

`systemMode` is `prepend` (the default), `append` or `replace`. An app with a policy still needs its key in `keys` (or `apps.<name>.key`).

### Routing

#### Aliases

An alias is a short name a caller can use as `model`. Change the target in one line, and every app that uses the alias moves with it.

```jsonc
"aliases": {
  "smart": "anthropic/claude-sonnet-4-6",
  "fast": "opencode-go/glm-5.3-flash"
}
```

```sh
curl -s -D - http://127.0.0.1:4010/v1/chat/completions -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" -d '{"model": "fast", "messages": [{"role": "user", "content": "hi"}]}'
# ...
# x-plugboard-model: opencode-go/glm-5.3-flash
```

The `x-plugboard-model` header names the model that actually answered.

#### Fallback chains

Point an alias at a list. If the first target fails before it sends any output, plugboard tries the next one.

```jsonc
"aliases": {
  "fast": ["opencode-go/glm-5.3-flash", "anthropic/claude-haiku-4-5"]
}
```

A rate limit, quota error, provider outage or timeout moves the request on. Once any text or tool call has reached the client, a failure is not retried, so a partly streamed answer is never restarted. A retried answer shows the change in headers:

```
x-plugboard-model: anthropic/claude-haiku-4-5
x-plugboard-fallbacks: 1
```

Every target must pass `models`, or the plugin refuses to load.

#### UI-safe model ids

Some chat UIs break on the `/` and `#` in model ids. `slugs` lists a UI-safe spelling, and requests accept either spelling.

```jsonc
"modelIds": "both"   // canonical and slug, for each model
```

With `slugs`, `anthropic/claude-haiku-4-5#high` is listed as `anthropic--claude-haiku-4-5__high`. Models whose ids contain `--` have no unambiguous slug, so they stay listed under their canonical id.

To list only the models that can do something, filter the catalog:

```sh
curl -s "http://127.0.0.1:4010/v1/models?capability=vision" -H "Authorization: Bearer $KEY"
```

`capability` is `vision` or `tools`. Any other value is rejected.

### Limits and caching

`promptCache` with `affinity: "anchor"` keeps the provider prompt cache stable across requests, which gains on ChatGPT subscription models. See [prompt-cache affinity][configuration-affinity].

#### Concurrency and rate limits

`limits` caps how many model calls run at once, and how many an app may start per minute. Nothing queues. A call over a cap gets a 429 at once, so the provider never sees it.

```jsonc
"limits": {
  "maxConcurrent": 8,
  "perApp": { "maxConcurrent": 2, "requestsPerMinute": 30 },
  "apps": { "coding": { "maxConcurrent": 4 } }
}
```

`coding` gets four calls at once and still 30 per minute, because `apps.<name>` overrides `perApp` field by field. A refused call carries `Retry-After`:

```
HTTP/1.1 429 Too Many Requests
retry-after: 12

{"error": {"message": "Too many requests per minute", "code": "rate_limit_exceeded", "type": "rate_limit_error", "param": null}}
```

A full concurrency cap returns `too_many_requests` with `retry-after: 1`. The `code` is on the OpenAI and Gemini routes; the Anthropic `/v1/messages` error has a `type` and a `message` only (see [Anthropic Messages](https://jjjermiah.github.io/opencode-plugboard/messages)). The limits live in the server process, so a restart clears them.

#### Response cache

Pollers and bots often send the same prompt again and again. With `cache`, an identical request from the same app gets the stored answer. No session is created and no provider call is made.

```jsonc
"cache": { "ttlSeconds": 300, "apps": ["discord-bot"] }
```

Every answer says whether it came from the cache:

```
x-plugboard-cache: hit
```

Only normal text answers are kept. Answers with tool calls, errors, structured output and `n` above 1 are not. With `temperature` above 0, a hit repeats the first answer, so limit the cache to apps that want that. The cache is in memory and a restart empties it.

### Requests and responses

#### Streaming

Set `stream: true` and read the server-sent events. Ask for usage in the last chunk with `stream_options`.

```sh
curl -N http://127.0.0.1:4010/v1/chat/completions -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{"model": "fast", "stream": true, "stream_options": {"include_usage": true},
       "messages": [{"role": "user", "content": "count to three"}]}'
```

If the stream fails after it has started, the client gets an `error` event and then `data: [DONE]`.

#### Tools

Plugboard returns the model's tool calls to the caller and never runs them. The caller runs the tool and sends the result back, which is the normal Chat Completions loop.

```json
{"choices": [{"finish_reason": "tool_calls", "message": {"role": "assistant", "tool_calls": [
  {"id": "call_1", "type": "function", "function": {"name": "get_weather", "arguments": "{\"city\": \"Paris\"}"}}]}}]}
```

Send the answer back as a `{"role": "tool", "tool_call_id": "call_1", "content": "..."}` message. Tool call ids differ by model, so do not parse them. `maxTools` (default 64) caps the tools one request may carry.

#### Structured output

`response_format` with `json_schema` returns the arguments as the message content. The model is asked to answer through a `respond` tool. The provider does not enforce the schema, so validate the result. Anthropic-only clients can get the same JSON with a forced tool call: see [structured extraction with a forced tool](https://jjjermiah.github.io/opencode-plugboard/messages#structured-extraction-with-a-forced-tool).

```sh
curl -s http://127.0.0.1:4010/v1/chat/completions -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" -d '{
    "model": "fast",
    "messages": [{"role": "user", "content": "Extract: Ada, 36, London"}],
    "response_format": {"type": "json_schema", "json_schema": {"name": "person", "schema": {
      "type": "object",
      "properties": {"name": {"type": "string"}, "age": {"type": "integer"}},
      "required": ["name", "age"]}}}
  }' | jq -r '.choices[0].message.content'
```

`json_object` also works, but it carries no schema. Name the keys in the prompt.

#### Images

Send images as `data:` URLs, which always work. Plain `http(s)` URLs are fetched by the server only when you allow it.

```jsonc
"remoteImages": { "allow": ["images.internal"], "schemes": ["https"], "maxBytes": 5242880 }   // tightened (since 0.26.0): HTTPS only, 5 MB per image. `true` is public addresses only
```

With `true` or an `allow` list, the server fetches only public addresses by default, and refuses loopback, private, link-local and CGNAT ranges. Turn it on only if you need it, because it makes the server fetch URLs that callers send.

#### Multiple choices (`n`)

`n` above 1 returns several answers from one request. Each choice is a full model call, so `n: 3` costs three times as much.

```jsonc
"maxN": 4   // the most calls one request may fan out to; default 1
```

Above the cap the request gets a 400 `too_many_choices`. `n` works on Chat Completions and on `/v1/completions`.

Since 0.27.0 one app can have a lower cap (#270). It only lowers the global one:

```jsonc
"maxN": 4,
"apps": { "chat-widget": { "maxN": 1 } }   // this app's n above 1 gets the same 400
```

#### Token counting

Clients that budget context before they send, such as Claude Code and the Anthropic and Gemini SDKs, can count tokens first. The count is an estimate, because plugboard has no tokenizer.

```sh
curl -s http://127.0.0.1:4010/v1/messages/count_tokens -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" -d '{"model": "fast", "messages": [{"role": "user", "content": "hello"}]}'
# {"input_tokens": 12}
```

#### Dropped sampling parameters

Some models reject `temperature`, `top_p` or the penalties. Plugboard drops the ones it knows a model refuses, and lists them in a header, so the request still succeeds.

```
x-plugboard-dropped-params: temperature,top_p
```

Models plugboard does not know keep every parameter, and the provider's own 400 comes back. Set `"dropUnsupportedParams": false` to forward everything as sent.

### Operations

#### Usage statistics

Usage is recorded per app and per UTC day: requests, errors, latency, tokens, estimated cost, cache hits, fallbacks and 429 refusals. It is on by default. An admin key reads every app, and an app key reads only its own.

Per end user: an app whose proxy sets a user header can name it with `userHeader`, so usage splits per user without a change to the bot (`"apps": { "discord-bot": { "userHeader": "x-user-id" } }`, since 0.32.0).

```jsonc
"adminKey": "{env:PLUGBOARD_ADMIN_KEY}",   // reads every app; not a model key
"usage": { "retentionDays": 90 }           // the default; { "enabled": false } turns it off
```

```sh
curl -s "http://127.0.0.1:4010/plugboard/usage?from=2026-10-01&to=2026-10-11" \
  -H "Authorization: Bearer $PLUGBOARD_ADMIN_KEY"
```

A trimmed response:

```json
{"from": "2026-10-01", "to": "2026-10-11",
 "totals": {"requests": 40, "tokens": {"input": 8120, "output": 2600}, "costUsd": 0.12, "cacheHits": 9},
 "apps": {"discord-bot": {"totals": {"requests": 31}, "models": {"opencode-go/glm-5.3-flash": {"requests": 31}}}}}
```

Cost is an estimate at list prices, so use it to compare apps, not as a bill. The same report is available to OpenCode clients through the `opencode-plugboard/rpc` entry. Counts reach storage every ten seconds, so a restart can lose the last few seconds.

#### History

Every request is kept as an OpenCode session in a directory for its app, so it never mixes with your projects. You can read what each app asked and what the model answered. Chat responses carry the session id as `x-plugboard-session`.

```jsonc
"history": { "maxSessions": 500, "maxAgeDays": 30 }   // the global limits; the stricter one wins within an app
```

Without `history`, sessions older than 30 days are pruned (`maxAgeDays` defaults to 30). Set `"maxAgeDays": 0` to keep them forever. Sessions created before the upgrade are not indexed, so they are never pruned.

Since 0.27.0 one app can keep a different amount (#265). A field set on the app replaces the global one for that app, and an unset field falls back to it:

```jsonc
"history": { "maxSessions": 500 },
"apps": {
  "discord-bot": { "history": { "maxSessions": 20 } },
  "coding": { "history": { "maxSessions": 5000, "maxAgeDays": 180 } }
}
```

Gotcha: the global `maxAgeDays` defaults to 30, so an app that sets only `maxSessions` is still pruned after 30 days. To keep it longer, set its `maxAgeDays`; an app cannot set `0` (keep forever), so use a large value such as `36500`.

#### Metrics and logs

Prometheus metrics are off by default. Turn them on, and get structured logs when a pipeline reads them.

```jsonc
"metrics": true,
"logFormat": "json"   // one object per line; ids and outcomes only, never keys or bodies
```

Since 0.27.0 `logLevel` picks the lowest level written, and `logRequests: false` drops the per-request access lines (#262). Problems stay visible at `warn`: rate limits, budget refusals, failed fallbacks and failed history deletions. Admin key creation and revocation are audit lines and are written at every level. See [`logLevel` in the configuration](https://github.com/jjjermiah/opencode-plugboard/blob/main/docs/configuration.md) for the full list.

```sh
curl -s http://127.0.0.1:4010/plugboard/metrics -H "Authorization: Bearer $KEY" | grep plugboard_requests_total
```

Every response has an `x-plugboard-request-id`, the same id that appears on that request's log lines. Useful log events include `request.finished`, `request.limited` and `model.fallback`. The metrics have no model label, so their cardinality stays bounded.

## Full example

A server shared by a Discord bot, n8n, Open WebUI and a coding agent, with most of the features above:

```jsonc
{
  "plugins": [
    {
      "package": "opencode-plugboard@0.26.0",
      "options": {
        // Reachable from the LAN. Non-loopback hosts refuse to start without keys.
        "listen": { "host": "192.0.2.10", "port": 4010 },

        // One key per app. Each app's history, usage and limits are separate.
        "keys": {
          "discord-bot": "{env:PLUGBOARD_KEY_DISCORD}",
          "n8n": "{env:PLUGBOARD_KEY_N8N}",
          "open-webui": "{env:PLUGBOARD_KEY_WEBUI}",
          "coding": "{env:PLUGBOARD_KEY_CODING}"
        },
        "adminKey": "{env:PLUGBOARD_ADMIN_KEY}",

        // What may be called at all. Everything else is a 404.
        "models": ["anthropic/*", "github-copilot/*", "openai/gpt-5.6-luna#low", "opencode-go/glm-5.3-flash"],

        // Short names. A list is a fallback chain; every target must pass `models`.
        "aliases": {
          "smart": "anthropic/claude-sonnet-4-6",
          "fast": ["opencode-go/glm-5.3-flash", "anthropic/claude-haiku-4-5"]
        },

        // Per-app rules, enforced whatever the app sends.
        "apps": {
          "discord-bot": { "models": ["fast"], "system": "Answer in two sentences.", "tools": false },
          "coding": { "maxTools": 16 }
        },

        // Shared caps, and a per-app budget for the bot.
        "limits": {
          "maxConcurrent": 8,
          "perApp": { "maxConcurrent": 2, "requestsPerMinute": 30 },
          "apps": { "coding": { "maxConcurrent": 4 } }
        },

        // Repeated bot prompts are answered from memory for five minutes.
        "cache": { "ttlSeconds": 300, "apps": ["discord-bot"] },

        // Chat UIs get ids they can handle; requests accept either spelling.
        "modelIds": "both",

        "maxN": 2,
        "remoteImages": { "allow": ["images.internal"] },

        "history": { "maxSessions": 500, "maxAgeDays": 30 },
        "usage": { "retentionDays": 90 },

        "metrics": true,
        "logFormat": "json"
      }
    }
  ]
}
```

## Clients

One page per client, with the config, a chat, a tool call, structured output and the gotchas found in testing. Each page says which version was tested and when.

| Client | Page | Last run (2026-10-11) |
| --- | --- | --- |
| OpenAI Python SDK | [openai-python][client-openai-python] | pass |
| OpenAI JS SDK | [openai-js][client-openai-js] | pass |
| Vercel AI SDK | [vercel-ai-sdk][client-vercel-ai-sdk] | pass with `createOpenAICompatible` or `.chat()`; structured output needs `supportsStructuredOutputs: true` there; the default `openai(id)` call works through `/v1/responses` (multi-turn chats work with the default `store: true`, and `store: false` also works) |
| LangChain Python | [langchain-python][client-langchain-python] | pass; `json_mode` on `fast` was unreliable |
| LangChain JS | [langchain-js][client-langchain-js] | pass except `gpt-5.6*` ids, which force the Responses API, and `json_mode` on `fast` |
| pydantic-ai | [pydantic-ai][client-pydantic-ai] | pass with `OpenAIChatModel` |
| Open WebUI | [open-webui][client-open-webui] | pass over its HTTP API; no browser, no structured output in its UI |
| n8n | [n8n][client-n8n] | pass with "Use Responses API" off |
| Claude Code | [claude-code][client-claude-code] | pass: text and a tool turn through `/v1/messages`; needs `maxTools` above 36 |
| Codex CLI | [codex-cli][client-codex-cli] | docs only, not run yet (Responses API) |
| Continue | [continue][client-continue] | docs only, not run yet |
| Kilo Code | [kilo-code][client-kilo-code] | docs only, not run yet |
| LibreChat | [librechat][client-librechat] | docs only, not run yet |
| Zed | [zed][client-zed] | docs only, not run yet |
| LobeChat | [lobechat][client-lobechat] | docs only, not run yet (web app) |
| Chatbox | [chatbox][client-chatbox] | docs only, not run yet (desktop app); OpenAI and Gemini provider types |
| Jan | [jan][client-jan] | docs only, not run yet (desktop app and CLI); OpenAI and Anthropic API formats |
| AnythingLLM | [anythingllm][client-anythingllm] | docs only, not run yet (desktop/Docker app); Generic OpenAI provider |
| SillyTavern | [sillytavern][client-sillytavern] | docs only, not run yet (web app); Custom (OpenAI-compatible) source |
| Cline | [cline][client-cline] | docs only, not run yet (VS Code extension); OpenAI Compatible provider |
| Roo Code | [roo-code][client-roo-code] | docs only, not run yet (VS Code extension); needs native tool calling |
| promptfoo | [promptfoo][client-promptfoo] | pass against the live dev server (2026-10-13): `promptfoo eval` 2/2 (text, tool call); model-graded assertions need a plugboard grader |
| lm-evaluation-harness | [lm-eval][client-lm-eval] | pass against the live dev server (2026-10-13): `local-completions` and `local-chat-completions` on a generate-until task (the chat type was flaky once: 0.5, then 1.0); loglikelihood tasks need logprobs, which plugboard refuses |
| smolagents | [smolagents][client-smolagents] | pass: text, stream, tool call and tool round trip on `fast` (smolagents 1.26.0); needs `smolagents[openai]` |
| Langfuse | [langfuse][client-langfuse] | pass: text, stream and one tool round trip on `fast` through the OpenAI wrapper (langfuse 4.17.0), tracing off; traces to a Langfuse server not run |
| Mastra | [mastra][client-mastra] | pass against the scripted fake: text, stream, tool call, tool round trip; needs `plugboard/fast`, not bare `fast` |
| Dify | [dify][client-dify] | docs only, not run yet (self-hosted web app); OpenAI-API-compatible provider, Chat mode, Tool Call off by default |
| Home Assistant (Extended OpenAI Conversation) | [home-assistant-extended-openai][client-home-assistant-extended-openai] | docs only, not run yet (custom component); Base Url field, one default tool |
| Haystack | [haystack][client-haystack] | pass against the scripted fake: pipeline text, stream, tool call, tool round trip |
| LlamaIndex | [llamaindex][client-llamaindex] | pass against the scripted fake: text, stream, tool call, tool round trip; `OpenAILike` (the `OpenAI` class rejects `fast`) |
| OpenAI Agents SDK (Python) | [openai-agents][client-openai-agents] | pass on Responses and Chat Completions: text, stream, tools, structured output |
| Go (go-openai) | [go-openai][client-go-openai] | pass: text, stream and a tool round trip on `fast` (go-openai v1.43.0) |
| .NET (openai-dotnet) | [openai-dotnet][client-openai-dotnet] | pass: text, stream and a tool round trip on `fast` (OpenAI NuGet 2.14.0) |
| Rust (async-openai) | [async-openai][client-async-openai] | pass: text, stream and a tool round trip on `fast` (async-openai 0.42.2) |
| CrewAI | [crewai][client-crewai] | pass: text, stream and a crew task with one tool call on `fast` (crewai 1.15.27) |
| AutoGen / AG2 | [autogen][client-autogen] | partial: text, stream and a two-agent tool round on `fast` (autogen 0.14.1, OpenAI route); Anthropic route not run |
| Semantic Kernel | [semantic-kernel][client-semantic-kernel] | pass on Python: text, stream and a plugin call on `fast` (semantic-kernel 1.45.0); .NET route not run |
| Spring AI | [spring-ai][client-spring-ai] | docs-verified, not run: config checked against the reference; no Java build or run yet |
| LangChain4j | [langchain4j][client-langchain4j] | docs-verified, not run: builder checked against the OpenAI-compatible page; no Java build or run yet |
| LiteLLM (as a client) | [litellm-client][client-litellm] | pass: text, stream, tools |
| Instructor | [instructor][client-instructor] | pass: TOOLS, JSON_SCHEMA and partial streaming modes |
| DSPy | [dspy][client-dspy] | pass: Predict, ChainOfThought, typed output |
| Aider | [aider][client-aider] | pass: one scripted `--message` run |
| Anything else | [any-app][client-any-app] | base URL, key, model id |

Each run drove the client's own SDK or API against a dev server at an earlier commit: a plain chat, a tool round trip, streaming, an image and structured output on `fast`, a Claude model and a ChatGPT model. A pass is not a clean sweep, and the notes say where it was not. The latest full run is in [examples/_release/release-candidate.md][release-candidate].

The protocol-level results are in the [compatibility matrix][compatibility]. It runs in CI against a scripted model, so it checks wire formats, not a provider's behaviour.

## Known gaps

- **Responses keeps no conversation.** Every request carries the whole conversation, and `previous_response_id` and `conversation` are rejected. The output items of recent answers are held in memory for an hour, so the `item_reference`s that the Vercel AI SDK sends back resolve; a restart clears them ([#147](https://github.com/jjjermiah/opencode-plugboard/issues/147)). For n8n, turn "Use Responses API" off.
- **Stop sequences** are removed from the answer when they end it, on the Anthropic, OpenAI and Gemini routes. The host reports only that the turn stopped, so a sequence the provider ended on without returning it is not removed.
- **Anthropic structured outputs** (`output_config.format`) are refused with a 400. Use `json_schema` on the OpenAI or Gemini endpoints, or a forced tool call on `/v1/messages` ([recipe](https://jjjermiah.github.io/opencode-plugboard/messages#structured-extraction-with-a-forced-tool)).
- **Gemini `candidateCount` above 1** is refused. The OpenAI endpoints serve `n`.
- **Gemini model ids with a `/`** sent by the AI SDK's Google provider or LangChain's `google-genai` lack the `models/` prefix and get a 401. The `@google/genai` SDK works.
- **Tools with `json_schema`** in one request return the caller's tool calls, not the schema answer ([#34](https://github.com/jjjermiah/opencode-plugboard/issues/34)).
- **State is per server.** Limits, the cache and usage live in one OpenCode server process. Two servers do not share them, and a restart clears limits and the cache.
- **Token counts and costs are estimates.**
- **Not planned:** embeddings, audio, image generation and `logprobs`.
- **V2 only.** OpenCode V1 is not supported and not planned.
- **Early (0.x).** A minor bump can change an option or a default. Read the [changelog](https://github.com/jjjermiah/opencode-plugboard/blob/main/CHANGELOG.md) before you upgrade.

Open work is tracked in the [v0.1 milestone](https://github.com/jjjermiah/opencode-plugboard/milestone/1) and the [later milestone](https://github.com/jjjermiah/opencode-plugboard/milestone/2).

## Security

- **Bind address.** The listener binds `127.0.0.1` by default. A non-loopback `listen.host` refuses to start without `keys`. On a loopback bind, a `Host` header that is not `localhost`, `127.0.0.1` or `[::1]` gets a 403.
- **Keys cross the network in clear text.** The endpoint speaks plain HTTP. For remote access, allow only known addresses in the firewall, tunnel over SSH, or put a TLS-terminating proxy in front. See [reaching plugboard from another host or container][reach] and [remote access][remote-access].
- **Browser origins.** `cors.origins` (since 0.26.0) names the web pages allowed to call plugboard. Every other origin gets no CORS header, and `"*"` needs keys. See [browser origins](https://jjjermiah.github.io/opencode-plugboard/configuration#browser-origins-since-0-26-0).
- **Keep keys out of the config file.** Use `{env:VAR}` and keep the values in the environment or a secret store. Every app needs its own key.
- **`adminKey` reads usage only.** It cannot call the model routes, and it must differ from every app key.
- **Keyless mode is loopback only.** Without `keys`, the one app is `default`, and only local callers can reach it. On a shared machine, set `"requireKeys": true` (since 0.26.0) so the server refuses to run keyless and every local request needs a key.
- **Remote images are off by default.** Turning them on makes the server fetch URLs chosen by callers.
- **The plugin runs inside OpenCode.** It sees your provider logins, so pin the version and update it on purpose.

## How it works

Each request becomes an OpenCode session in the app's own directory, using OpenCode's request path, so provider fixes and auth plugins still apply.

The plugin swaps the caller's prompt, messages and tools in for OpenCode's own. Caller tools map to placeholder tools that settle at once with a no-op result. When the model has emitted its tool calls, the plugin interrupts the turn and returns them to the caller. Text streams out as it arrives. The [architecture][architecture] doc covers the lifetimes and the freeze-safety rules.

## Documentation

- [Configuration reference][configuration]: every option, with its syntax and defaults.
- [Apps and keys][configuration-apps], [aliases and fallbacks][configuration-aliases], [limits][configuration-limits], [usage statistics][configuration-usage].
- Endpoints: [Responses][responses], [Anthropic Messages][messages], [Gemini][gemini], [legacy completions and `n`][completions].
- [History][history] and [warm-up][warm-up] for always-on servers.
- [Architecture][architecture] and [development][development].

## License

MIT

Not affiliated with or endorsed by OpenAI, Anthropic, Google, GitHub or Microsoft. Product names are trademarks of their owners.

[configuration]: https://jjjermiah.github.io/opencode-plugboard/configuration
[configuration-apps]: https://jjjermiah.github.io/opencode-plugboard/configuration#apps-and-keys
[configuration-aliases]: https://jjjermiah.github.io/opencode-plugboard/configuration#aliases-and-fallbacks
[configuration-limits]: https://jjjermiah.github.io/opencode-plugboard/configuration#concurrency-and-rate-limits
[configuration-affinity]: https://jjjermiah.github.io/opencode-plugboard/configuration#prompt-cache-affinity
[configuration-usage]: https://jjjermiah.github.io/opencode-plugboard/configuration#usage-statistics
[configuration-reload]: https://jjjermiah.github.io/opencode-plugboard/configuration#reloads-and-restarts
[responses]: https://jjjermiah.github.io/opencode-plugboard/responses
[messages]: https://jjjermiah.github.io/opencode-plugboard/messages
[gemini]: https://jjjermiah.github.io/opencode-plugboard/gemini
[completions]: https://jjjermiah.github.io/opencode-plugboard/completions
[history]: https://jjjermiah.github.io/opencode-plugboard/history
[warm-up]: https://jjjermiah.github.io/opencode-plugboard/warm-up
[architecture]: https://jjjermiah.github.io/opencode-plugboard/architecture
[development]: https://jjjermiah.github.io/opencode-plugboard/development
[compatibility]: https://jjjermiah.github.io/opencode-plugboard/compatibility
[release-candidate]: https://github.com/jjjermiah/opencode-plugboard/blob/main/examples/_release/release-candidate.md
[reach]: https://jjjermiah.github.io/opencode-plugboard/clients/any-app#reaching-plugboard-from-another-host-or-container
[remote-access]: https://jjjermiah.github.io/opencode-plugboard/remote-access
[client-openai-python]: https://jjjermiah.github.io/opencode-plugboard/clients/openai-python
[client-openai-js]: https://jjjermiah.github.io/opencode-plugboard/clients/openai-js
[client-vercel-ai-sdk]: https://jjjermiah.github.io/opencode-plugboard/clients/vercel-ai-sdk
[client-langchain-python]: https://jjjermiah.github.io/opencode-plugboard/clients/langchain-python
[client-langchain-js]: https://jjjermiah.github.io/opencode-plugboard/clients/langchain-js
[client-pydantic-ai]: https://jjjermiah.github.io/opencode-plugboard/clients/pydantic-ai
[client-open-webui]: https://jjjermiah.github.io/opencode-plugboard/clients/open-webui
[client-n8n]: https://jjjermiah.github.io/opencode-plugboard/clients/n8n
[client-claude-code]: https://jjjermiah.github.io/opencode-plugboard/clients/claude-code
[client-codex-cli]: https://jjjermiah.github.io/opencode-plugboard/clients/codex-cli
[client-continue]: https://jjjermiah.github.io/opencode-plugboard/clients/continue
[client-kilo-code]: https://jjjermiah.github.io/opencode-plugboard/clients/kilo-code
[client-librechat]: https://jjjermiah.github.io/opencode-plugboard/clients/librechat
[client-zed]: https://jjjermiah.github.io/opencode-plugboard/clients/zed
[client-lobechat]: https://jjjermiah.github.io/opencode-plugboard/clients/lobechat
[client-chatbox]: https://jjjermiah.github.io/opencode-plugboard/clients/chatbox
[client-jan]: https://jjjermiah.github.io/opencode-plugboard/clients/jan
[client-anythingllm]: https://jjjermiah.github.io/opencode-plugboard/clients/anythingllm
[client-sillytavern]: https://jjjermiah.github.io/opencode-plugboard/clients/sillytavern
[client-cline]: https://jjjermiah.github.io/opencode-plugboard/clients/cline
[client-roo-code]: https://jjjermiah.github.io/opencode-plugboard/clients/roo-code
[client-llamaindex]: https://jjjermiah.github.io/opencode-plugboard/clients/llamaindex
[client-haystack]: https://jjjermiah.github.io/opencode-plugboard/clients/haystack
[client-mastra]: https://jjjermiah.github.io/opencode-plugboard/clients/mastra
[client-smolagents]: https://jjjermiah.github.io/opencode-plugboard/clients/smolagents
[client-langfuse]: https://jjjermiah.github.io/opencode-plugboard/clients/langfuse
[client-promptfoo]: https://jjjermiah.github.io/opencode-plugboard/clients/promptfoo
[client-lm-eval]: https://jjjermiah.github.io/opencode-plugboard/clients/lm-eval
[client-dify]: https://jjjermiah.github.io/opencode-plugboard/clients/dify
[client-home-assistant-extended-openai]: https://jjjermiah.github.io/opencode-plugboard/clients/home-assistant-extended-openai
[client-openai-agents]: https://jjjermiah.github.io/opencode-plugboard/clients/openai-agents
[client-go-openai]: https://jjjermiah.github.io/opencode-plugboard/clients/go-openai
[client-openai-dotnet]: https://jjjermiah.github.io/opencode-plugboard/clients/openai-dotnet
[client-async-openai]: https://jjjermiah.github.io/opencode-plugboard/clients/async-openai
[client-crewai]: https://jjjermiah.github.io/opencode-plugboard/clients/crewai
[client-autogen]: https://jjjermiah.github.io/opencode-plugboard/clients/autogen
[client-semantic-kernel]: https://jjjermiah.github.io/opencode-plugboard/clients/semantic-kernel
[client-spring-ai]: https://jjjermiah.github.io/opencode-plugboard/clients/spring-ai
[client-langchain4j]: https://jjjermiah.github.io/opencode-plugboard/clients/langchain4j
[client-litellm]: https://jjjermiah.github.io/opencode-plugboard/clients/litellm-client
[client-instructor]: https://jjjermiah.github.io/opencode-plugboard/clients/instructor
[client-dspy]: https://jjjermiah.github.io/opencode-plugboard/clients/dspy
[client-aider]: https://jjjermiah.github.io/opencode-plugboard/clients/aider
[client-any-app]: https://jjjermiah.github.io/opencode-plugboard/clients/any-app
