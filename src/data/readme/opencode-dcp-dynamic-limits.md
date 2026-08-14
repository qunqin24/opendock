# opencode-dcp-dynamic-limits

[![npm version](https://img.shields.io/npm/v/opencode-dcp-dynamic-limits)](https://www.npmjs.com/package/opencode-dcp-dynamic-limits)
[![backend: llm-server](https://img.shields.io/badge/backend-llm--server-blue)](https://github.com/raketenkater/llm-server)
[![license: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)

OpenCode plugin for one specific annoyance: DCP should follow the context window of the model you are actually using.

I wrote this for my local [llm-server](https://github.com/raketenkater/llm-server) setup, where OpenCode switches between GGUF models served by `ik_llama.cpp` / `llama.cpp` and normal cloud models. When the active model changes, DCP can be left with stale limits. That is when it starts pruning at the wrong time, or worse, keeps dropping `dcp-system-reminder` messages into the chat.

This plugin runs on real chat requests, figures out the active model context, and updates the DCP config before DCP needs it.

## Install

```sh
npm install -g opencode-dcp-dynamic-limits
```

Add it after DCP in your OpenCode config:

```json
{
  "plugin": [
    "@tarquinen/opencode-dcp@latest",
    "opencode-dcp-dynamic-limits"
  ]
}
```

DCP needs to load first. This plugin only adjusts DCP's config.

## llm-server

The main target is `llm-server`:

```sh
llm-server model.gguf --port 8081 --ctx-size 262144
```

Point OpenCode at that local OpenAI-compatible endpoint as usual. The plugin will read the active provider/model and, for llama.cpp-style backends, use the running server's context instead of guessing from a static number.

It also works with plain llama.cpp-style servers, Ollama-style local providers, and cloud models from the OpenCode model manifest.

## What It Changes

The plugin writes both common DCP config files when they exist:

```text
~/.config/opencode/dcp.jsonc
~/.opencode/dcp.jsonc
```

It updates:

- `activeModel`
- `minContextLimit`
- `maxContextLimit`
- notification/nudge settings that keep reminders out of the chat

It ignores non-chat calls like the `title` agent, so a title-generation request cannot shrink your DCP limits.

## Context Rules

For local llama.cpp-style servers:

- prefer runtime `--ctx-size`
- fall back to `/v1/models` metadata
- treat `--parallel` slot size as diagnostics, not the full context window

For cloud models:

- use OpenCode's model manifest context

The DCP limit is set to 85% of the detected context. Quiet mode sets `minContextLimit` equal to `maxContextLimit`, which avoids the repeated soft-warning zone while still letting DCP prune at the hard limit.

The quiet settings are:

```json
{
  "pruneNotificationType": "toast",
  "compress": {
    "nudgeForce": "soft",
    "nudgeFrequency": 50,
    "iterationNudgeThreshold": 50
  }
}
```

## Development

```sh
npm install
npm test
npm pack
```

## License

MIT
