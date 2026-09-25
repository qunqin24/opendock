# opencode-img

An OpenCode V2 plugin that generates and edits bitmap images through OpenAI, Gemini, and xAI image APIs. One tool, `gpt_imagegen`, takes a prompt and an output path, calls the API with your key, and writes one image to disk.

[![OpenCode V2 plugin](https://img.shields.io/badge/OpenCode-V2%20plugin-blue.svg)](https://opencode.ai/v2/docs/build/plugins)
[![npm version](https://img.shields.io/npm/v/opencode-img.svg)](https://www.npmjs.com/package/opencode-img)
[![CI](https://github.com/mattsafaii/opencode-img/actions/workflows/ci.yml/badge.svg)](https://github.com/mattsafaii/opencode-img/actions/workflows/ci.yml)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

Source: [github.com/mattsafaii/opencode-img](https://github.com/mattsafaii/opencode-img)

**Status:** early release.

## What it does

- **Generates and edits.** A prompt makes a new image; local `referenceImages` edit an existing one.
- **Three providers.** `openai` (default), `gemini` (Nano Banana), and `grok` (Grok Imagine), selectable per call.
- **Never overwrites.** A taken output path gets the next version instead.
- **No SDK.** Native `fetch`, `FormData`, and `Blob` only.

## Install

OpenCode installs the package on next launch, so there is no separate install step. Add it with the CLI:

```sh
opencode plugin add opencode-img
```

Or add it to `opencode.json`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-img"]
}
```

## Plugin options

Set call defaults in `opencode.json` with the object form:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "opencode-img",
      "options": {
        "provider": "gemini",
        "models": {
          "openai": "gpt-image-1.5",
          "gemini": "gemini-3.1-flash-image",
          "grok": "grok-imagine-image-2.0"
        }
      }
    }
  ]
}
```

- `provider` — used when a call does not name one. Defaults to `openai`.
- `models` — per-provider default model. Each provider falls back to its built-in default.

A call can still pass `provider` or `model` to override either.

## Providers

| `provider` | Default model | Key |
| --- | --- | --- |
| `openai` (default) | `gpt-image-1.5` | `OPENAI_API_KEY`, or the OpenAI connection from `/connect` |
| `gemini` | `gemini-3.1-flash-image` (Nano Banana 2) | `GEMINI_API_KEY` (or `GOOGLE_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`), or the Google connection from `/connect` |
| `grok` | `grok-imagine-image-2.0` (Grok Imagine) | `XAI_API_KEY`, or the xAI connection from `/connect` |

Pass `provider` to pick one.

## Add your API key

Set the environment variable for the provider you use, or connect it in OpenCode. When both are present, the environment variable wins.

- **OpenAI:** `OPENAI_API_KEY`, or `/connect` → OpenAI.
- **Gemini:** `GEMINI_API_KEY`, or `/connect` → Google.
- **Grok:** `XAI_API_KEY`, or `/connect` → xAI.

Use the environment variable for headless setups, or when your key lives in the OpenCode Console (BYOK), which plugins cannot read.

A missing key fails before any network request, and the error names the provider's variables and integration.

## Use

Ask the agent for what you want, and it calls `gpt_imagegen`:

```text
Generate a 1024x1024 image of a red square on a white background and save it to assets/square.png.
```

### Tool arguments

| Argument | Required | Description |
| --- | --- | --- |
| `prompt` | yes | What to generate, or the edit to make. |
| `outputPath` | yes | Where to save the image. Relative paths resolve against the session directory. |
| `provider` | no | `openai` (default), `gemini`, or `grok`. |
| `model` | no | Image model. Defaults to the provider's default. |
| `quality` | no | `auto`, `low`, `medium`, `high`, `standard`, `hd`, `xhigh`, or `max` (OpenAI); `auto`, `low`, or `medium` (Grok). |
| `size` | no | `WIDTHxHEIGHT` (for example `1024x1024`) or `auto` (OpenAI only). |
| `outputFormat` | no | `png`, `jpeg`, or `webp` (OpenAI); `png` or `jpeg` (Gemini). Inferred from the output path extension when omitted. |
| `referenceImages` | no | Local image paths. When present, the tool edits them. |

## Worked examples

Each image below is a real output of this plugin.

### Edit an existing image

Pass local paths in `referenceImages` and the tool edits them.

```text
Take assets/example-generate.png, change the coffee cup to a teacup, and add a spoon on the saucer. Save it to assets/example-edit.png.
```

![A teacup edited from the coffee-cup reference](./assets/example-edit.png)

### Generate from a prompt

```text
Generate a flat vector illustration of a steaming coffee cup on a saucer, two-tone, centered on a plain white background, and save it to assets/example-generate.png.
```

![A generated flat illustration of a coffee cup](./assets/example-generate.png)

### Run the same path twice

The first file is left untouched; the new image lands at `example-generate-1.png`.

```text
Now do the same path, but a slice of cake on a plate instead.
```

![The second image, written to the versioned path](./assets/example-generate-1.png)

## Output

- One image per request.
- An existing file is never replaced: `image.png` becomes `image-1.png`, then `image-2.png`.
- An explicit `outputFormat` must match a known image extension on the path; a conflict is rejected.
- A failure — a missing key, an unreadable reference image, an API error, or a cancellation — stops before the write, so no file is created.
- The tool returns the saved path plus metadata: model, MIME type, byte count, and the settings used.

## Disclaimer

opencode-img is an independent project. It is not made by, affiliated with, or endorsed by any provider it supports or the OpenCode team. Calls to a provider's API are subject to that provider's terms and usage policies.

## Development

```sh
pnpm install
pnpm test
pnpm typecheck
pnpm build
```

Built and tested on Node 24. OpenCode runs the plugin in its bundled Bun runtime.

To load a local build in OpenCode, point `plugins` at the package's `dist` directory (a configured plugin path must be a directory containing an entry file):

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["/absolute/path/to/opencode-img/dist"]
}
```

Publish with `pnpm publish`, or push a `v*` tag to publish through `.github/workflows/publish.yml`. The workflow uses npm trusted publishing (OIDC), so it needs no token — only a trusted publisher configured for the repository on npmjs.com.

The provider boundary stays internal so another image service can be added later without a public plugin registry.
