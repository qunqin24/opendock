# opencode-openai-codex-headers

[![npm](https://img.shields.io/npm/v/opencode-openai-codex-headers)](https://www.npmjs.com/package/opencode-openai-codex-headers)

An [opencode](https://opencode.ai) plugin for ChatGPT Plus/Pro users on the Codex
backend. It smooths over the rough edges in opencode's OpenAI/Codex integration for
the GPT-5.6 models (Sol, Terra, Luna) until native support lands upstream.

## What it fixes

- **Luna 404s.** GPT-5.6 Luna models return `404 Model not found`. The Codex backend
  gates them on the client identity, and opencode identifies as `opencode` rather
  than the Codex CLI. The plugin restores the genuine Codex signature so Luna is
  served, and keeps Terra in the Codex priority tier so it stops load-shedding with
  `server_is_overloaded` under contention.
- **Missing session names.** opencode's title agent runs on a Luna model, so the
  same 404 leaves every session stuck on its default `New session - <timestamp>`
  name. Recovering Luna fixes the titles.
- **Reasoning-summary markers.** GPT-5.6 ends each reasoning summary with an empty
  `<!-- -->` comment that opencode's TUI renders literally under the "Thought"
  headline. The plugin strips it on the wire so only the headline remains.

## Install

**Via the opencode CLI** (`-g` writes it to your global config; drop it for the
current project):

```bash
opencode plugin opencode-openai-codex-headers -g
```

**Manual**: add it to the `plugin` array in your `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-openai-codex-headers"]
}
```

## How it works

**Identity.** A `chat.headers` hook overwrites `originator` and `User-Agent` on the
`openai` provider only, so requests present the genuine Codex CLI signature (the
backend requires both). It loads after opencode's internal hooks and runs against
the same shared output, so it wins; every other provider is untouched.

**Reasoning cleanup.** opencode exposes no hook to transform reasoning text, so the
plugin rewrites the summary events on the wire, on both the HTTP/SSE path and
opencode's experimental WebSocket transport. It touches only reasoning delta events
on `/responses` endpoints (host-agnostic, so it also works through a proxy or custom
`baseURL`); everything else passes through unchanged.

## License

MIT
