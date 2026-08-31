# opencode-dashscope-imagegen

> Text-to-image generation for [OpenCode](https://opencode.ai) via **Alibaba DashScope** —
> `qwen-image-2.0`, `qwen-image-3.0` and `wan2.7-image` exposed as an `image_generate` tool
> your coding agent can call.

[![npm version](https://img.shields.io/npm/v/opencode-dashscope-imagegen)](https://www.npmjs.com/package/opencode-dashscope-imagegen)
[![npm downloads](https://img.shields.io/npm/dm/opencode-dashscope-imagegen)](https://www.npmjs.com/package/opencode-dashscope-imagegen)
[![license](https://img.shields.io/npm/l/opencode-dashscope-imagegen)](LICENSE)
[![OpenCode plugin](https://img.shields.io/badge/OpenCode-plugin-4f46e5)](https://opencode.ai/docs/plugins/)

![Example output: generated with qwen-image-2.0](docs/example.png)

## Highlights

- Adds a single `image_generate` tool to any OpenCode agent — no extra server, no MCP setup.
- Uses the native DashScope multimodal-generation endpoint (the OpenAI-compatible
  `/v1/images/generations` route is not served by DashScope).
- Saves the PNG to disk and returns the absolute path, so vision models
  (`qwen3-vl-plus`, `kimi-k3`, …) can inspect the result via normal image attachments.
- Works with any DashScope text-to-image model, including the Wan series (`wan2.7-image`).

## Supported models

| Model                      | Notes                              |
| -------------------------- | ---------------------------------- |
| `qwen-image-2.0` (default) | fast general-purpose text-to-image |
| `qwen-image-3.0`           | newer Qwen-Image generation        |
| `wan2.7-image`             | Wan (Tongyi Wanxiang) image models |

## Prerequisites

- [OpenCode](https://opencode.ai) installed.
- A DashScope API key from [Alibaba Cloud Model Studio](https://dashscope.console.aliyun.com/)
  (Bailian console). Key resolution order:
  1. `DASHSCOPE_IMAGEGEN_API_KEY` env
  2. `DASHSCOPE_API_KEY` env
  3. `apiKey` of any `dashscope*` provider in your `opencode.json`

## Installation

Add the npm package name to your `opencode.json` — OpenCode installs it on next launch:

```json
{
  "plugin": ["opencode-dashscope-imagegen"]
}
```

### Developing locally

To run from a checkout instead of npm, reference the plugin directory and install its
dependencies once (`@opencode-ai/plugin` must resolve from the plugin's own directory):

```json
{
  "plugin": ["file:///path/to/opencode-dashscope-imagegen"]
}
```

```bash
npm install
npm run build   # tsc → dist/ (js + d.ts)
```

## Usage

Just ask your agent: _"generate an image of a lighthouse at dusk"_ — it will call the tool:

| Arg           | Default          | Description                                               |
| ------------- | ---------------- | --------------------------------------------------------- |
| `prompt`      | required         | image description                                         |
| `model`       | `qwen-image-2.0` | any DashScope text-to-image model                         |
| `size`        | `1024*1024`      | `W*H` with a star, e.g. `1280*720`                        |
| `output_path` | auto             | absolute path; default `<config>/gen-images/gen-<ts>.png` |

Output directory override: `DASHSCOPE_IMAGEGEN_DIR` env.

## Troubleshooting

- **`InvalidApiKey` / 401** — no key found; check the resolution order above.
- **Tool not appearing** — restart OpenCode after editing `opencode.json`; plugins load at startup.
- **`size` rejected** — use `W*H` with `*` (star), not `x`: `1024*1024`.
- **Model not supported** — the key's account must have the model enabled in Model Studio.

## Related

- [OpenCode plugin docs](https://opencode.ai/docs/plugins/)
- [OpenCode ecosystem](https://opencode.ai/docs/ecosystem/)
- [awesome-opencode](https://github.com/awesome-opencode/awesome-opencode)

## License

[MIT](LICENSE)
