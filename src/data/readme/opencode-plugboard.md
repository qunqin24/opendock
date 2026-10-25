<div align="center">
  <br />
  <h1>opencode-plugboard</h1>
  <p>Your OpenCode logins, served as an API</p>

[![npm](https://img.shields.io/npm/v/opencode-plugboard)](https://www.npmjs.com/package/opencode-plugboard)
[![license](https://img.shields.io/npm/l/opencode-plugboard)](https://github.com/jjjermiah/opencode-plugboard/blob/main/LICENSE)
[![CI](https://github.com/jjjermiah/opencode-plugboard/actions/workflows/ci.yml/badge.svg)](https://github.com/jjjermiah/opencode-plugboard/actions/workflows/ci.yml)
[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/jjjermiah/opencode-plugboard/badge)](https://scorecard.dev/viewer/?uri=github.com/jjjermiah/opencode-plugboard)

  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/jjjermiah/opencode-plugboard/main/docs/public/hero-dark.svg" />
    <img src="https://raw.githubusercontent.com/jjjermiah/opencode-plugboard/main/docs/public/hero-light.svg" width="860" alt="Apps call plugboard with the OpenAI, Anthropic or Gemini API. Plugboard runs inside your OpenCode server, turns each request into an OpenCode session and uses your provider logins." />
  </picture>
  <br />
</div>

Use the models you already log in to in OpenCode (ChatGPT, Claude, GitHub Copilot, OpenCode Go and the rest) from any app that speaks the OpenAI, Anthropic or Gemini API.

Plugboard is an OpenCode V2 plugin. It opens an HTTP listener inside your OpenCode server and answers those APIs with your connected providers. Each app gets its own key, model list and limits. Tool calls go back to your app; OpenCode never runs them.

Documentation: **https://jjjermiah.github.io/opencode-plugboard**

## Install

```sh
bunx opencode-plugboard@latest init --fast anthropic/claude-haiku-4-5
```

This adds plugboard to your global OpenCode config (`~/.config/opencode/opencode.jsonc`), creates a key for one app, allows every model you are logged in to, and prints the key. Use a model you are logged in to; without `--fast`, call a model id from `GET /v1/models`. Restart OpenCode, then run `opencode api get /api/agent` once so it loads the plugin. To write the entry by hand instead:

```jsonc
{
  "plugins": [
    {
      "package": "opencode-plugboard@0.63.1",
      "options": {
        "keys": { "my-app": "{env:PLUGBOARD_KEY_MY_APP}" },
        "models": "all",
        "aliases": { "fast": "anthropic/claude-haiku-4-5" }
      }
    }
  ]
}
```

## First request

```sh
export PLUGBOARD_KEY=<the key init printed>
curl -s http://127.0.0.1:4010/v1/chat/completions \
  -H "Authorization: Bearer $PLUGBOARD_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model": "fast", "messages": [{"role": "user", "content": "reply with exactly: pong"}]}' \
  | jq -r '.choices[0].message.content'
```

Any SDK works the same way: set its base URL to `http://127.0.0.1:4010/v1` (Anthropic and Gemini SDKs: `http://127.0.0.1:4010`) and its API key to your plugboard key.

## What it serves

| API | Endpoints |
| --- | --- |
| OpenAI Chat Completions | `POST /v1/chat/completions` |
| OpenAI Responses | `POST /v1/responses`, `GET`/`DELETE /v1/responses/{id}`, `GET /v1/responses/{id}/input_items` |
| Anthropic Messages | `POST /v1/messages`, `POST /v1/messages/count_tokens` |
| Gemini | `POST /v1beta/models/{model}:generateContent`, `:streamGenerateContent`, `:countTokens` |
| Files | `/v1/files` (OpenAI and Anthropic), `/upload/v1beta/files` and `/v1beta/files` (Gemini) |
| Legacy completions | `POST /v1/completions` |
| Models | `GET /v1/models`, `GET /v1/models/{id}` |

Streaming, tool calls, structured output, images, PDFs and reasoning output work through the usual SDK calls.

## Works with

OpenAI, Anthropic and Google SDKs for Python, JavaScript, Go, .NET and Rust; LangChain, LlamaIndex, pydantic-ai, the Vercel AI SDK, CrewAI and other agent frameworks; Open WebUI, LibreChat, n8n, Dify and Home Assistant; Claude Code, Codex CLI, Gemini CLI, Aider, Cline, Continue and Zed. Setup for each: [client pages](https://jjjermiah.github.io/opencode-plugboard/clients/).

## Features

- [Per-app keys and rules](https://jjjermiah.github.io/opencode-plugboard/guides/apps-and-keys): each app has its own model scope, system prompt, endpoints and caps.
- [Aliases and fallbacks](https://jjjermiah.github.io/opencode-plugboard/guides/models-and-aliases): short model names, and chains that move to the next model when one fails.
- [Limits, budgets and caching](https://jjjermiah.github.io/opencode-plugboard/guides/limits-budgets-and-caching): concurrency, request rate, daily or monthly spend, and a response cache.
- [Tools, structured output, images and files](https://jjjermiah.github.io/opencode-plugboard/guides/tools-output-and-images).
- [History, usage and monitoring](https://jjjermiah.github.io/opencode-plugboard/guides/history-usage-and-monitoring): per-app usage, a dashboard, a TUI page and Prometheus metrics.
- [Serving other machines](https://jjjermiah.github.io/opencode-plugboard/guides/serving-other-machines) from an always-on OpenCode server.

Plugboard is 0.x: a minor release can change an option or a default. Read the [changelog](https://github.com/jjjermiah/opencode-plugboard/blob/main/CHANGELOG.md) before you move the pin.

## Project

[Security policy](https://github.com/jjjermiah/opencode-plugboard/blob/main/SECURITY.md) · [Contributing](https://github.com/jjjermiah/opencode-plugboard/blob/main/CONTRIBUTING.md) · [Changelog](https://github.com/jjjermiah/opencode-plugboard/blob/main/CHANGELOG.md)

MIT licensed. Not affiliated with or endorsed by OpenAI, Anthropic, Google, GitHub or Microsoft.
