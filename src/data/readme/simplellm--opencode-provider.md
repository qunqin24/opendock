# @simplellm/opencode-provider

[![npm](https://img.shields.io/npm/v/@simplellm/opencode-provider.svg)](https://www.npmjs.com/package/@simplellm/opencode-provider)
[![CI](https://github.com/SimpleLLM/opencode-provider/actions/workflows/ci.yml/badge.svg)](https://github.com/SimpleLLM/opencode-provider/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

Use [SimpleLLM](https://simplellm.eu) — EU-hosted, DSGVO-compliant LLM inference — as a model provider in [OpenCode](https://opencode.ai). One command sets everything up.

SimpleLLM exposes an OpenAI-compatible API, so this package wires it into OpenCode via `@ai-sdk/openai-compatible`. It also ships a small plugin that shows your remaining credit balance when an OpenCode session starts.

## Quick start

```bash
npx @simplellm/opencode-provider
```

The setup wizard:

1. Connects to SimpleLLM and fetches the available models
2. Asks for your API key and validates it (shows your SC balance)
3. Writes the OpenCode provider config (`~/.config/opencode/opencode.json`)
4. Stores your API key (`~/.local/share/opencode/auth.json`)

Then start OpenCode with a SimpleLLM model:

```bash
opencode --model simplellm/Qwen3-Coder-30B-A3B-Instruct
```

Re-run the command any time models or your URL change — it **merges** into your existing OpenCode config without overwriting other providers.

## What it does

- **Setup CLI** — interactive, idempotent configuration of OpenCode
- **Plugin** — shows your credit balance (`SC`) on session start, warns when low or unconfigured
- **Model discovery** — pulls the live model list (context window, pricing) from SimpleLLM

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `SIMPLELLM_BASE_URL` | `https://api.simplellm.eu` | Point at a self-hosted or local SimpleLLM instance |
| `SIMPLELLM_API_KEY` | — | Read by the plugin if set; overrides the stored key |

Get an API key at [simplellm.eu](https://simplellm.eu).

## Using the plugin programmatically

```ts
import { SimpleLLMPlugin, discoverModels } from '@simplellm/opencode-provider'
```

`SimpleLLMPlugin` is an OpenCode plugin factory; `discoverModels()` fetches the current model list from a SimpleLLM instance.

## Development

Requires Node.js 20+.

```bash
git clone https://github.com/SimpleLLM/opencode-provider.git
cd opencode-provider
npm install
npm run build      # tsc → dist/
```

## Related

- [@simplellm/openclaw-provider](https://github.com/SimpleLLM/openclaw-provider) — the same, for [OpenClaw](https://github.com/openclaw/openclaw)

## License

MIT — see [LICENSE](./LICENSE).
