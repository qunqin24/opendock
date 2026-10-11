# opencode2-gpt-image

GPT Image generation and editing for **OpenCode 1.18.29+ and OpenCode 2** via
Sub2API, CLIProxyAPI, or another compatible Images API. Available on
[npm](https://www.npmjs.com/package/opencode2-gpt-image).

| Tool | Use it for |
| --- | --- |
| `gpt_image` | Generate images or edit reference images |
| `gpt_image_task` | Resume an existing Sub2API async image task |

## Install

Add the plugin with its API connection options to `opencode.json`:

**OpenCode 2** (`plugins`):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [{
    "package": "opencode2-gpt-image",
    "options": {
      "backend": "api",
      "baseURL": "https://your-proxy.example.com/v1",
      "apiKey": "your-key",
      "insecureTLS": false,
      "defaultModel": "gpt-image-2",
      "asyncMode": "sync",
      "taskTimeoutSeconds": 1800
    }
  }]
}
```

**OpenCode 1.18.29+** (`plugin`):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [["opencode2-gpt-image", {
    "backend": "api",
    "baseURL": "https://your-proxy.example.com/v1",
    "apiKey": "your-key",
    "insecureTLS": false,
    "defaultModel": "gpt-image-2",
    "asyncMode": "sync",
    "taskTimeoutSeconds": 1800
  }]]
}
```

## Configure

| Plugin option | Default | Description |
| --- | --- | --- |
| `baseURL` | Required | Proxy URL, with or without `/v1` |
| `apiKey` | Required | Proxy API key |
| `insecureTLS` | `false` | Disable certificate verification for this plugin's API requests |
| `backend` | `"api"` | `"api"` for proxies; `"codex"` for experimental subscription use |
| `defaultModel` | `"gpt-image-2"` | Default OpenAI image model ID |
| `asyncMode` | `"sync"` | Set `"sub2api"` to submit and poll Sub2API tasks; not a tool argument |
| `taskTimeoutSeconds` | `1800` | Async polling timeout (1–1800 seconds) |

Options take precedence over the corresponding `GPT_IMAGE_*` environment
variables; `CPA_BASE_URL` and `CPA_API_KEY` are also supported as fallbacks.
The tool argument `model` overrides `defaultModel`. Only plugin configuration
can select async mode and its submission timeout. `insecureTLS` works under
Node and Bun without changing TLS settings for other plugins.

## Usage

Ask the agent to generate an image, or edit one using a reference file:

> Generate a blue origami crane with `gpt_image`, save it under `assets/img`.
>
> Use `gpt_image` with `images: ["assets/img/crane.png"]` to change the background.

`gpt_image` requires a `prompt`. Optional arguments:

| Argument | Accepted values |
| --- | --- |
| `model` | An [official OpenAI image model ID](https://developers.openai.com/api/reference/resources/images/methods/generate); default `defaultModel` |
| `count` | Request 1–4 images in one call; actual count may vary by backend |
| `size` | `auto` or `WIDTHxHEIGHT` |
| `quality` | `auto`, `low`, `medium`, `high`; `xhigh` and `max` for GPT Image 2.5 models |
| `background` | `auto`, `opaque`, `transparent` |
| `output_format` | `png`, `jpeg`, `webp` |
| `images` | 1–16 reference images: local paths, `file://`, PNG/JPEG/WebP data URLs, or HTTP(S) URLs |
| `mask` | Optional local PNG path, `file://` URI, or PNG data URL; requires `images` |
| `output_dir` | Absolute or session-relative path; default `.gpt-tmp/` (self-gitignored) |

Model availability and supported options depend on the proxy. The plugin
passes official model IDs unchanged and saves images in their returned format.

### Sub2API async tasks

Set `asyncMode: "sub2api"` in plugin options; the agent cannot change it per
request. Sub2API must have async image tasks enabled; otherwise it returns
404. This mode is not for CLIProxyAPI or direct Codex. OpenCode's tool
description and progress identify the configured mode. After acceptance, the
task ID appears in progress and in the completed result. If polling stops,
**do not submit the image again**: call `gpt_image_task` with the returned
`task_id` to resume. That tool also accepts `output_dir` and `timeout_seconds`.

### Experimental Codex backend

Set `backend: "codex"` to use your OpenCode ChatGPT OAuth connection instead of
the proxy. Best effort: currently only `gpt-image-2`, PNG output, and a plugin
limit of five reference images; no masks or async tasks. The plugin sends `count` (1–4),
`size`, `quality` (`auto`, `low`, `medium`, `high`), and background (including
`transparent`) to Codex. The backend may return a different count, size or
quality; the tool reports mismatches when detectable. Proxy requests never
fall back to Codex.

## Development

This project uses pnpm. Run `pnpm install`, `pnpm typecheck`, `pnpm test`, and
`pnpm build` to validate a local checkout.

## License

MIT licensed. See [LICENSE](LICENSE).
