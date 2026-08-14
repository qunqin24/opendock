# @dougbots/opencode-image-loader

Image-to-base64 tool for opencode — lets image-capable models see local image files from the filesystem.

## What it does

Registers an `image_to_base64` tool that:

- Reads an image file from disk (png, jpg, gif, webp, svg, bmp, tiff)
- Converts it to a base64 data URL with the correct MIME type
- Returns the image as a file attachment that vision-capable models can process

## Install

```bash
npm install -g @dougbots/opencode-image-loader
```

Then add to your `opencode.json` plugins array:

```json
{
  "plugin": [
    "@dougbots/opencode-image-loader"
  ]
}
```

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

- **@opencode-ai/plugin** — the opencode plugin runtime
