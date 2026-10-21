# aiberm-auth

A magpie / OpenCode provider plugin for [Aiberm](https://aiberm.com). You sign in with one Aiberm API key, and each model is sent on its native API, so magpie converts a request only when the agent speaks a different API.

| Models | API | Endpoint |
| --- | --- | --- |
| Claude | Anthropic Messages | `https://aiberm.com/v1/messages` |
| Gemini | Gemini | `https://aiberm.com/v1beta/models/<id>:streamGenerateContent` |
| GPT | OpenAI Responses | `https://aiberm.com/v1/responses` |
| Others (DeepSeek, Grok, Qwen, Kimi…) | Chat Completions | `https://aiberm.com/v1/chat/completions` |

The API for each model is picked from the `supported_endpoint_types` field in Aiberm's `/v1/models`. Grok and DeepSeek stay on Chat Completions, because Aiberm doesn't serve Responses for them.

## Install

In magpie's window: Plugins → search `aiberm` → Install, then sign in with your Aiberm API key.

Or from the command line:

```sh
magpie plugin add aiberm-auth        # from npm
magpie plugin login aiberm           # asks for your own Aiberm API key
magpie provider test aiberm claude-opus-5-5
```

Each person signs in with their own key. The plugin holds no key; magpie keeps it on your machine.

Models are named `aiberm/<model>`, for example `aiberm/claude-opus-5-5`.

## What it does

- Sign-in: one API key, stored by magpie in `~/.config/magpie/plugin-auth.json` (mode 600).
- Models: read from the key's `/v1/models`. Embedding, image, speech and OCR models are left out. Context and output limits come from the vendors' published numbers, and Aiberm may cap below them.
- Reasoning levels: Claude `low…max`, GPT `none…xhigh`, Gemini `low/medium/high`, others `low/medium/high`.
- Usage: `magpie quota` shows what the key has spent (New API's `/api/usage/token/`).

## Tests

```sh
bun test
```
