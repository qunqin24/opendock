# @lifangjin/opencode-session-title-plugin

[![npm version](https://img.shields.io/npm/v/@lifangjin/opencode-session-title-plugin.svg)](https://www.npmjs.com/package/@lifangjin/opencode-session-title-plugin)

English | [简体中文](./README.zh-CN.md)

Filter irrelevant system-prompt injections from opencode session title generation to save tokens.

## Why

Every new opencode session triggers a background LLM call that generates a short title. The call uses opencode's built-in `title` agent, whose prompt is a fixed ~2KB string ending in `</examples>`:

```
You are a title generator. You output ONLY a thread title. Nothing else.
...
```

Other plugins (`@cortexkit/opencode-magic-context`, `oh-my-opencode-slim`, project `AGENTS.md`, skill guidance, MCP instructions, ...) hook `experimental.chat.system.transform` and append project memory, session history, skill listings, and other context to **every** LLM call - including title generation. That context is useless for producing a 50-character title and wastes thousands of tokens on every new session.

This plugin detects title-generation calls and strips the system prompt back to just `PROMPT_TITLE`, so the small model only sees what it actually needs.

## How it works

The plugin hooks `experimental.chat.system.transform`:

1. **Detection**: When any system string contains the full sentence `"You are a title generator. You output ONLY a thread title. Nothing else."` (the first line of opencode's `PROMPT_TITLE`), the hook identifies this as a title-generation call. The full sentence is required — shorter markers like `"You are a title generator"` match cross-references in other agents' system prompts and cause false positives.

2. **Extraction**: The hook extracts the pure `PROMPT_TITLE` from the matched system entry — everything from `TITLE_MARKER` to `</examples>` (inclusive). Content prepended by other plugins (orchestrator prompts, project memory, etc.) is discarded.

3. **Mutation**: The system array is replaced in-place with `[pureTitle]` (mutation-mode hook).

4. **Toast**: Token savings are calculated immediately (`originalTokens - filteredTokens`) and a TUI toast is shown instantly — no polling, no waiting for the title to be generated.

Detection is content-based because `experimental.chat.system.transform` receives `{ sessionID, model }` (no agent name). The title agent's prompt is a constant in opencode core (`packages/core/src/plugin/agent.ts`), so the marker is stable.

> **Note**: `experimental.chat.messages.transform` is **not** used. That hook only fires in `SessionPrompt.run` and `SessionCompaction.process`, not in `LLM.run` / `ensureTitle` — so it never executes for title-generation calls.

## Install

### As a published package

```jsonc
// ~/.config/opencode/opencode.json
{
  "plugin": [
    "@lifangjin/opencode-session-title-plugin@latest"
  ]
}
```

### With options

```jsonc
{
  "plugin": [
    ["@lifangjin/opencode-session-title-plugin@latest", { "debug": true }]
  ]
}
```

### From source (local dev)

```jsonc
{
  "plugin": [
    ["/path/to/opencode-session-title-plugin", { "debug": true }]
  ]
}
```

Build: `bun install && bun run build`

## Options

| Option     | Type      | Default | Description                                                                             |
| ---------- | --------- | ------- | --------------------------------------------------------------------------------------- |
| `debug`    | `boolean` | `false` | Write detection/filtering details to `~/.local/share/opencode/log/session-title-filter.log` and stderr. Also dumps full system entries to timestamped `.txt` files (max 10 retained). |
| `enabled`  | `boolean` | `true`  | Master switch. Set `false` to detect-only (no mutation).                                |
| `notify`   | `boolean` | `true`  | Show a TUI toast immediately after calculating token savings.                           |

### Toast

When `notify` is on (default), the plugin shows a toast immediately after filtering — no polling, no delay:

```
Session title filter
Title call saved 3018 tokens
```

Token savings are calculated with [gpt-tokenizer](https://github.com/niieani/gpt-tokenizer): the hook's `model` field selects the encoding (cl100k_base for GPT-4/3.5, o200k_base for GPT-4o/o1/o3), giving exact counts for OpenAI models and a close approximation (±5%) for other providers. Duplicate toasts from LLM retries are suppressed for 60 seconds per session.

## Using a cheaper model for title generation

This plugin only filters the system prompt. Which model opencode calls for title generation is controlled by opencode itself.

opencode's title-agent model priority (source: `SessionPrompt.ensureTitle` in `packages/opencode/src/session/prompt.ts`):

1. `agent.title.model` - set on the built-in `title` agent via config (highest priority)
2. `small_model` - global lightweight model config
3. main session model - the fallback (most expensive)

To pin a cheap model for title generation only, add it to `opencode.json`:

```jsonc
{
  "agent": {
    "title": {
      "model": "aimatespace/sensenova-deepseek-v4-flash"
    }
  }
}
```

This pairs naturally with this plugin: the cheap model sees only `PROMPT_TITLE` (plugin strips the rest), so token cost per title drops to near zero.

## Verification

Start a new opencode session. With `debug: true`, check the log file at `~/.local/share/opencode/log/session-title-filter.log`:

```
[session-title-filter] plugin v0.0.4 loaded, enabled: true notify: true
[session-title-filter]   system[0]: len=16973 head="..." tail="...</examples>\n"
[session-title-filter] title call: model: sensenova-deepseek-v4-flash entries: 1 titleIndex: 0 originalText.len: 16973 originalTokens: 3521
[session-title-filter] filtered: pureTitle.len: 2095 pureTitle.head: "You are a title generator. You output ONLY..." filteredTokens: 503 savedTokens: 3018
[session-title-filter] notify: toast shown, savedTokens: 3018
```

`filteredTokens` should be around 500 (the size of `PROMPT_TITLE`). If it is much larger, other plugins are still injecting into the same system string — open an issue with the log output.

## Compatibility

- opencode with `@opencode-ai/plugin` >= 1.4.0
- Hook used: `experimental.chat.system.transform` only
- The detection marker (`"You are a title generator. You output ONLY a thread title. Nothing else."`) is tied to opencode's built-in `PROMPT_TITLE`. If opencode changes the title-agent prompt, update `TITLE_MARKER` in `src/index.ts`.

## License

MIT
