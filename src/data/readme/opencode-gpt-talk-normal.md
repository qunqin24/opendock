# opencode-gpt-talk-normal

English | [中文](README-zh.md)

[OpenCode](https://opencode.ai) server plugin — automatically injects the [talk-normal](https://github.com/hexiecs/talk-normal) system prompt when using GPT models.

## What it does

When `model.id` or `model.modelID` contains `gpt` (case-insensitive), this plugin prepends the talk-normal prompt to the system message before it reaches the LLM. Non-GPT models are completely unaffected.

The prompt source is [talk-normal v0.6.1](https://github.com/hexiecs/talk-normal/blob/main/skill/prompt.md) by [hexiecs](https://github.com/hexiecs).

## Install

```bash
# via opencode CLI (recommended)
opencode plugin opencode-gpt-talk-normal

# or pnpm
pnpm add -D opencode-gpt-talk-normal

# or npm
npm install -D opencode-gpt-talk-normal
```

## Configure

Add to your `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-gpt-talk-normal"]
}
```

Or with a local path for development:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["/absolute/path/to/opencode-gpt-talk-normal"]
}
```

## Behavior

| Condition | Result |
|---|---|
| `model.id` contains `gpt` | talk-normal prompt prepended to `system[]` |
| model is Claude, Gemini, etc. | no change |
| prompt already injected | skipped (idempotent) |

## E2E verified

Tested against real `openai/gpt-5.4` through OpenCode's plugin hook (`experimental.chat.system.transform`). The captured request confirmed talk-normal appears as the first system message, while a control run with `claude-sonnet-4.6` showed no injection.

## Test

```bash
node --test
```

## License

MIT
