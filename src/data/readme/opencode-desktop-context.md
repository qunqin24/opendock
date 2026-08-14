# opencode-desktop-context

OpenCode plugin that captures desktop screenshots and adds them to the active session context.

> I thought about Macrohard and whatever the Microsoft version was called and thought that was pretty cool — why not just make my own in OpenCode?

> **Beta warning:** This plugin is early-stage software and may be unstable. Back up your OpenCode configuration before installing it, and consider having another coding assistant or terminal open so you can quickly identify and fix any issues. Pull requests and bug reports are welcome.
>
> **Privacy warning:** Desktop screenshots can contain personal, sensitive, or confidential information. Anything captured may be sent to the model provider you have configured. Use this plugin at your own risk. Whenever possible, use a local model (for example, an Ollama model) so screenshots never leave your machine.

## Installation

Install the plugin from npm and add it to your `opencode.json`:

```bash
npm install opencode-desktop-context
```

```json
{
  "plugin": [
    ["opencode-desktop-context", {
      "captureTarget": "fullScreen",
      "maxAgeMs": 30000,
      "autoAttach": true,
      "systemHint": false,
      "visualIndicator": true,
      "retention": "temp",
      "retentionTtlMs": 600000,
      "blocklist": ["1Password", "Bitwarden", "Chase", "Keychain Access"],
      "allowlist": [],
      "quality": 80
    }]
  ]
}
```

## Features

- **Auto-attach:** Adds the latest desktop screenshot to every user message.
- **On-demand tool:** Exposes `capture_desktop` for the model to request a fresh screenshot.
- **Privacy controls:** Permission persistence, blocklist/allowlist, configurable retention, and optional capture indicator.
- **Cross-platform:** Native capture adapters for macOS, Windows, and Linux.

## Configuration

| Option | Type | Default | Description |
|---|---|---|---|
| `captureTarget` | `"fullScreen" \| "activeWindow" \| "allDisplays"` | `"fullScreen"` | What to capture. |
| `maxAgeMs` | `number` | `30000` | Reuse a cached screenshot if newer than this. |
| `autoAttach` | `boolean` | `true` | Attach latest screenshot to every user message. |
| `systemHint` | `boolean` | `false` | Inject a hint telling the model about `capture_desktop`. |
| `visualIndicator` | `boolean` | `true` | Show a brief indicator when a screenshot is taken. |
| `retention` | `"memory" \| "temp" \| "persistent"` | `"temp"` | Where screenshots live. |
| `retentionTtlMs` | `number` | `600000` | For `temp`, delete files older than this. |
| `persistentDir` | `string \| null` | `null` | Required when `retention` is `"persistent"`. Must be an absolute path within your home directory with no `..` segments. |
| `captureCooldownMs` | `number` | `1000` | Minimum milliseconds between `capture_desktop` tool invocations. |
| `blocklist` | `string[]` | `["1Password", "Bitwarden", ...]` | Window/app titles or names to never capture. |
| `allowlist` | `string[]` | `[]` | If non-empty, only capture when active window matches. |
| `quality` | `number` | `80` | JPEG quality for attachments (PNG if `100`). |
| `visionModel` | `string \| null` | `null` | Local Ollama vision model to describe screenshots (e.g. `moondream:latest`). When set, autoAttach sends a text summary instead of the raw image. |
| `ollamaBaseUrl` | `string` | `http://127.0.0.1:11434` | Base URL of your local Ollama server. Must be a loopback/localhost URL unless `allowRemoteVision` is `true`. |
| `allowRemoteVision` | `boolean` | `false` | Allow `ollamaBaseUrl` to point to a non-loopback endpoint. Use with caution. |
| `periodicCaptureMs` | `number` | `300000` | Automatically refresh the cached screenshot every N ms. Set to `0` to disable. |

### Storage locations

- `memory`: the latest screenshot is kept in memory only.
- `temp`: screenshots are saved to `~/Pictures/opencode-desktop-context/` and cleaned up automatically based on `retentionTtlMs`.
- `persistent`: screenshots are saved to the directory you set via `persistentDir`.

## Enabling auto-attach

`autoAttach` is `true` by default. When enabled, every user message you send is sent with the latest desktop screenshot attached. Change `autoAttach` to `false` if you only want the model to request a screenshot via the `capture_desktop` tool.

## Privacy

## Platform Requirements

- **macOS:** `screencapture` (built-in)
- **Windows:** PowerShell with .NET (built-in)
- **Linux:** One of `grim` (Wayland), `import` from ImageMagick, or `ffmpeg` (X11)

## Vision-less Models

Some OpenCode models cannot process image attachments. If your model does not support vision, attach a local vision model to read screenshots for you.

### Recommended: Moondream via Ollama

[Moondream](https://moondream.ai) is a small, fast vision model that runs locally through Ollama. It is ideal for describing screens and reading text in screenshots.

**Setup**

1. Install [Ollama](https://ollama.com) if you do not already have it.
2. Pull the Moondream model:

   ```bash
   ollama pull moondream:latest
   ```

3. Send a captured screenshot to the model with the Ollama REST API:

   ```bash
   python3 - <<'PY'
   import base64, json, urllib.request

   image_path = "/tmp/opencode-desktop-context/capture-latest.jpeg"
   image_b64 = base64.b64encode(open(image_path, "rb").read()).decode()

   payload = {
       "model": "moondream:latest",
       "prompt": "Describe this screenshot and transcribe any readable text.",
       "images": [image_b64],
       "stream": False,
   }

   req = urllib.request.Request(
       "http://localhost:11434/api/generate",
       data=json.dumps(payload).encode(),
       headers={"Content-Type": "application/json"},
   )

   resp = urllib.request.urlopen(req)
   obj = json.loads(resp.read())
   print(obj["response"])
   PY
   ```

**Tips**

- Use the REST API (`/api/generate`) rather than `ollama run < image.jpg`; the CLI can interleave terminal control sequences that corrupt the output.
- For text-heavy screens, OCR with [Tesseract](https://github.com/tesseract-ocr/tesseract) is usually more accurate than a vision model.
- Moondream is the recommended default because it is small (~1.6B parameters) and fast. If you need richer descriptions, `llava:latest` or `llava:13b` are stronger but heavier alternatives.

## Privacy

The first time `capture_desktop` is called, the plugin records a permission grant in `~/.config/opencode/desktop-context-permission.json`. You can revoke permission by deleting that file. The blocklist is checked against the active window title and application name before every capture.

## Local vision mode

To keep screenshots private and avoid sending raw images to cloud models, enable the local Ollama vision mode:

```json
{
  "plugin": [
    ["opencode-desktop-context", {
      "visionModel": "moondream:latest",
      "ollamaBaseUrl": "http://127.0.0.1:11434",
      "autoAttach": true,
      "periodicCaptureMs": 300000
    }]
  ]
}
```

When `visionModel` is set:

- `autoAttach` sends a text description of the desktop instead of the image file.
- The plugin exposes a `describe_desktop` tool the assistant can call explicitly.
- Screenshots are still captured periodically to keep context fresh.

Install a vision model in Ollama first:

```bash
ollama pull moondream:latest
```

## Development

```bash
bun install
bun test
bun run build
```

## License

MIT — see [LICENSE](./LICENSE).

## Disclaimer

This project is an independent community plugin. It is **not affiliated with, endorsed by, or maintained by OpenCode or its makers**. All product names, trademarks, and registered trademarks mentioned in this documentation are the property of their respective owners.
