# opencode-read-audio

OpenCode plugin that adds a `read_audio` tool for analyzing, describing, comparing, transcribing, or answering questions about local audio files with OpenRouter audio-capable chat models.

The MVP uses OpenRouter Chat Completions with raw base64 `input_audio` parts. It does not call direct audio URLs and does not use the transcription-only endpoint.

## Install

Supports OpenCode 1.x (1.18.33 or newer) and OpenCode 2.x (2.0.26 or newer). The same package exports both the V1 `server()` and V2 `setup()` entrypoints.

For OpenCode 2.x, add the package to `plugins` in your OpenCode config:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["@makcimbx/opencode-read-audio"]
}
```

For OpenCode 1.x, use the singular `plugin` key instead:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@makcimbx/opencode-read-audio"]
}
```

For local development, build the package and use an absolute file URL to `dist/index.js` instead:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["file:///absolute/path/to/opencode-read-audio/dist/index.js"]
}
```

Use `plugin` instead of `plugins` for local development on OpenCode 1.x.

Then quit and restart OpenCode. Plugin/config changes are loaded only at startup.

## Build

```sh
bun install
bun run build
```

## Authentication

Set an OpenRouter API key:

```sh
OPENROUTER_API_KEY=<openrouter-api-key>
```

In OpenCode 2.x, you can also run `/connect` and choose OpenRouter. The plugin resolves the active connection on each call, so account changes are picked up automatically. Provider settings are read through OpenCode's API, including project configuration.

To configure an API key or endpoint directly in OpenCode 2.x:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "providers": {
    "openrouter": {
      "settings": {
        "apiKey": "<openrouter-api-key>",
        "baseURL": "https://openrouter.ai/api/v1"
      }
    }
  }
}
```

In OpenCode 1.x, configure the existing `openrouter` provider:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "openrouter": {
      "options": {
        "apiKey": "<openrouter-api-key>",
        "model": "xiaomi/mimo-v2.6-flash",
        "baseURL": "https://openrouter.ai/api/v1"
      }
    }
  }
}
```

Optional environment variables:

```sh
OPENROUTER_MODEL=xiaomi/mimo-v2.6-flash
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
```

Defaults:

- Model: `xiaomi/mimo-v2.6-flash` (audio input, text output)
- Base URL: `https://openrouter.ai/api/v1`

Environment variables take precedence over OpenCode credentials and provider settings; the tool's `model` argument takes precedence over `OPENROUTER_MODEL`. On OpenCode 1.x, the plugin reads the legacy auth file and global `provider.openrouter.options` configuration.

Both versions return the answer with file/model metadata and pass tool cancellation to the OpenRouter request.

## Tool

Tool name: `read_audio`

Arguments:

- `files`: one or more local audio file paths, relative to the OpenCode project directory unless absolute.
- `prompt`: what to do with the audio files.
- `model`: optional OpenRouter model override for this call.

Example:

```ts
read_audio({
  files: ["recordings/interview.wav", "recordings/noisy-take.mp3"],
  prompt: "Compare these recordings and summarize speech clarity, background noise, and notable differences.",
})
```

Supported input formats: `wav`, `mp3`, `flac`, `m4a`, `ogg`, `webm`, `aac`.

Model capabilities, accepted audio duration/size, and pricing are controlled by OpenRouter and the selected model/provider.
