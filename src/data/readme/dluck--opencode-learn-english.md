# opencode English Learning Plugin

A non-intrusive opencode plugin that helps Chinese-speaking developers improve their English while coding. The plugin injects an English tutor instruction into the system prompt, so the main LLM appends a short tips block at the end of its own replies — no background analysis, no separate API calls, no toast queue.

## How It Works

The plugin hooks into `experimental.chat.system.transform` and appends a structured "English Learning Tips" instruction to the system prompt. During real user turns (not title generation or compaction), the LLM is asked to:

1. **Input Correction** — If the user wrote in English with grammar errors or unidiomatic phrasing, show a `Prompt:` section with the verbatim awkward phrase → a natural rewrite.
2. **Vocabulary / Phrase Tips** — Surface 2–3 notable English expressions from the AI's own reply with plain-English definitions.

Both features are **veto-powered**: if there's nothing worth teaching, the LLM omits the block entirely. The tips block is always in English, regardless of the conversation language.

## Install

Add the plugin to your `opencode.json`:

```json
{
  "plugin": ["@dluck/opencode-learn-english"]
}
```

Or install locally for development:

```json
{
  "plugin": ["file:///abs/path/to/opencode-learn-english-plugin"]
}
```

> **Note:** The `publishConfig.access` is set to `"public"` so the scoped package can be installed without a paid npm account.

## Configuration

Optional plugin-specific config under `experimental.english_learn`:

```json
{
  "experimental": {
    "english_learn": {
      "enabled": true
    }
  }
}
```

| Key | Default | Description |
|---|---|---|
| `enabled` | `true` | Master switch for the entire plugin |

## Design Principles

- **Non-intrusive**: Never modifies conversation history, prompt parts, or LLM behavior beyond the system-prompt injection
- **Veto-powered**: The LLM explicitly returns nothing when there's nothing worth teaching
- **Zero infrastructure**: No background model calls, no separate credentials, no toast queue — the main LLM does all the work
- **Error-safe**: All plugin errors route to OS notifications, never to opencode toasts; hook handlers catch all exceptions

## Requirements

- opencode with plugin support
- Bun runtime

## Development

```bash
bun install        # install dependencies
bun run build      # compile to dist/
bun test           # run tests
```
