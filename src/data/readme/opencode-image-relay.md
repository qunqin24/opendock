# opencode-image-relay

An [OpenCode](https://opencode.ai) plugin that lets **text-only models** (e.g. GLM-5.2) handle images you paste, by **relaying** each image to any image-capable MCP tool you already have installed.

No tool names are hard-coded, no external vision API is required — it just turns a pasted image into a file path the model can hand to whatever image MCP tool is available (e.g. `zai-mcp-server`, GLM-4V, Gemini, etc.).

## Why

When you paste an image into OpenCode with a model whose `modalities.input` does not include `image`, OpenCode drops it with an error like:

> Cannot read "x.png" (this model does not support image input). Inform the user.

…and the model dutifully tells you it can't see images. MCP image tools can analyze the image, but they need a **file path**, and a pasted image is inline base64 with no path.

This plugin bridges that gap.

## How it works

```
user pastes image
  → experimental.chat.messages.transform hook fires
     (only when the active model lacks native image input)
  → image bytes are saved to a temp file
  → the image part is REMOVED from the outgoing message, so opencode has no
     unsupported part to flag — its "does not support image input" error is
     never generated in the first place
  → a minimal hint is injected: "[image-relay] ... saved: <abs path>"
     (+ a one-line steer to use an image-analysis tool, not `read`)
  → the model analyzes the path with an available image MCP tool
```

- **Vision-capable models are left untouched** — the original image part reaches them natively. Activation is purely capability-based, no config needed.
- No system prompt is injected. The image part is stripped only from the outgoing request; the original inline image stays in the conversation record, so nothing is lost. The temp file is an ephemeral handle, regenerated from the persisted base64 whenever it's needed again.

## Install

### Option A — from npm (recommended)

Add to `opencode.json` (global: `~/.config/opencode/opencode.json`):

```jsonc
{
  "plugin": ["opencode-image-relay"]
}
```

OpenCode installs it automatically with Bun on startup.

### Option B — local (development)

OpenCode auto-loads `*.ts` from its plugin directory, so copy or symlink `src/index.ts` there:

```bash
mkdir -p ~/.config/opencode/plugins
ln -s "$PWD/src/index.ts" ~/.config/opencode/plugins/image-relay.ts
```

Then **restart OpenCode** (plugins load at startup).

## Configure

| Env var | Default | Meaning |
| --- | --- | --- |
| `IMAGE_RELAY_MAX_IMAGES` | `200` | LRU cap on saved temp images (oldest evicted past this). |

Temp images live in `os.tmpdir()/opencode-image-relay/image{N}/<hash>.<ext>` (purged on reboot, regenerated on demand).

## Requirements

- OpenCode (runs on Bun, so `.ts` plugins load natively — no build step).
- At least one image-capable MCP tool installed (e.g. `zai-mcp-server` with `analyze_image`).

## License

MIT
