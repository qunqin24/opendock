# opencode-grok-imagine-plugin

An [opencode](https://opencode.ai) plugin that adds **image and video generation**
with xAI's **Grok Imagine** models through any OpenAI-compatible / CLIProxyAPI
endpoint.

It registers two tools your agents can call:

| Tool | Purpose | Models |
| --- | --- | --- |
| `grok_image` | Still images | `grok-imagine-image-quality` (default), `grok-imagine-image` |
| `grok_video` | Short videos (text-to-video **and** image-to-video) | `grok-imagine-video` (default), `grok-imagine-video-1.5-preview` |

The agent routes automatically: **image vs. video** by which tool it calls, and
the **specific model** via the `model` argument, guided by per-model hints baked
into the tool schema (quality vs. speed for images; stable vs. preview for video).
`grok_video` also does **image-to-video** when you pass an `image` to animate.

## Why a plugin (and not model config)

opencode's model config only drives the chat/completions interface. Grok Imagine
uses different endpoints (`/v1/images/generations`, `/v1/videos/generations`) plus
async polling and file downloads for video. A plugin tool is the supported way to
reach them and save results to disk.

## Install

```bash
npm install -D opencode-grok-imagine-plugin
```

Then reference it in `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-grok-imagine-plugin"]
}
```

Restart opencode (plugins load at startup).

## Configure

Configuration is read from **plugin options first, then environment variables.**

### Option A — environment variables

```bash
export GROK_IMAGINE_BASE_URL="https://your-proxy.example.com"   # or CPA_BASE_URL
export GROK_IMAGINE_API_KEY="sk-..."                            # or CPA_API_KEY
# Only for self-signed LAN proxies (see TLS below):
# export GROK_IMAGINE_INSECURE_TLS=1
```

`opencode.json`:

```json
{
  "plugin": ["opencode-grok-imagine-plugin"]
}
```

### Option B — plugin options (tuple form)

```json
{
  "plugin": [
    ["opencode-grok-imagine-plugin", {
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
| Base URL | `baseURL` | `GROK_IMAGINE_BASE_URL`, `CPA_BASE_URL` | — (required) |
| API key | `apiKey` | `GROK_IMAGINE_API_KEY`, `CPA_API_KEY` | — (required) |
| Skip TLS verify | `insecureTLS` | `GROK_IMAGINE_INSECURE_TLS` | `false` |

The base URL may include or omit a trailing `/v1`; the plugin normalizes it.

### TLS

TLS certificates are **verified by default**. Only disable verification for a
self-signed LAN proxy you control, via `insecureTLS: true` or
`GROK_IMAGINE_INSECURE_TLS=1`. Under opencode's Bun runtime this is honored
per-request; under Node it maps to standard `NODE_TLS_REJECT_UNAUTHORIZED`
behavior.

## Usage

Just ask an agent:

- *"generate an image of a blue origami crane on white"* → `grok_image`
- *"make a 6-second 9:16 video of a spinning maple leaf"* → `grok_video` (text-to-video)
- *"animate assets/img/crane.png so it flaps its wings"* → `grok_video` with `image` (image-to-video)

### Where files are saved

- **Project assets** — pass `output_dir` (e.g. `assets/img`, `public/videos`).
  Saved into your project, ready to commit.
- **Scratch / experiments** — omit `output_dir`. Files go to a self-ignored
  `<project>/.grok-tmp/` folder (a `*` `.gitignore` keeps them out of git).

### `grok_image` arguments

| Arg | Type | Notes |
| --- | --- | --- |
| `prompt` | string | required |
| `model` | enum | `grok-imagine-image-quality` \| `grok-imagine-image` |
| `count` | 1–4 | number of images |
| `output_dir` | string | asset path, or omit for scratch |

### `grok_video` arguments

| Arg | Type | Notes |
| --- | --- | --- |
| `prompt` | string | required; describes the video or the motion to apply to `image` |
| `model` | enum | `grok-imagine-video` \| `grok-imagine-video-1.5-preview` |
| `image` | string | optional source image to animate (**image-to-video**): local path, http(s) URL, or data URI |
| `duration` | 1–30 | seconds, if supported |
| `aspect_ratio` | string | e.g. `16:9`, `9:16` |
| `resolution` | string | e.g. `720p` |
| `output_dir` | string | asset path, or omit for scratch |
| `timeout_seconds` | 30–1800 | poll timeout (default 900) |

Video is asynchronous: the tool submits the job, polls progress, then downloads
the finished mp4.

**Text-to-video vs. image-to-video:** omit `image` for text-to-video. Pass
`image` (a file path, URL, or data URI) to animate an existing picture; local
paths are read and inlined automatically. Some models — notably
`grok-imagine-video-1.5-preview` on certain proxies — require an `image` and
reject text-only prompts.

## Responses & endpoints

- Image: `POST /v1/images/generations` → `{ data: [{ b64_json | url }] }`
- Video submit: `POST /v1/videos/generations` → `{ request_id }`
  (image-to-video adds `"image": { "url": "<url or data URI>" }`)
- Video poll: `GET /v1/videos/{request_id}` → `{ status: "done", video: { url } }`

## Notes

- Availability of each model (and whether image vs. video is enabled) depends on
  your upstream account/proxy build. The plugin surfaces the upstream error text
  when a model isn't available.
- Content policy is enforced upstream by xAI, independent of this plugin.

## License

MIT © Lu Cao
