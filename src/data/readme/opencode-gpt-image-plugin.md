# opencode-gpt-image-plugin

An [opencode](https://opencode.ai) plugin that adds **image generation** with
OpenAI's **GPT image** models through any OpenAI-compatible / CLIProxyAPI
endpoint.

It registers one tool your agents can call:

| Tool | Purpose | Models |
| --- | --- | --- |
| `gpt_image` | Still images | `gpt-image-2` (default), `gpt-image-1.5` |

The agent picks the specific model via the `model` argument, guided by per-model
hints baked into the tool schema, and can set `size`, `quality`, `background`,
and `output_format`.

> For adult/explicit image generation, use the companion
> [`opencode-grok-imagine-plugin`](https://github.com/caoool/opencode-grok-imagine-plugin);
> GPT image models refuse explicit content upstream.

## Why a plugin (and not model config)

opencode's model config only drives the chat/completions interface. GPT image
generation uses a different endpoint (`/v1/images/generations`) and returns
base64 image data to write to disk. A plugin tool is the supported way to reach
it and save results.

## Install

```bash
npm install -D opencode-gpt-image-plugin
```

Then reference it in `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-gpt-image-plugin"]
}
```

Restart opencode (plugins load at startup).

## Configure

Configuration is read from **plugin options first, then environment variables.**

### Option A — environment variables

```bash
export GPT_IMAGE_BASE_URL="https://your-proxy.example.com"   # or CPA_BASE_URL
export GPT_IMAGE_API_KEY="sk-..."                            # or CPA_API_KEY
# Only for self-signed LAN proxies (see TLS below):
# export GPT_IMAGE_INSECURE_TLS=1
```

`opencode.json`:

```json
{
  "plugin": ["opencode-gpt-image-plugin"]
}
```

### Option B — plugin options (tuple form)

```json
{
  "plugin": [
    ["opencode-gpt-image-plugin", {
      "baseURL": "https://your-proxy.example.com",
      "apiKey": "{env:MY_KEY}",
      "insecureTLS": false
    }]
  ]
}
```

### Config matrix

| Setting | Plugin option | Env var(s) | Default |
| --- | --- | --- | --- |
| Base URL | `baseURL` | `GPT_IMAGE_BASE_URL`, `CPA_BASE_URL` | — (required) |
| API key | `apiKey` | `GPT_IMAGE_API_KEY`, `CPA_API_KEY` | — (required) |
| Skip TLS verify | `insecureTLS` | `GPT_IMAGE_INSECURE_TLS` | `false` |

The base URL may include or omit a trailing `/v1`; the plugin normalizes it.

### TLS

TLS certificates are **verified by default**. Only disable verification for a
self-signed LAN proxy you control, via `insecureTLS: true` or
`GPT_IMAGE_INSECURE_TLS=1`.

## Usage

Just ask an agent:

- *"generate an image of a minimalist mountain logo on white"* → `gpt_image`
- *"make a 1024x1536 transparent-background icon of a rocket"* → `gpt_image`

### Where files are saved

- **Project assets** — pass `output_dir` (e.g. `assets/img`, `public/images`).
- **Scratch / experiments** — omit `output_dir`. Files go to a self-ignored
  `<project>/.gpt-tmp/` folder.

### `gpt_image` arguments

| Arg | Type | Notes |
| --- | --- | --- |
| `prompt` | string | required |
| `model` | enum | `gpt-image-2` \| `gpt-image-1.5` |
| `count` | 1–4 | number of images |
| `size` | enum | `auto`, `1024x1024`, `1536x1024`, `1024x1536` |
| `quality` | enum | `auto`, `low`, `medium`, `high` |
| `background` | enum | `auto`, `transparent`, `opaque` |
| `output_format` | enum | `png`, `jpeg`, `webp` |
| `output_dir` | string | asset path, or omit for scratch |

Depending on the upstream proxy, some parameters (notably exact `size`) may be
approximated rather than honored precisely.

## Response & endpoint

- `POST /v1/images/generations` → `{ data: [{ b64_json }], size, quality, ... }`

## Notes

- Model availability depends on your upstream account/proxy. The plugin surfaces
  the upstream error text when a model or parameter isn't available.
- Content policy is enforced upstream by OpenAI, independent of this plugin.

## License

MIT © Lu Cao
