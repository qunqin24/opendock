# opencode-key-model-router

OpenCode plugin: include a short `sigil` + key anywhere in a user message to pick which `provider/model` OpenCode should use for that turn. The tag is removed before the text is sent to the model. The chosen model is remembered for the rest of the session until you use `@reset` or change the key again.

This plugin does not ship model defaults. Configure every model key explicitly for the providers and models available in your OpenCode setup.

## Install

**From the published package** (after you publish to npm, or with `bun add` to a monorepo):

Add to `opencode.json`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    [
      "opencode-key-model-router",
      {
        "sigil": "@",
        "debug": false,
        "keys": {
          "fast": "cerebral/glm-4.5",
          "deep": "anthropic/claude-opus-4-5-20250929",
          "gpt": "openai/gpt-4o"
        }
      }
    ]
  ]
}
```

`plugin` accepts either a string package name, or a tuple `["name", { options }]` (see the OpenCode v2 `Config` type: `plugin` is an array of `string | [string, object]`). Options are passed as the second argument to the plugin.

**From a local build** while developing this repo:

```jsonc
{
  "plugin": [
    [
      "file:///absolute/path/to/opencode-key-model-router/dist/index.js",
      { "debug": true }
    ]
  ]
}
```

Use an absolute `file://` URL. Restart OpenCode after changing the config.

## Usage

- `@fast explain what a PRNG is` — use the `fast` model, strip the tag, keep using it on later turns.
- `Explain what a PRNG is @fast` — same behavior; keys can appear at the start, middle, or end of a text message.
- `Just the question, no prefix` — if you already chose a key earlier in the session, the same model is applied again (no need to repeat `@fast` every time).
- `@deep refactor this module` — switch to the `deep` model for the session.
- `@reset` — clear the sticky choice for this session; the next turn follows OpenCode’s default model again. The word `@reset` is stripped from the message.

Keys must be at least 2 characters, `[a-zA-Z0-9_]{2,32}` immediately after the sigil. The plugin scans text parts in order and uses the first configured key it finds.

## Built-in keys

- **`reset`**: always recognized (no need to add it to `keys`). Clears in-memory session routing and restores the default model for that message.
- All model-switching names come only from your `keys` object.

## Develop

```bash
bun install
bun run build   # emits dist/
bun test
```

## License

MIT
