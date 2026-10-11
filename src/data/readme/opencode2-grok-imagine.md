# opencode2-grok-imagine

An [OpenCode](https://opencode.ai/v2/docs/) 1.18.29+ and 2 plugin for xAI Grok Imagine image
generation, text-to-video, and image-to-video through a CLIProxyAPI or
OpenAI-compatible endpoint. Available on [npm](https://www.npmjs.com/package/opencode2-grok-imagine).

This package is based on
[opencode-grok-imagine-plugin](https://github.com/caoool/opencode-grok-imagine-plugin).
It updates the original plugin to TypeScript, supports the OpenCode 1 and 2
plugin APIs, and keeps its image and video generation features.

This adaptation is maintained by [hlhr202](https://github.com/hlhr202).

## What it does

Grok Imagine uses image and video endpoints rather than the chat endpoint used
by OpenCode models. This plugin adds tools that call those endpoints and save
the results as local files:

| Tool | Use it for | Default model |
| --- | --- | --- |
| `grok_image` | Generating still images | `grok-imagine-image-quality` |
| `grok_video` | Text-to-video or image-to-video | `grok-imagine-video` |

Video generation runs asynchronously: the plugin submits the request, polls for
completion, and downloads the resulting MP4.

## Install

Add the plugin to `opencode.json` (OpenCode 2):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode2-grok-imagine"]
}
```

## Configure

The endpoint and API key are required when a tool is used. You can set them in
the OpenCode server process's environment:

```bash
export GROK_IMAGINE_BASE_URL="https://your-proxy.example.com"
export GROK_IMAGINE_API_KEY="your-api-key"
```

Alternatively, pass plugin options in `opencode.json` (or `opencode.jsonc`).
For **OpenCode 2**, use `plugins`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "opencode2-grok-imagine",
      "options": {
        "baseURL": "https://your-proxy.example.com",
        "apiKey": "your-api-key",
        "insecureTLS": false
      }
    }
  ]
}
```

For **OpenCode 1.18.29+**, use `plugin`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [["opencode2-grok-imagine", {
    "baseURL": "https://your-proxy.example.com",
    "apiKey": "your-api-key",
    "insecureTLS": false
  }]]
}
```

All supported plugin settings:

| Plugin option | Environment variable(s), in priority order | Default | Description |
| --- | --- | --- | --- |
| `baseURL` | `GROK_IMAGINE_BASE_URL`, then `CPA_BASE_URL` | Required | URL of the compatible API endpoint. A trailing `/v1` is optional; it is added if absent. |
| `apiKey` | `GROK_IMAGINE_API_KEY`, then `CPA_API_KEY` | Required | Bearer token for the endpoint. |
| `insecureTLS` | `GROK_IMAGINE_INSECURE_TLS` | `false` | Disable TLS certificate verification for self-signed proxies under Bun only. The plugin option accepts a boolean or a string; the environment variable accepts a string. |

For `baseURL` and `apiKey`, a non-empty plugin option takes priority, then the
`GROK_IMAGINE_*` variable, then the `CPA_*` variable. For `insecureTLS`, any
provided plugin option (including `false`) takes priority over the environment
variable. `true`, `1`, `yes`, and `on` (case-insensitive strings) enable it;
other values leave verification enabled. The URL and key are checked on first
tool use, so the plugin can load before they are set.

TLS verification is enabled by default. Use `insecureTLS: true` or
`GROK_IMAGINE_INSECURE_TLS=1` only for a self-signed proxy you control. Bun
supports this per-request setting; Node's `fetch` ignores it. Under Node,
disabling verification instead requires `NODE_TLS_REJECT_UNAUTHORIZED=0` on the
server process, which affects **all** its HTTPS requests and is not recommended.
The environment variables above must be visible to the running OpenCode
server, not just to a separate terminal session.

The options above configure the API connection. `model`, `count`, `output_dir`,
and other generation settings below are **tool arguments** supplied per call;
they are not supported as plugin options.

## Usage

Ask your agent for what you want to create:

| Request | Tool | Notes |
| --- | --- | --- |
| “Generate an image of a blue origami crane.” | `grok_image` | Creates a still image |
| “Create a short video of a spinning maple leaf.” | `grok_video` | Text-to-video |
| “Animate `assets/crane.png` so its wings move.” | `grok_video` | Passes the file as `image` for image-to-video |

### Image options

`grok_image` requires a `prompt` (the text description). Optional arguments:

| Argument | Accepted values and default |
| --- | --- |
| `model` | `grok-imagine-image-quality` (default) or `grok-imagine-image` |
| `count` | Integer from 1–4; default 1 |
| `output_dir` | Absolute path or path relative to the session directory; default `.grok-tmp/` |

### Video options

`grok_video` requires a `prompt` (the video description or motion to apply).
Optional arguments:

| Argument | Accepted values and default |
| --- | --- |
| `model` | `grok-imagine-video` (default) or `grok-imagine-video-1.5-preview` |
| `image` | Local path, HTTP(S) URL, or data URI to animate; omit for text-to-video |
| `duration` | Integer from 1–30 seconds; omitted unless specified, if supported upstream |
| `aspect_ratio` | String such as `16:9` or `9:16`; omitted unless specified |
| `resolution` | String such as `720p`; omitted unless specified |
| `output_dir` | Absolute path or path relative to the session directory; default `.grok-tmp/` |
| `timeout_seconds` | Integer from 30–1800 seconds; default 900 |

Some upstream implementations require an `image` when using
`grok-imagine-video-1.5-preview`. Model availability depends on your endpoint
and account.

### Saved files

Set `output_dir` (for example, `assets/img` or `public/videos`) to save files
with your project. Relative paths resolve from the current OpenCode session
directory.

Without `output_dir`, files go into a self-gitignored `.grok-tmp/` directory
under the session directory.

## Development

This project uses pnpm. Run `pnpm install`, `pnpm typecheck`, `pnpm test`, and
`pnpm build` to validate a local checkout. To load a local build, add the
package directory to `plugins` and rebuild after source changes.

## Acknowledgements

Based on [opencode-grok-imagine-plugin](https://github.com/caoool/opencode-grok-imagine-plugin)
by [Lu Cao (@caoool)](https://github.com/caoool). Thank you for the original
implementation and the Grok Imagine image and video workflows.

## License

MIT licensed. Original plugin © 2026 Lu Cao; OpenCode adaptation © 2026
hlhr202. See [LICENSE](LICENSE) for the copyright notices.
