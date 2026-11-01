# @dougbots/opencode-image-loader

Image-to-base64 tool for opencode — lets image-capable models see local image files from the filesystem.

> **OpenCode reads images natively now.** The built-in `read` tool returns PNG, JPEG, GIF and WebP as attachments (sniffed by content, resized to your `media.image` limits), and prompts can carry images via `@path`, paste/drag, or `opencode run -f`. Try that first.
>
> Install this only when `read` refuses with `Cannot read "x.png" (this model does not support image input)` — that happens for hand-declared models that models.dev does not know about, because those never get `capabilities.input.image` set. Everything this package does, `read` does better whenever the model is detected.

## What it does

Registers an `image_to_base64` tool that:

- Reads an image file from disk (png, jpg, gif, webp, svg, bmp, tiff)
- Converts it to a base64 data URL with the correct MIME type
- Returns the image as a file attachment that vision-capable models can process

Unlike `read`, it applies no size or dimension limits and does not resize, so oversized images reach the provider unchanged and may be rejected there.

## Install

```bash
npm install -g @dougbots/opencode-image-loader
```

Then add to your `opencode.json` plugins array:

```json
{
  "plugins": [
    "@dougbots/opencode-image-loader"
  ]
}
```

Works with OpenCode 1 (1.18.29+) and OpenCode 2 from the same package: OpenCode 2 reads the `image-loader` definition (`id` + `setup`), OpenCode 1 calls `server()`.

## Usage

Once installed, the `image_to_base64` tool is available in your opencode sessions. Pass it a file path and it returns the image as a base64-encoded data URL:

```
image_to_base64(filePath: "/path/to/image.png")
```

Supported formats: png, jpg, jpeg, gif, webp, svg, bmp, tiff.

## Response

The tool returns:

- A text confirmation of the conversion
- A file attachment with the base64 data URL and MIME type
- Metadata (`mimeType`, `fileSize`, `path`)

## Dependencies

Neither peer is installed with the package: opencode supplies them to plugins at runtime.

- **@opencode-ai/plugin** — the OpenCode 1 plugin runtime and `tool()` helper
- **@opencode/plugin** — the OpenCode 2 plugin API, loaded only when the host provides it
