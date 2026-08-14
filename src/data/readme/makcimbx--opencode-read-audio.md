# opencode-read-audio

OpenCode plugin that adds a `read_audio` tool for analyzing, describing, comparing, transcribing, or answering questions about local audio files with OpenRouter audio-capable chat models.

The MVP uses OpenRouter Chat Completions with raw base64 `input_audio` parts. It does not call direct audio URLs and does not use the transcription-only endpoint.

## Install

After publishing/installing from npm, add the package to your OpenCode config:

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
  "plugin": ["file:///absolute/path/to/opencode-read-audio/dist/index.js"]
}
```

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

Alternatively, configure the existing OpenCode `openrouter` provider:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "openrouter": {
      "options": {
        "apiKey": "<openrouter-api-key>",
        "model": "xiaomi/mimo-v2.5",
        "baseURL": "https://openrouter.ai/api/v1"
      }
    }
  }
}
```

Optional environment variables:

```sh
OPENROUTER_MODEL=xiaomi/mimo-v2.5
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
```

Defaults:

- Model: `xiaomi/mimo-v2.5`
- Base URL: `https://openrouter.ai/api/v1`

The plugin also looks for OpenCode auth/config values under the `openrouter` provider when available.

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
