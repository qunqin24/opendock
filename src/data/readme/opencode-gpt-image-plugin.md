# opencode-gpt-image-plugin

Generate still images from OpenCode or OpenWork with **GPT Image 2**, using an
OpenAI-compatible image endpoint such as CLIProxyAPI.

## What is included?

| Component | Purpose | Installed by adding the plugin to your config? |
| --- | --- | --- |
| `gpt_image` tool | Calls the image API, saves images, returns attachments | Yes |
| [`gpt-image` skill](skills/gpt-image/SKILL.md) | Turns image requests into supported tool arguments and handles output | No — copy the companion files below |
| [`/gpt-image` command](commands/gpt-image.md) | A shortcut that loads the skill and passes your description to it | No — copy the companion files below |

Keep a tool-capable conversational model selected. The image model is specified
inside the tool call; it does not need to be added to the chat model picker.
The plugin calls `POST /v1/images/generations` independently of the chat API.

Supported image models: **`gpt-image-2`** (default) and `gpt-image-1.5`.

## 1. Install the plugin

From your project:

```sh
npm install -D opencode-gpt-image-plugin
```

Merge the following entry into your existing `opencode.jsonc` or `opencode.json`.
Keep your existing providers, plugins, MCP servers, and other settings.

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    ["opencode-gpt-image-plugin", {
      "baseURL": "https://your-image-api.example.com/v1",
      "apiKey": "{env:GPT_IMAGE_API_KEY}"
    }]
  ]
}
```

Set `GPT_IMAGE_API_KEY` in the environment of the process that launches
OpenCode/OpenWork. For a desktop app, changing a terminal's environment does
not update an already-running app.

**The plugin does not inherit `provider.*` configuration or OpenCode's stored
provider credentials.** Configure its own `baseURL` and `apiKey` options, or the
environment variables described below.

## 2. Install the optional skill and command

Adding the npm plugin registers its tool, but OpenCode does not automatically
discover skills and commands inside the npm package. Copy them into your
OpenCode configuration directory.

Run these commands from the project where you ran `npm install` above. From a
clone of this repository, use `.` as the source instead of
`node_modules/opencode-gpt-image-plugin`.

The copy commands replace companion files with the same names. Review any
local edits before updating them.

### Windows PowerShell

```powershell
$source = Join-Path (Get-Location) "node_modules/opencode-gpt-image-plugin"
$configDir = Join-Path $HOME ".config/opencode"
New-Item -ItemType Directory -Force -Path (Join-Path $configDir "skills"), (Join-Path $configDir "commands") | Out-Null
Copy-Item -LiteralPath (Join-Path $source "skills/gpt-image") -Destination (Join-Path $configDir "skills") -Recurse -Force
Copy-Item -LiteralPath (Join-Path $source "commands/gpt-image.md") -Destination (Join-Path $configDir "commands/gpt-image.md") -Force
```

### macOS / Linux

```sh
pkg="node_modules/opencode-gpt-image-plugin"
config_dir="$HOME/.config/opencode"
mkdir -p "$config_dir/skills" "$config_dir/commands"
cp -R "$pkg/skills/gpt-image" "$config_dir/skills/"
cp "$pkg/commands/gpt-image.md" "$config_dir/commands/gpt-image.md"
```

If you use `XDG_CONFIG_HOME`, set the destination to its `opencode` directory.
For project-only companions, use the project's `.opencode` directory instead
of the global configuration directory.

The final layout is:

```text
opencode/
├── opencode.jsonc
├── skills/
│   └── gpt-image/
│       └── SKILL.md
└── commands/
    └── gpt-image.md
```

Completely restart OpenCode/OpenWork after configuration changes, then start a
new conversation.

## 3. Generate an image

With the companion command installed:

```text
/gpt-image Create a minimalist mountain logo on white, landscape, and save it to images.
```

Or in Chinese:

```text
/gpt-image 生成一张白色背景的极简山峰 Logo，横图，保存到 images
```

Without the command, ask your agent directly:

> Call gpt_image with model gpt-image-2 to create a minimalist mountain logo,
> 1024x1024, medium quality, PNG, and save it to images.

The **skill** defaults to one `gpt-image-2` image, `1024x1024`, `medium` quality,
PNG, and an `images` directory. Explicit user choices take priority; landscape
and portrait requests select the corresponding supported size. It can split a
larger requested count into calls of at most four images.

The **tool alone** defaults only the model and count; omitted rendering
parameters use upstream behavior. Omitting `output_dir` saves scratch images
under the project's self-gitignored `.gpt-tmp` directory.

Successful calls return the actual saved paths and image attachments. Preview
support depends on the client. Do not treat a text-only description or a failed
tool call as a generated image.

## Configuration reference

Plugin options take precedence over environment variables.

| Setting | Plugin option | Environment variables, in priority order | Default |
| --- | --- | --- | --- |
| API base URL | `baseURL` | `GPT_IMAGE_BASE_URL`, `CPA_BASE_URL` | Required |
| API key | `apiKey` | `GPT_IMAGE_API_KEY`, `CPA_API_KEY` | Required |
| Skip certificate verification | `insecureTLS` | `GPT_IMAGE_INSECURE_TLS` | `false` |

A trailing `/v1` is optional; the client normalizes it exactly once.

For environment-only configuration:

```sh
export GPT_IMAGE_BASE_URL="https://your-image-api.example.com/v1"
export GPT_IMAGE_API_KEY="your-key"
```

Or in PowerShell, before launching the app from that environment:

```powershell
$env:GPT_IMAGE_BASE_URL = "https://your-image-api.example.com/v1"
$env:GPT_IMAGE_API_KEY = "your-key"
```

Then the plugin entry can be simply:

```json
{
  "plugin": ["opencode-gpt-image-plugin"]
}
```

### TLS

Certificate verification is enabled by default. `insecureTLS: true` is intended
only for a self-signed proxy you control. The plugin uses Bun's per-request TLS
option inside OpenCode; that option is ignored by Node's `fetch`.

## Tool arguments

| Argument | Accepted values |
| --- | --- |
| `prompt` | Required image description |
| `model` | `gpt-image-2` or `gpt-image-1.5`; use the bare ID, not `provider/gpt-image-2` |
| `count` | Integer from 1 to 4; default 1 |
| `size` | `auto`, `1024x1024`, `1536x1024`, `1024x1536` |
| `quality` | `auto`, `low`, `medium`, `high` |
| `background` | `auto`, `transparent`, `opaque` |
| `output_format` | `png`, `jpeg`, `webp` |
| `output_dir` | Absolute path or path relative to the project root |

Use `count` in a tool call; the plugin maps it to the API's `n` field. Describe
background colors in `prompt`. Transparency requires PNG or WebP, not JPEG.
Some proxies may approximate requested dimensions or ignore optional rendering
parameters; check the returned image.

This version supports **text-to-image only**. It has no reference-image, image
editing, or video input arguments. Do not pass invented `image` or
`reference_images` fields.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| `gpt_image` is missing | Check the plugin entry, restart the backend, and start a new conversation. It is a callable tool, not a slash command or a separate UI panel supplied by this plugin. |
| `/gpt-image` or the skill is missing | Copy both companion paths into the appropriate global or project directory; npm installation alone does not do this. |
| `GPT Image: no base URL` / `no API key` | Supply plugin options or its supported environment variables. Chat-provider credentials are not inherited. |
| 401 / 403 | Check the image endpoint's credential, permissions, and available quota. |
| Model or parameter error | Use a supported bare model ID and confirm that your upstream offers that model and parameter. |
| Timeout or missing preview | Inspect the tool result and its actual saved paths. A timeout does not establish whether a paid request completed; do not blindly submit it again. |
| Fewer images than requested | Report the actual returned count; if continuing, request only the remaining images rather than repeating the whole batch. |

Upstream model availability, moderation, latency, and billing are controlled by
your image API provider. This repository's tests do not make paid image calls.

## Development and publishing

```sh
npm ci
npm test
npm pack --dry-run
```

The package includes `src/`, `skills/`, `commands/`, this README, and the license.
The skill example is checked against the real tool argument schema by the test
suite.

To release, update the version in both `package.json` and `package-lock.json`,
commit the changes, and push a matching `v<version>` tag. The existing
`publish` GitHub Actions workflow installs dependencies, verifies the tag,
runs tests, and publishes to npm with Trusted Publishing. A push to main or a pull request
runs CI; the version tag triggers publishing. The npm package must be configured
to trust this repository and its publish.yml workflow before the first tagged release.

## License

MIT © Lu Cao
