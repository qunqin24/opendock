# opencode-auto-vision

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![OpenCode Plugin](https://img.shields.io/badge/OpenCode-Plugin-green.svg)](https://opencode.ai)
[![npm version](https://img.shields.io/npm/v/opencode-auto-vision.svg)](https://www.npmjs.com/package/opencode-auto-vision)
[![GitHub repo](https://img.shields.io/badge/repo-arttttt%2Fopencode--auto--vision-181717?logo=github)](https://github.com/arttttt/opencode-auto-vision)

An [OpenCode](https://opencode.ai) plugin that gives **text-only models** the ability to handle pasted images and videos — by **auto-detecting** whether the current model supports a media kind and, if not, routing the media to a vision **MCP tool**.

Unlike pattern-based vision plugins, you don't enumerate which models to intercept: `opencode-auto-vision` reads each model's declared capabilities (`attachment` + `modalities.input`) and only steps in when the model genuinely can't handle the pasted media. Vision-capable models are skipped automatically.

## How it works

```
user pastes image/video + asks a question
  ↓
experimental.chat.messages.transform hook  (runs right before the LLM call)
  ├─ find last user message, collect media FileParts (image/* and video/*)
  ├─ for each media kind, ask: does (provider/model) support it natively?
  │     • resolved from the opencode provider catalog (cached once)
  │     • unknown model → assume yes (never interferes blindly)
  ├─ if the model supports every present kind → skip (native vision)
  ├─ else, for each unsupported media part:
  │     • file://  → use the local path directly
  │     • data:    → base64-decode → save to a stable tmp path (sha256(partId))
  │     • http(s): → pass the URL straight to the MCP tool
  │     • strip the raw media part (kills the "model does not support image input" error)
  └─ inject a text instruction pointing the model at the saved path + tool
  ↓
model sees the path hint → calls the configured MCP tool (analyze_image / analyze_video)
```

## Features

- **Capability-based auto-detect** — no per-model config; vision models are left alone.
- **Images _and_ video** — png/jpeg/webp/gif/bmp + mp4/mov/webm/mkv.
- **Any MCP vision tool** — configurable `imageTool` / `videoTool` (defaults to `analyze_image` / `analyze_video` from `@z_ai/mcp-server`).
- **Stable temp paths** — `sha256(partId).ext`, so re-transforms after tool calls reuse the same file.
- **Age-based cleanup** of temp files on load.
- **Toast notifications** on partial/total failures.
- **Escape hatch** — `forceModels` patterns to override capabilities if ever needed.

## Install

Add to your `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-auto-vision"]
}
```

And make sure a vision MCP tool is configured, e.g. the Z.AI vision server:

```json
{
  "mcp": {
    "zai-mcp-server": {
      "type": "local",
      "command": ["npx", "-y", "@z_ai/mcp-server@latest"],
      "environment": { "Z_AI_API_KEY": "your-key", "Z_AI_MODE": "ZAI" }
    }
  }
}
```

## Configuration

Optional. Drop a file at `~/.config/opencode/opencode-auto-vision.jsonc` (user) or `.opencode/opencode-auto-vision.jsonc` (project). See [`opencode-auto-vision.example.jsonc`](./opencode-auto-vision.example.jsonc).

```jsonc
{
  "imageTool": "analyze_image",
  "videoTool": "analyze_video",
  "cleanupAfterHours": 24
}
```

| Option               | Default                    | Description                                                       |
| -------------------- | -------------------------- | ----------------------------------------------------------------- |
| `imageTool`          | `analyze_image`            | MCP tool the model calls for images.                              |
| `videoTool`          | `analyze_video`            | MCP tool the model calls for videos.                              |
| `cleanupAfterHours`  | `24`                       | Temp files older than this are removed on plugin load.            |
| `promptTemplate`     | built-in                   | Custom prompt. Variables: `{mediaList} {mediaCount} {kind} {toolName} {userText}`. |
| `forceModels`        | `[]`                       | Patterns (`provider/*`, `*model`, `*`) that force interception.  |

Media is always saved under the system temp dir (`$TMPDIR/opencode-auto-vision`); this is not configurable.

## Usage

1. Select a text-only model in OpenCode (e.g. `zai-coding-plan/glm-5.2`).
2. Paste an image or video (`Cmd+V` / `Ctrl+V`).
3. Ask your question — the plugin routes the media to your vision MCP tool automatically.

Switch to a vision model (e.g. `glm-5v-turbo`) and the plugin silently steps aside.

## License

MIT © Artem Bambalov
