# opencode-img

An OpenCode V2 plugin that generates and edits bitmap images through the OpenAI Image API. One tool, `gpt_imagegen`, takes a prompt and an output path, calls the API with your key, and writes one image to disk.

[![OpenCode V2 plugin](https://img.shields.io/badge/OpenCode-V2%20plugin-blue.svg)](https://opencode.ai/v2/docs/build/plugins)
[![npm version](https://img.shields.io/npm/v/opencode-img.svg)](https://www.npmjs.com/package/opencode-img)
[![CI](https://github.com/mattsafaii/opencode-img/actions/workflows/ci.yml/badge.svg)](https://github.com/mattsafaii/opencode-img/actions/workflows/ci.yml)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

Source: [github.com/mattsafaii/opencode-img](https://github.com/mattsafaii/opencode-img)

**Status:** early release.

## What it does

- **Generates and edits.** A prompt makes a new image; local `referenceImages` edit an existing one through the real `/v1/images/edits` multipart endpoint.
- **Never overwrites.** A taken output path gets the next version instead.
- **Your key, two ways.** The OpenCode connection from `/connect`, or `OPENAI_API_KEY`.
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

## Add your OpenAI API key

Connect OpenAI in OpenCode, or set `OPENAI_API_KEY`. When both are present, the environment variable wins.

1. **OpenCode connection (easiest).** Run `/connect`, choose OpenAI, and paste your key. The tool uses that connection with no further setup.
2. **Environment variable.** Set `OPENAI_API_KEY` in the environment of the OpenCode server before it starts. Use it for headless setups, or when your key lives in the OpenCode Console (BYOK), which plugins cannot read.

A missing key fails before any network request, and the error names both.

A key connected through the OpenCode Console (BYOK) stays in Console and is not available to plugins; set `OPENAI_API_KEY` in that case.

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
| `model` | no | OpenAI image model. Defaults to `gpt-image-1.5`. |
| `quality` | no | `auto`, `low`, `medium`, `high`, `standard`, `hd`, `xhigh`, or `max`. |
| `size` | no | `WIDTHxHEIGHT` (for example `1024x1024`) or `auto`. |
| `outputFormat` | no | `png`, `jpeg`, or `webp` for GPT image models. Inferred from the output path extension when omitted. |
| `referenceImages` | no | Local image paths. When present, the tool edits them through `/v1/images/edits`. |

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

opencode-img is an independent project. It is not made by, affiliated with, or endorsed by OpenAI or the OpenCode team. Using the OpenAI Image API is subject to OpenAI's terms and usage policies.

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
