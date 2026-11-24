# opencode-eyesight-v2

OpenCode plugin that lets **text-only models** work with pasted images by sending
each image through a vision-capable model first, then replacing the image with a
text description.

Ported to the **OpenCode V2 plugin API** (`@opencode/plugin`).

## Installation

```bash
npm install -g opencode-eyesight-v2
```

or with OpenCode:

```bash
opencode plugin add opencode-eyesight-v2
```

Add the plugin to your OpenCode config with a vision-capable model:

```jsonc
{
  "plugin": [
    ["opencode-eyesight-v2", { "model": "Provider/Model" }]
  ]
}
```

Example (free model):

```jsonc
{
  "plugin": [
    ["opencode-eyesight-v2", { "model": "opencode/longcat-2.5-free" }]
  ]
}
```

Or set the environment variable `OPENCODE_VISION_FALLBACK_MODEL`.

## Options

| Option | Required | Description |
| --- | --- | --- |
| `model` | Yes* | Vision-capable model in `ProviderID/ModelID` format. |
| `prompt` | No | Inline prompt for the vision model. |
| `promptFile` | No | Markdown file with the vision prompt. |

\* Can be supplied via `OPENCODE_VISION_FALLBACK_MODEL`.

## Behavior

- If the active model supports image input, the image is left untouched.
- If the active model is text-only, each image is described by the configured
  vision model and replaced with a `[Vision model description ...]` block.
- A `<vision_fallback>` notice is added to the system prompt of text-only models.
- Images are cached per session to avoid repeated descriptions.

## License

MIT
